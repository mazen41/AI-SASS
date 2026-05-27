<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanAddon extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'story_limit',
        'video_limit',
        'daily_story_limit',
        'daily_video_limit',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'story_limit' => 'integer',
        'video_limit' => 'integer',
        'daily_story_limit' => 'integer',
        'daily_video_limit' => 'integer',
        'is_active' => 'boolean',
    ];
}
