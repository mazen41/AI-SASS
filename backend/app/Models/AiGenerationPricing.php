<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiGenerationPricing extends Model
{
    protected $table = 'ai_generation_pricing';
    protected $guarded = ['id'];
    protected $casts = ['is_enabled' => 'boolean', 'metadata' => 'array'];
}
