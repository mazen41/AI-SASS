<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AuthSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
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

        $driver = Socialite::driver($provider)->stateless();

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
            // Update social fields
            $user->update([
                'social_provider'      => $provider,
                'social_id'            => $socialUser->getId(),
                'social_token'         => $socialUser->token,
                'social_refresh_token' => $socialUser->refreshToken ?? null,
            ]);
        } else {
            // Create new user
            $user = User::create([
                'name'                 => $socialUser->getName() ?? $socialUser->getNickname() ?? explode('@', $email)[0],
                'email'                => $email,
                'password'             => Hash::make(uniqid()),
                'role'                 => 'user',
                'status'               => 'active',
                'avatar'               => $socialUser->getAvatar(),
                'email_verified_at'    => now(),
                'social_provider'      => $provider,
                'social_id'            => $socialUser->getId(),
                'social_token'         => $socialUser->token,
                'social_refresh_token' => $socialUser->refreshToken ?? null,
            ]);
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
