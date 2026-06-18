<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductConsumption extends Model
{
    protected $fillable = ['user_id', 'product_id', 'story_id', 'story_output_id', 'quantity', 'output_type'];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }

    public function storyOutput(): BelongsTo
    {
        return $this->belongsTo(StoryOutput::class);
    }
}
