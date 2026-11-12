<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiCreditPackage extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['credits' => 'integer', 'price' => 'decimal:2', 'is_active' => 'boolean'];
}
