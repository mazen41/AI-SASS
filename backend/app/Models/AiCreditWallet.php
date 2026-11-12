<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiCreditWallet extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['cycle_started_at' => 'datetime', 'is_unlimited' => 'boolean'];
    protected $appends = ['available_credits'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function transactions(): HasMany { return $this->hasMany(AiCreditTransaction::class, 'user_id', 'user_id'); }
    // Reserved credits are removed from spendable buckets at reservation time.
    public function getAvailableAttribute(): int
    {
        return $this->is_unlimited
            ? 999_999_999
            : max(0, (int) $this->subscription_credits + (int) $this->purchased_credits);
    }
    public function getAvailableCreditsAttribute(): int { return $this->available; }
}
