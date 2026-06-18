<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StorybookPage extends Model
{
    use HasFactory;

    protected $fillable = [
        'story_id',
        'page_number',
        'page_type',
        'status',
        'title',
        'content',
        'dialogue',
        'illustration_prompt',
        'illustration_url',
        'background_url',
        'decorative_elements',
        'layout_type',
        'text_position',
        'color_scheme',
        'metadata',
    ];

    protected $casts = [
        'decorative_elements' => 'array',
        'metadata' => 'array',
    ];

    public function story()
    {
        return $this->belongsTo(Story::class);
    }

    // Page types
    public const TYPE_COVER = 'cover';
    public const TYPE_CHARACTER_INTRO = 'character_intro';
    public const TYPE_STORY = 'story';
    public const TYPE_LESSON = 'lesson';
    public const TYPE_ACTIVITY = 'activity';
    public const TYPE_ENDING = 'ending';

    // Layout types
    public const LAYOUT_FULL_ILLUSTRATION = 'full_illustration';
    public const LAYOUT_SPLIT = 'split';
    public const LAYOUT_TEXT_OVERLAY = 'text_overlay';
    public const LAYOUT_TEXT_LEFT = 'text_left';
    public const LAYOUT_TEXT_RIGHT = 'text_right';
    public const LAYOUT_TEXT_TOP = 'text_top';
    public const LAYOUT_TEXT_BOTTOM = 'text_bottom';

    // Text positions
    public const TEXT_TOP = 'top';
    public const TEXT_BOTTOM = 'bottom';
    public const TEXT_LEFT = 'left';
    public const TEXT_RIGHT = 'right';
    public const TEXT_OVERLAY = 'overlay';
}

