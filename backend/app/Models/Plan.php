<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'yearly_price',
        'monthly_credits',
        'story_limit',
        'video_limit',
        'daily_story_limit',
        'daily_video_limit',
        'billing_period',
        'features',
        'capabilities',
        'icon',
        'badge',
        'trial_days',
        'is_active',
        'is_public',
        'is_featured',
        'sort_order',
        'stripe_price_id',
        'paypal_plan_id',
        'moyasar_product_id',
        'myfatoorah_product_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'yearly_price' => 'decimal:2',
        'monthly_credits' => 'integer',
        'story_limit' => 'integer',
        'video_limit' => 'integer',
        'daily_story_limit' => 'integer',
        'daily_video_limit' => 'integer',
        'trial_days' => 'integer',
        'sort_order' => 'integer',
        'features' => 'array',
        'capabilities' => 'array',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'is_featured' => 'boolean',
    ];

    protected $appends = [
        'effective_capabilities',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class)->where('status', 'active');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->where('is_active', true)->where('is_public', true);
    }

    public function getEffectiveCapabilitiesAttribute(): array
    {
        $defaults = [
            'story_enabled' => true,
            'storybook_enabled' => true,
            'coloring_enabled' => true,
            'narration_enabled' => true,
            'video_enabled' => (int)($this->video_limit ?? 0) > 0,
            'max_storybook_pages' => 12,
            'max_coloring_pages' => 12,
            'max_video_duration_seconds' => (int)($this->video_limit ?? 0) > 0 ? 30 : 0,
            'allowed_ai_models' => ['standard'],
            'character_consistency' => true,
            'priority_generation' => false,
            'commercial_usage' => false,
            'custom_branding' => false,
            'support_level' => 'email',
        ];

        return array_merge($defaults, is_array($this->capabilities) ? $this->capabilities : []);
    }

    public function hasCapability(string $key): bool
    {
        $caps = $this->effective_capabilities;
        return !empty($caps[$key]);
    }

    public function getCapability(string $key, mixed $default = null): mixed
    {
        $caps = $this->effective_capabilities;
        return $caps[$key] ?? $default;
    }
}
