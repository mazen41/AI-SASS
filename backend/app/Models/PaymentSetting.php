<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class PaymentSetting extends Model
{
    protected $fillable = [
        'gateway',
        'is_enabled',
        'is_sandbox',
        'public_key',
        'secret_key',
        'webhook_secret',
        'webhook_url',
        'additional_settings',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'is_sandbox' => 'boolean',
        'additional_settings' => 'array',
    ];

    protected $hidden = [
        'secret_key',
        'webhook_secret',
    ];

    public function setSecretKeyAttribute($value): void
    {
        $this->attributes['secret_key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getSecretKeyAttribute($value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public function setWebhookSecretAttribute($value): void
    {
        $this->attributes['webhook_secret'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getWebhookSecretAttribute($value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public static function getStripe(): ?self
    {
        return self::where('gateway', 'stripe')->first();
    }

    public static function getPaypal(): ?self
    {
        return self::where('gateway', 'paypal')->first();
    }
}
