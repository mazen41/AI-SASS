<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\User;
use App\Models\AuthSetting;
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

        $state = Str::random(40);
        if ($request->filled('package_id')) {
            Cache::put("social_auth_package:{$state}", (int) $request->package_id, now()->addMinutes(15));
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
            return redirect()->to("{$frontendUrl}/login?error=" . urlencode('Invalid authentication provider.'));
        }

        // Rate limit: 10 attempts per minute per IP
        $key = 'social_auth_callback:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return redirect()->to("{$frontendUrl}/login?error=" . urlencode('Too many authentication attempts. Please try again later.'));
        }
        RateLimiter::hit($key, 60);

        try {
            $driver = Socialite::driver($provider)->stateless();

            // Apply dynamic callback URL from admin settings if configured
            $callbackUrl = $this->getCallbackUrl($provider);
            if ($callbackUrl) {
                $driver->redirectUrl($callbackUrl);
            }

            $socialUser = $driver->user();
        } catch (\Exception $e) {
            return redirect()->to("{$frontendUrl}/login?error=" . urlencode('Authentication failed: ' . $e->getMessage()));
        }

        $email = $socialUser->getEmail();
        if (!$email) {
            return redirect()->to("{$frontendUrl}/login?error=" . urlencode('Email not provided by ' . ucfirst($provider)));
        }

        // Check if user already exists
        $user = User::where('email', $email)->first();

        if ($user) {
            // Existing account — this is a login, package_id (if any) is irrelevant.
            $user->update([
                'social_provider'      => $provider,
                'social_id'            => $socialUser->getId(),
                'social_token'         => $socialUser->token,
                'social_refresh_token' => $socialUser->refreshToken ?? null,
            ]);
        } else {
            // ── New account via social login: package required, same as email flow ──
            $state     = $request->query('state');
            $packageId = $state ? Cache::pull("social_auth_package:{$state}") : null;
            $package   = $packageId ? Package::where('id', $packageId)->where('is_active', true)->first() : null;

            if (!$package) {
                return redirect()->to("{$frontendUrl}/signup?error="
                    . urlencode('Please choose a package before signing up.'));
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
                'social_token'         => $socialUser->token,
                'social_refresh_token' => $socialUser->refreshToken ?? null,
            ]);

            $user->assignPackage($package->id);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $params = http_build_query([
            'token' => $token,
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ]);

        return redirect()->to("{$frontendUrl}/auth/callback?{$params}");
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
