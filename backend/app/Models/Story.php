<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Story extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'title', 'content', 'theme', 'child_name', 'child_age',
        'photo_url', 'video_url', 'status', 'scenes', 'duration_seconds', 'language',
        'processing_step', 'error_message', 'custom_prompt', 'narration_url', 'assembled_video_url',
    ];

    protected function casts(): array
    {
        return [
            'scenes'           => 'array',
            'child_age'        => 'integer',
            'duration_seconds' => 'integer',
            'created_at'       => 'datetime',
            'updated_at'       => 'datetime',
        ];
    }

    public function user(): BelongsTo    { return $this->belongsTo(User::class); }
    public function assets(): HasMany    { return $this->hasMany(StoryAsset::class); }
    public function aiJobLogs(): HasMany { return $this->hasMany(AiJobLog::class); }

    public function isDraft(): bool      { return $this->status === 'draft'; }
    public function isProcessing(): bool { return $this->status === 'processing'; }
    public function isCompleted(): bool  { return $this->status === 'completed'; }
    public function isFailed(): bool     { return $this->status === 'failed'; }

    public function setStep(string $step): void
    {
        $this->update(['processing_step' => $step]);
    }

    public function imageAssets(): HasMany
    {
        return $this->assets()->where('asset_type', 'image')->orderBy('scene_number');
    }

    public function videoAssets(): HasMany
    {
        return $this->assets()->where('asset_type', 'video')->orderBy('scene_number');
    }
}
