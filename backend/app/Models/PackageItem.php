<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageItem extends Model
{
    protected $fillable = ['package_id', 'product_id', 'quantity', 'unit_price', 'subtotal'];

    protected $casts = ['unit_price' => 'float', 'subtotal' => 'float', 'quantity' => 'integer'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function package()
    {
        return $this->belongsTo(Package::class);
    }
}
