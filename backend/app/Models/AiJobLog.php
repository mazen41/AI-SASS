<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiJobLog extends Model
{
    protected $fillable = ['story_id', 'step', 'status', 'meta', 'error'];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }

    public static function start(int $storyId, string $step, array $meta = []): static
    {
        return static::create(['story_id' => $storyId, 'step' => $step, 'status' => 'started', 'meta' => $meta]);
    }

    public function complete(array $meta = []): void
    {
        $this->update(['status' => 'completed', 'meta' => array_merge($this->meta ?? [], $meta)]);
    }

    public function fail(string $error): void
    {
        $this->update(['status' => 'failed', 'error' => $error]);
    }
}
