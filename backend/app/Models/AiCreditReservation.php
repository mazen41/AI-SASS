<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiCreditReservation extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['expires_at' => 'datetime', 'subscription_cycle_started_at' => 'datetime'];
    public function outputs(): HasMany { return $this->hasMany(AiCreditReservationOutput::class, 'reservation_id'); }
}
