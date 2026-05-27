<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'avatar',
        'last_login_at',
        'social_provider',
        'social_id',
        'social_token',
        'social_refresh_token',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'last_login_at'     => 'datetime',
        ];
    }

    public function subscriptions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): ?\App\Models\Subscription
    {
        return $this->subscriptions()
            ->where(function($query) {
                $query->where('status', 'active')
                      ->orWhere(function($q) {
                          $q->where('status', 'canceled')
                            ->where('current_period_end', '>', now());
                      });
            })
            ->where(function($query) {
                $query->whereNull('current_period_end')
                      ->orWhere('current_period_end', '>', now());
            })
            ->first();
    }

    public function transactions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function activityLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function stories(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Story::class);
    }

    public function invoices(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'super_admin']);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function getStoryLimitDetails(): array
    {
        $activeSub = $this->activeSubscription();
        $startDate = $activeSub ? $activeSub->current_period_start : now()->subDays(30);

        // 1. Base Limit from active subscription
        $baseLimit = $activeSub ? ($activeSub->plan->story_limit ?? 0) : 0;
        $dailyBaseLimit = $activeSub ? ($activeSub->plan->daily_story_limit ?? 0) : 0;

        // 2. Addon Limit (sum of story_limit from all paid addon invoices in current period)
        $addonLimit = 0;
        $dailyAddonLimit = 0;
        $invoices = $this->invoices()
            ->where('status', 'paid')
            ->where('issued_at', '>=', $startDate)
            ->get();

        foreach ($invoices as $invoice) {
            $items = $invoice->items;
            if (is_array($items)) {
                foreach ($items as $item) {
                    if (isset($item['type']) && $item['type'] === 'addon') {
                        $addon = null;
                        if (isset($item['slug'])) {
                            $addon = \App\Models\PlanAddon::where('slug', $item['slug'])->first();
                        } else {
                            $addon = \App\Models\PlanAddon::where('name', $item['name'])->first();
                        }
                        if ($addon) {
                            $addonLimit += $addon->story_limit;
                            $dailyAddonLimit += $addon->daily_story_limit ?? 0;
                        }
                    }
                }
            }
        }

        $totalLimit = $baseLimit + $addonLimit;
        $dailyTotalLimit = $dailyBaseLimit + $dailyAddonLimit;

        // 3. Usage (count stories created in the current period)
        $usage = $this->stories()
            ->where('created_at', '>=', $startDate)
            ->count();

        $dailyUsage = $this->stories()
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        $daysRemaining = 0;
        if ($activeSub && $activeSub->current_period_end) {
            $daysRemaining = max(0, now()->diffInDays(\Carbon\Carbon::parse($activeSub->current_period_end), false));
        }

        return [
            'base_limit' => $baseLimit,
            'addon_limit' => $addonLimit,
            'total_limit' => $totalLimit,
            'usage' => $usage,
            'remaining' => $totalLimit >= 999999 ? 999999 : max(0, $totalLimit - $usage),
            'is_unlimited' => $totalLimit >= 999999,
            
            'daily_base_limit' => $dailyBaseLimit,
            'daily_addon_limit' => $dailyAddonLimit,
            'daily_total_limit' => $dailyTotalLimit,
            'daily_usage' => $dailyUsage,
            'daily_remaining' => $dailyTotalLimit >= 999999 ? 999999 : max(0, $dailyTotalLimit - $dailyUsage),
            'is_daily_unlimited' => $dailyTotalLimit >= 999999,
            
            'days_remaining' => $daysRemaining,
        ];
    }

    public function getVideoLimitDetails(): array
    {
        $activeSub = $this->activeSubscription();
        $startDate = $activeSub ? $activeSub->current_period_start : now()->subDays(30);

        // 1. Base Limit
        $baseLimit = $activeSub ? ($activeSub->plan->video_limit ?? 0) : 0;
        $dailyBaseLimit = $activeSub ? ($activeSub->plan->daily_video_limit ?? 0) : 0;

        // 2. Addon Limit
        $addonLimit = 0;
        $dailyAddonLimit = 0;
        $invoices = $this->invoices()
            ->where('status', 'paid')
            ->where('issued_at', '>=', $startDate)
            ->get();

        foreach ($invoices as $invoice) {
            $items = $invoice->items;
            if (is_array($items)) {
                foreach ($items as $item) {
                    if (isset($item['type']) && $item['type'] === 'addon') {
                        $addon = null;
                        if (isset($item['slug'])) {
                            $addon = \App\Models\PlanAddon::where('slug', $item['slug'])->first();
                        } else {
                            $addon = \App\Models\PlanAddon::where('name', $item['name'])->first();
                        }
                        if ($addon) {
                            $addonLimit += $addon->video_limit;
                            $dailyAddonLimit += $addon->daily_video_limit ?? 0;
                        }
                    }
                }
            }
        }

        $totalLimit = $baseLimit + $addonLimit;
        $dailyTotalLimit = $dailyBaseLimit + $dailyAddonLimit;

        // 3. Usage (stories generated with videos in current period)
        $usage = $this->stories()
            ->where('created_at', '>=', $startDate)
            ->whereNotNull('video_url')
            ->count();

        $dailyUsage = $this->stories()
            ->where('created_at', '>=', now()->startOfDay())
            ->whereNotNull('video_url')
            ->count();

        $daysRemaining = 0;
        if ($activeSub && $activeSub->current_period_end) {
            $daysRemaining = max(0, now()->diffInDays(\Carbon\Carbon::parse($activeSub->current_period_end), false));
        }

        return [
            'base_limit' => $baseLimit,
            'addon_limit' => $addonLimit,
            'total_limit' => $totalLimit,
            'usage' => $usage,
            'remaining' => $totalLimit >= 999999 ? 999999 : max(0, $totalLimit - $usage),
            'is_unlimited' => $totalLimit >= 999999,

            'daily_base_limit' => $dailyBaseLimit,
            'daily_addon_limit' => $dailyAddonLimit,
            'daily_total_limit' => $dailyTotalLimit,
            'daily_usage' => $dailyUsage,
            'daily_remaining' => $dailyTotalLimit >= 999999 ? 999999 : max(0, $dailyTotalLimit - $dailyUsage),
            'is_daily_unlimited' => $dailyTotalLimit >= 999999,

            'days_remaining' => $daysRemaining,
        ];
    }
}
