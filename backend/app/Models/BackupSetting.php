<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class BackupSetting extends Model
{
    protected $fillable = [
        'is_enabled',
        'destination',
        'local_path',
        's3_key',
        's3_secret',
        'region',
        'bucket',
        'endpoint',
        'google_folder_id',
        'google_json_key',
        'backup_time',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
    ];

    protected $hidden = [
        's3_secret',
        'google_json_key',
    ];

    public function setS3KeyAttribute($value): void
    {
        $this->attributes['s3_key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getS3KeyAttribute($value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public function setS3SecretAttribute($value): void
    {
        $this->attributes['s3_secret'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getS3SecretAttribute($value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public function setGoogleJsonKeyAttribute($value): void
    {
        $this->attributes['google_json_key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getGoogleJsonKeyAttribute($value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public static function getSettings(): ?self
    {
        return self::first();
    }
}
