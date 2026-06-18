<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProductBalance extends Model
{
    protected $fillable = ['user_id', 'product_id', 'user_package_id', 'quantity', 'initial_quantity'];

    protected $casts = [
        'quantity' => 'integer',
        'initial_quantity' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function userPackage(): BelongsTo
    {
        return $this->belongsTo(UserPackage::class);
    }

    public function hasBalance(int $required = 1): bool
    {
        return $this->quantity >= $required;
    }

    public function consume(int $amount = 1): bool
    {
        if (!$this->hasBalance($amount)) return false;
        
        $this->decrement('quantity', $amount);
        return true;
    }

    public function addBalance(int $amount): void
    {
        $this->increment('quantity', $amount);
    }
}
