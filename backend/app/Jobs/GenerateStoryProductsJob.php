<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryOutput;
use App\Services\StoryProductService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GenerateStoryProductsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;
    public int $tries   = 1;

    public function __construct(public Story $story) {}

    public function handle(StoryProductService $storyProducts): void
    {
        $this->story->refresh();

        // Register the video / audio outputs that already exist from the main pipeline
        $storyProducts->registerExistingMediaOutputs($this->story);

        // Mark both book outputs as pending so the frontend shows "Generating…" immediately
        StoryOutput::updateOrCreate(
            ['story_id' => $this->story->id, 'output_type' => StoryOutput::TYPE_STORY_BOOK_PDF],
            ['status' => 'pending', 'error_message' => null]
        );
        StoryOutput::updateOrCreate(
            ['story_id' => $this->story->id, 'output_type' => StoryOutput::TYPE_COLORING_BOOK_PDF],
            ['status' => 'pending', 'error_message' => null]
        );

        // Dispatch independent async jobs — each has its own retry / backoff policy
        GenerateStoryBookJob::dispatch($this->story->id);
        GenerateColoringBookJob::dispatch($this->story->id);

        // Mark the story as completed; book PDFs will finish in the background
        $this->story->update([
            'status'          => 'completed',
            'processing_step' => null,
        ]);

        Log::info('Story products dispatched', ['story_id' => $this->story->id]);
    }
}
