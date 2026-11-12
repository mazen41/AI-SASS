<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'monthly_credits',
        'story_limit',
        'video_limit',
        'daily_story_limit',
        'daily_video_limit',
        'billing_period',
        'features',
        'is_active',
        'is_featured',
        'sort_order',
        'stripe_price_id',
        'paypal_plan_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'monthly_credits' => 'integer',
        'story_limit' => 'integer',
        'video_limit' => 'integer',
        'daily_story_limit' => 'integer',
        'daily_video_limit' => 'integer',
        'features' => 'array',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class)->where('status', 'active');
    }
}
