<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoryOutput extends Model
{
    public const TYPE_STORY_BOOK_PDF = 'story_book_pdf';
    public const TYPE_COLORING_BOOK_PDF = 'coloring_book_pdf';
    public const TYPE_ACTIVITY_BOOK_PDF = 'activity_book_pdf';
    public const TYPE_FINAL_VIDEO = 'final_video';
    public const TYPE_NARRATION_AUDIO = 'narration_audio';

    protected $fillable = [
        'story_id',
        'output_type',
        'status',
        'url',
        'storage_path',
        'metadata',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }
}
