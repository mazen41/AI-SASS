<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MyFatoorahCheckoutSession extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'user_id', 'plan_id', 'pending_registration_id', 'invoice_id', 'payment_id', 'amount', 'currency', 'status', 'gateway_response'];
    protected $casts = ['amount' => 'decimal:2', 'gateway_response' => 'array'];
}
