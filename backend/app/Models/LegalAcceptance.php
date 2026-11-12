<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LegalAcceptance extends Model
{
    protected $fillable = ['user_id', 'terms_version', 'privacy_version', 'accepted_at', 'source'];

    protected function casts(): array
    {
        return ['accepted_at' => 'datetime'];
    }
}
