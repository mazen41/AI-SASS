<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiCreditReservationOutput extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['amount' => 'integer'];
}
