<?php



namespace App\Models;



use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Support\Facades\DB;



class Story extends Model

{

    use HasFactory;



    protected $fillable = [

        'user_id', 'title', 'content', 'theme', 'child_name', 'child_age',

        'photo_url', 'video_url', 'status', 'scenes', 'duration_seconds', 'language',

        'processing_step', 'error_message', 'custom_prompt', 'narration_url', 'assembled_video_url',

        'selected_outputs', 'pending_outputs_count', 'storybook_data', 'storybook_url',

    ];



    protected function casts(): array

    {

        return [

            'scenes'           => 'array',

            'selected_outputs' => 'array',

            'child_age'        => 'integer',

            'duration_seconds' => 'integer',

            'pending_outputs_count' => 'integer',

            'storybook_data'   => 'array',

            'created_at'       => 'datetime',

            'updated_at'       => 'datetime',

        ];

    }



    public function user(): BelongsTo    { return $this->belongsTo(User::class); }

    public function assets(): HasMany    { return $this->hasMany(StoryAsset::class); }

    public function aiJobLogs(): HasMany { return $this->hasMany(AiJobLog::class); }

    public function outputs(): HasMany   { return $this->hasMany(StoryOutput::class); }

    public function storybookPages(): HasMany { return $this->hasMany(StorybookPage::class)->orderBy('page_number'); }



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



    public function coloringPageAssets(): HasMany

    {

        return $this->assets()->where('asset_type', 'coloring_page')->orderBy('scene_number');

    }



    /**

     * Initialize the pending-outputs counter based on selected_outputs.

     * Counts the number of async "terminal" jobs that must each report

     * completion before the story as a whole is marked 'completed'.

     *

     * Terminal jobs per selection:

     *  - narration_audio  -> GenerateNarrationJob

     *  - story_book_pdf   -> GenerateStoryBookJob

     *  - coloring_book_pdf-> GenerateColoringBookJob

     *  - video            -> AssembleVideoJob

     *  - (none of the above, only story_text) -> GenerateStoryTextJob marks complete itself, counter stays 0

     *

     * Must be called once, before any downstream jobs are dispatched.

     */

    public function initPendingOutputs(): void

    {

        $selected = $this->selected_outputs ?? ['story_text'];



        $terminalOutputs = ['narration_audio', 'story_book_pdf', 'coloring_book_pdf', 'video'];

        $count = count(array_intersect($selected, $terminalOutputs));



        $this->update(['pending_outputs_count' => $count]);

    }



    /**

     * Atomically decrement the pending-outputs counter. If it reaches zero,

     * mark the story as 'completed' and log the activity.

     *

     * Safe to call concurrently from multiple queue workers.

     */

    public function decrementPendingOutputs(): void

    {

        DB::transaction(function () {

            $story = static::where('id', $this->id)->lockForUpdate()->first();



            if (!$story || $story->pending_outputs_count <= 0) {

                return;

            }



            $remaining = $story->pending_outputs_count - 1;

            $story->pending_outputs_count = $remaining;



            if ($remaining <= 0 && $story->status !== 'completed' && $story->status !== 'failed') {

                $story->status = 'completed';

                $story->processing_step = null;

            }



            $story->save();



            if ($remaining <= 0 && $story->status === 'completed') {

                ActivityLog::log(

                    userId: $story->user_id,

                    action: 'story_generated',

                    entityType: 'story',

                    entityId: $story->id,

                    newValues: ['status' => 'completed', 'outputs' => $story->selected_outputs ?? []]

                );

            }

        });



        $this->refresh();

    }

}

