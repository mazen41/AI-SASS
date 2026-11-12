<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Services\PrivateImageStorage;

class StoryAsset extends Model
{
    protected $fillable = ['story_id', 'scene_number', 'asset_type', 'url', 'prompt'];

    public function getUrlAttribute($value): ?string
    {
        return app(PrivateImageStorage::class)->url($value);
    }

    public function storageReference(): ?string
    {
        return $this->getRawOriginal('url');
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }
}
