<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoryAsset extends Model
{
    protected $fillable = ['story_id', 'scene_number', 'asset_type', 'url', 'prompt'];

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }
}
