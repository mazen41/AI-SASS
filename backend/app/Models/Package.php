<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    protected $fillable = ['name', 'description', 'total_price', 'is_active'];

    protected $casts = ['total_price' => 'float', 'is_active' => 'boolean'];

    public function items()
    {
        return $this->hasMany(PackageItem::class)->with('product');
    }
}
