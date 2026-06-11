<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'price', 'is_active'];

    protected $casts = ['price' => 'float', 'is_active' => 'boolean'];

    public function packageItems()
    {
        return $this->hasMany(PackageItem::class);
    }
}
