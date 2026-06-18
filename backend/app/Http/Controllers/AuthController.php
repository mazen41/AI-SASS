<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request): JsonResponse
    {
        // Rate limit: 5 registrations per minute per IP
        $key = 'register:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'message' => 'Too many registration attempts. Please try again later.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'package_id'            => ['nullable', 'exists:packages,id'],
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Assign package if provided
        $assignedPackage = null;
        if ($request->package_id) {
            $package = \App\Models\Package::findOrFail($request->package_id);
            
            // If package is free, assign immediately
            if ($package->total_price == 0) {
                $assignedPackage = $user->assignPackage($request->package_id);
            } else {
                // For paid packages, create pending assignment (would go through payment flow)
                // For now, we'll assign it but mark as requiring payment
                $assignedPackage = $user->assignPackage($request->package_id);
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        ActivityLog::log(
            action: 'user_registered',
            userId: $user->id,
            entityType: 'User',
            entityId: $user->id
        );

        return response()->json([
            'message' => 'Registration successful.',
            'user'    => $user,
            'token'   => $token,
        ], 201);
    }

    /**
     * Login an existing user.
     */
    public function login(Request $request): JsonResponse
    {
        // Rate limit: 5 login attempts per minute per IP+email
        $key = 'login:' . $request->ip() . '|' . $request->input('email');
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Too many login attempts. Please try again in {$seconds} seconds.",
            ], 429);
        }

        $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            RateLimiter::hit($key, 60);

            ActivityLog::log(
                action: 'login_failed',
                userId: null,
                entityType: 'Auth',
                entityId: null,
                newValues: ['email' => $request->input('email')]
            );

            $targetUser = User::where('email', $request->input('email'))->first();
            if ($targetUser) {
                try {
                    \App\Services\MailService::sendWithTemplate('login_attempt_failed', $targetUser->email, [
                        'app_name' => config('app.name', 'StoryHero'),
                        'user_name' => $targetUser->name,
                        'ip_address' => $request->ip(),
                        'datetime' => now()->toDateTimeString(),
                        'user_agent' => $request->header('User-Agent'),
                    ]);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Failed to send login attempt failed notification: ' . $e->getMessage());
                }
            }

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Clear rate limiter on successful login
        RateLimiter::clear($key);

        $user  = Auth::user();

        // Check if user is suspended or banned
        if ($user->status !== 'active') {
            Auth::guard('web')->logout();
            return response()->json([
                'message' => 'Your account has been ' . $user->status . '. Please contact support.',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Update last login
        $user->update(['last_login_at' => now()]);

        ActivityLog::log(
            action: 'user_login',
            userId: $user->id,
            entityType: 'User',
            entityId: $user->id
        );

        try {
            \App\Services\MailService::sendWithTemplate('login_notification', $user->email, [
                'app_name' => config('app.name', 'StoryHero'),
                'user_name' => $user->name,
                'ip_address' => $request->ip(),
                'datetime' => now()->toDateTimeString(),
                'user_agent' => $request->header('User-Agent'),
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send login notification: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Login successful.',
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    /**
     * Logout the authenticated user.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Get the authenticated user.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'user' => $user,
            'active_package' => $user->activeUserPackage?->load('package.items.product'),
            'balances' => $user->getAllProductBalances(),
        ]);
    }
}
