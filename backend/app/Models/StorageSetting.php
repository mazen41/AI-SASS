<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class StorageSetting extends Model
{
    protected $fillable = [
        'driver',
        'is_active',
        'key',
        'secret',
        'region',
        'bucket',
        'endpoint',
        'use_path_style_endpoint',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'use_path_style_endpoint' => 'boolean',
    ];

    protected $hidden = [
        'secret',
    ];

    public function setKeyAttribute($value): void
    {
        $this->attributes['key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getKeyAttribute($value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public function setSecretAttribute($value): void
    {
        $this->attributes['secret'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getSecretAttribute($value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public static function getActive(): ?self
    {
        return self::where('is_active', true)->first();
    }

    public function applyConfiguration(): void
    {
        if ($this->driver === 's3') {
            $region = $this->region ?: 'us-east-1';
            config([
                'filesystems.default' => 's3',
                'filesystems.disks.s3' => [
                    'driver' => 's3',
                    'key' => $this->key,
                    'secret' => $this->secret,
                    'region' => $region,
                    'bucket' => $this->bucket,
                    'url' => "https://{$this->bucket}.s3.{$region}.amazonaws.com",
                    'endpoint' => $this->endpoint ?: null,
                    'use_path_style_endpoint' => (bool)$this->use_path_style_endpoint,
                    'throw' => false,
                    'report' => false,
                ]
            ]);
        } elseif ($this->driver === 'wasabi') {
            $region = $this->region ?: 'us-east-1';
            // Determine Wasabi endpoint from region if not provided
            $endpoint = $this->endpoint ?: "https://s3.{$region}.wasabisys.com";
            config([
                'filesystems.default' => 'wasabi',
                'filesystems.disks.wasabi' => [
                    'driver' => 's3',
                    'key' => $this->key,
                    'secret' => $this->secret,
                    'region' => $region,
                    'bucket' => $this->bucket,
                    'url' => "https://{$this->bucket}.s3.{$region}.wasabisys.com",
                    'endpoint' => $endpoint,
                    'use_path_style_endpoint' => true,
                    'throw' => false,
                    'report' => false,
                ]
            ]);
        } else {
            config([
                'filesystems.default' => 'public'
            ]);
        }
    }
}
