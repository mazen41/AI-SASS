<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'user_id',
        'subscription_id',
        'invoice_number',
        'amount',
        'currency',
        'status',
        'items',
        'billing_address',
        'gateway',
        'gateway_transaction_id',
        'issued_at',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'items' => 'array',
        'billing_address' => 'array',
        'issued_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * Generate a unique invoice number like INV-20260526-0001
     */
    public static function generateInvoiceNumber(): string
    {
        $date = now()->format('Ymd');
        $lastInvoice = self::where('invoice_number', 'like', "INV-{$date}-%")
            ->orderByDesc('id')
            ->first();

        if ($lastInvoice) {
            $lastNumber = (int) substr($lastInvoice->invoice_number, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "INV-{$date}-{$newNumber}";
    }
}
