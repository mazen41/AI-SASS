<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthSetting;
use Illuminate\Http\Request;

class AuthSettingsController extends Controller
{
    /**
     * Get auth settings (publicly accessible for the login page).
     */
    public function index()
    {
        $settings = \Illuminate\Support\Facades\Cache::rememberForever('auth_settings', function () {
            return AuthSetting::firstOrCreate([], [
                'allow_admin_social_auth' => true,
                'allow_admin_signup' => true,
                'google_active' => false,
                'facebook_active' => false,
                'apple_active' => false,
            ]);
        });

        return response()->json([
            'settings' => [
                'allow_admin_social_auth' => $settings->allow_admin_social_auth,
                'allow_admin_signup' => $settings->allow_admin_signup,
                'google_active' => $settings->google_active,
                'google_callback_url' => $settings->google_callback_url,
                'facebook_active' => $settings->facebook_active,
                'facebook_callback_url' => $settings->facebook_callback_url,
                'apple_active' => $settings->apple_active,
                'apple_callback_url' => $settings->apple_callback_url,
            ],
        ]);
    }

    /**
     * Update auth settings (admin only).
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'allow_admin_social_auth' => 'required|boolean',
            'allow_admin_signup' => 'required|boolean',
            'google_active' => 'required|boolean',
            'google_client_id' => 'nullable|string',
            'google_client_secret' => 'nullable|string',
            'google_callback_url' => 'nullable|url',
            'facebook_active' => 'required|boolean',
            'facebook_client_id' => 'nullable|string',
            'facebook_client_secret' => 'nullable|string',
            'facebook_callback_url' => 'nullable|url',
            'apple_active' => 'required|boolean',
            'apple_client_id' => 'nullable|string',
            'apple_client_secret' => 'nullable|string',
            'apple_callback_url' => 'nullable|url',
        ]);

        $settings = \Illuminate\Support\Facades\Cache::rememberForever('auth_settings', function () {
            return AuthSetting::firstOrCreate([], [
                'allow_admin_social_auth' => true,
                'allow_admin_signup' => true,
                'google_active' => false,
                'facebook_active' => false,
                'apple_active' => false,
            ]);
        });

        $settings->update($validated);
        
        \Illuminate\Support\Facades\Cache::forget('auth_settings');

        // Also log activity
        if (class_exists(\App\Models\ActivityLog::class)) {
            \App\Models\ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Updated auth settings',
                'entity_type' => 'AuthSetting',
                'entity_id' => $settings->id,
                'ip_address' => $request->ip(),
            ]);
        }

        return response()->json([
            'message' => 'Auth settings updated successfully',
            'settings' => $settings,
        ]);
    }
}
