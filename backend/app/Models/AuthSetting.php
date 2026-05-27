<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuthSetting extends Model
{
    protected $fillable = [
        'allow_admin_social_auth',
        'allow_admin_signup',
        'google_active',
        'google_client_id',
        'google_client_secret',
        'google_callback_url',
        'facebook_active',
        'facebook_client_id',
        'facebook_client_secret',
        'facebook_callback_url',
        'apple_active',
        'apple_client_id',
        'apple_client_secret',
        'apple_callback_url',
    ];

    protected $casts = [
        'allow_admin_social_auth' => 'boolean',
        'allow_admin_signup' => 'boolean',
        'google_active' => 'boolean',
        'facebook_active' => 'boolean',
        'apple_active' => 'boolean',
    ];
}
