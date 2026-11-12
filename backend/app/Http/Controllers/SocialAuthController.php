<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\User;
use App\Models\AuthSetting;
use App\Models\LegalAcceptance;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Get the social auth URL for a provider.
     */
    public function redirect(Request $request, string $provider): JsonResponse
    {
        $allowed = ['google', 'facebook', 'apple'];
        if (!in_array($provider, $allowed)) {
            return response()->json(['error' => 'Invalid provider'], 400);
        }

        // Rate limit: 10 attempts per minute per IP
        $key = 'social_auth_redirect:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['error' => 'Too many authentication attempts. Please wait.'], 429);
        }
        RateLimiter::hit($key, 60);

        // ── Package enforcement for social signup ────────────────────────────
        // Social login used to create a `users` row with NO package at all —
        // a straightforward bypass of task 4's "must choose a package" rule.
        // The frontend must pass ?package_id=X (the package the visitor picked
        // on the pricing/signup page) BEFORE redirecting here. We stash it in
        // cache keyed by a random `state` token, since Socialite's stateless()
        // mode doesn't persist a session across the OAuth round trip. If the
        // person already has an account, this is just a login and package_id
        // is ignored in callback() — see there.
        $request->validate(['package_id' => ['nullable', 'integer', 'exists:packages,id']]);
        if ($request->filled('package_id') && (!$request->boolean('terms_accepted') || !$request->boolean('privacy_accepted'))) {
            return response()->json([
                'message' => 'Please accept the Terms and Privacy Policy before creating an account.',
                'code' => 'legal_acceptance_required',
            ], 422);
        }

        $state = Str::random(40);
        Cache::put("social_auth_state:{$state}", true, now()->addMinutes(15));
        if ($request->filled('package_id')) {
            Cache::put("social_auth_package:{$state}", [
                'package_id' => (int) $request->package_id,
                'terms_version' => '2026-11-12',
                'privacy_version' => '2026-11-12',
                'accepted_at' => now()->toISOString(),
            ], now()->addMinutes(15));
        }

        $driver = Socialite::driver($provider)->stateless()->with(['state' => $state]);

        // Apply dynamic callback URL from admin settings if configured
        $callbackUrl = $this->getCallbackUrl($provider);
        if ($callbackUrl) {
            $driver->redirectUrl($callbackUrl);
        }

        $url = $driver->redirect()->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * Handle the callback from a social provider.
     */
    public function callback(Request $request, string $provider)
    {
        $allowed = ['google', 'facebook', 'apple'];
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');

        if (!in_array($provider, $allowed)) {
            return redirect()->to("{$frontendUrl}/auth/callback?error=" . urlencode('Invalid authentication provider.'));
        }

        // Rate limit: 10 attempts per minute per IP
        $key = 'social_auth_callback:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return redirect()->to("{$frontendUrl}/auth/callback?error=" . urlencode('Too many authentication attempts. Please try again later.'));
        }
        RateLimiter::hit($key, 60);

        // Socialite is stateless because the OAuth round-trip may cross hosts,
        // so verify our own one-time state for every login and signup callback.
        $state = $request->query('state');
        if (!is_string($state) || !preg_match('/^[A-Za-z0-9]{40}$/', $state)
            || Cache::pull("social_auth_state:{$state}") !== true) {
            return redirect()->to("{$frontendUrl}/auth/callback?error=" . urlencode('The sign-in request expired or could not be verified. Please try again.'));
        }

        try {
            $driver = Socialite::driver($provider)->stateless();

            // Apply dynamic callback URL from admin settings if configured
            $callbackUrl = $this->getCallbackUrl($provider);
            if ($callbackUrl) {
                $driver->redirectUrl($callbackUrl);
            }

            $socialUser = $driver->user();
        } catch (\Exception $e) {
            return redirect()->to("{$frontendUrl}/auth/callback?error=" . urlencode('Authentication failed. Please try again.'));
        }

        $email = $socialUser->getEmail();
        if (!$email) {
            return redirect()->to("{$frontendUrl}/auth/callback?error=" . urlencode('The provider did not return an email address. Please try another sign-in method.'));
        }

        // Check if user already exists
        $user = User::where('email', $email)->first();

        if ($user) {
            // Existing account — this is a login, package_id (if any) is irrelevant.
            $user->update([
                'social_provider'      => $provider,
                'social_id'            => $socialUser->getId(),
            ]);
        } else {
            // ── New account via social login: package required, same as email flow ──
            $registrationContext = $state ? Cache::pull("social_auth_package:{$state}") : null;
            $packageId = is_array($registrationContext) ? ($registrationContext['package_id'] ?? null) : $registrationContext;
            $package = $packageId ? Package::where('id', $packageId)->where('is_active', true)->first() : null;

            if (!$package || !is_array($registrationContext) || empty($registrationContext['terms_version']) || empty($registrationContext['privacy_version'])) {
                return redirect()->to("{$frontendUrl}/register?error="
                    . urlencode('Please choose a package and accept the Terms and Privacy Policy before signing up.'));
            }

            // Paid packages need a payment step, which this social-login redirect
            // flow doesn't carry. Rather than silently granting free access,
            // send them to the normal email+OTP+payment registration flow,
            // pre-filled with their social email/name on the frontend.
            if ((float) $package->total_price > 0.0) {
                $params = http_build_query(['email' => $email, 'name' => $socialUser->getName() ?? '', 'package_id' => $package->id]);
                return redirect()->to("{$frontendUrl}/register?{$params}"
                    . '&notice=' . urlencode('This package requires payment — please complete registration below.'));
            }

            $user = User::create([
                'name'                 => $socialUser->getName() ?? $socialUser->getNickname() ?? explode('@', $email)[0],
                'email'                => $email,
                'password'             => Hash::make(Str::random(32)),
                'role'                 => 'user',
                'status'               => 'active',
                'avatar'               => $socialUser->getAvatar(),
                'email_verified_at'    => now(),
                'social_provider'      => $provider,
                'social_id'            => $socialUser->getId(),
            ]);

            $user->assignPackage($package->id);
            LegalAcceptance::create([
                'user_id' => $user->id,
                'terms_version' => $registrationContext['terms_version'],
                'privacy_version' => $registrationContext['privacy_version'],
                'accepted_at' => $registrationContext['accepted_at'] ?? now(),
                'source' => 'social_registration',
            ]);
        }

        // Keep bearer tokens out of URLs, browser history, and referrer headers.
        // The short-lived random code is exchanged once by the frontend.
        $code = Str::random(64);
        Cache::put("social_auth_code:{$code}", ['user_id' => $user->id], now()->addMinute());

        return redirect()->to("{$frontendUrl}/auth/callback?code=" . urlencode($code));
    }

    /** Exchange a one-time social sign-in code for an API token. */
    public function exchange(Request $request): JsonResponse
    {
        $key = 'social_auth_exchange:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['message' => 'Too many authentication attempts. Please try again later.'], 429);
        }
        RateLimiter::hit($key, 60);

        $validated = $request->validate(['code' => ['required', 'string', 'size:64', 'regex:/^[A-Za-z0-9]+$/']]);
        $payload = Cache::pull('social_auth_code:' . $validated['code']);
        if (!is_array($payload) || empty($payload['user_id'])) {
            return response()->json(['message' => 'This sign-in link is invalid or expired. Please try again.'], 401);
        }

        $user = User::whereKey($payload['user_id'])->where('status', 'active')->first();
        if (!$user) {
            return response()->json(['message' => 'This account is unavailable. Please contact support.'], 403);
        }

        RateLimiter::clear($key);
        $user->update(['last_login_at' => now()]);
        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ]);
    }

    /**
     * Get the configured callback URL for a provider from admin settings.
     */
    private function getCallbackUrl(string $provider): ?string
    {
        $settings = AuthSetting::first();
        if (!$settings) {
            return null;
        }

        $field = "{$provider}_callback_url";
        return !empty($settings->$field) ? $settings->$field : null;
    }
}
