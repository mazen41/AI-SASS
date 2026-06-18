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

    public function userPackages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UserPackage::class);
    }

    public function activeUserPackage(): ?UserPackage
    {
        return $this->userPackages()
            ->where('is_active', true)
            ->where(function($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->with('package.items.product')
            ->latest()
            ->first();
    }

    public function productBalances(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UserProductBalance::class);
    }

    public function productConsumptions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ProductConsumption::class);
    }

    public function getProductBalance(int $productId): int
    {
        $balance = $this->productBalances()->where('product_id', $productId)->first();
        return $balance ? $balance->quantity : 0;
    }

    public function hasProductBalance(int $productId, int $required = 1): bool
    {
        return $this->getProductBalance($productId) >= $required;
    }

    public function consumeProduct(int $productId, int $quantity = 1, ?int $storyId = null, ?string $outputType = null): bool
    {
        $balance = $this->productBalances()->where('product_id', $productId)->first();
        
        if (!$balance || !$balance->hasBalance($quantity)) {
            return false;
        }

        $balance->consume($quantity);

        ProductConsumption::create([
            'user_id' => $this->id,
            'product_id' => $productId,
            'story_id' => $storyId,
            'quantity' => $quantity,
            'output_type' => $outputType,
        ]);

        return true;
    }

    /**
     * Refund a previously-consumed product credit (e.g. when a generation
     * job permanently fails after the credit was already deducted).
     * Adds the quantity back to the user's balance and logs a
     * negative-quantity ProductConsumption row so the net consumption
     * for that story/output stays accurate in reports.
     */
    public function refundProduct(int $productId, int $quantity = 1, ?int $storyId = null, ?string $outputType = null): void
    {
        $balance = $this->productBalances()->where('product_id', $productId)->first();

        if ($balance) {
            $balance->addBalance($quantity);
        } else {
            UserProductBalance::create([
                'user_id' => $this->id,
                'product_id' => $productId,
                'quantity' => $quantity,
                'initial_quantity' => $quantity,
            ]);
        }

        ProductConsumption::create([
            'user_id' => $this->id,
            'product_id' => $productId,
            'story_id' => $storyId,
            'quantity' => -$quantity,
            'output_type' => $outputType,
        ]);
    }

    /**
     * Refund credits for a given output type on a story, looked up by
     * product slug (e.g. 'narration_audio' -> 'narration').
     * Safe no-op if the product can't be resolved.
     */
    public function refundProductByOutputType(string $outputType, ?int $storyId = null, int $quantity = 1): void
    {
        $productMap = [
            'story_text' => 'story',
            'narration_audio' => 'narration',
            'story_book_pdf' => 'story_book',
            'coloring_book_pdf' => 'coloring_book',
            'video' => 'video',
        ];

        $slug = $productMap[$outputType] ?? null;
        if (!$slug) {
            return;
        }

        $product = Product::where('slug', $slug)->first();
        if (!$product) {
            return;
        }

        $this->refundProduct($product->id, $quantity, $storyId, $outputType);
    }

    public function assignPackage(int $packageId): UserPackage
    {
        $package = Package::findOrFail($packageId);
        
        $userPackage = UserPackage::create([
            'user_id' => $this->id,
            'package_id' => $packageId,
            'assigned_at' => now(),
            'is_active' => true,
        ]);

        foreach ($package->items as $item) {
            UserProductBalance::updateOrCreate(
                [
                    'user_id' => $this->id,
                    'product_id' => $item->product_id,
                ],
                [
                    'user_package_id' => $userPackage->id,
                    'quantity' => $item->quantity,
                    'initial_quantity' => $item->quantity,
                ]
            );
        }

        return $userPackage;
    }

    public function getAllProductBalances(): array
    {
        $balances = $this->productBalances()->with('product')->get();
        $result = [];
        
        foreach ($balances as $balance) {
            $result[$balance->product->slug] = [
                'product_id' => $balance->product_id,
                'product_name' => $balance->product->name,
                'quantity' => $balance->quantity,
                'initial_quantity' => $balance->initial_quantity,
            ];
        }
        
        return $result;
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
