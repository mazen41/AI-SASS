<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryOutput;
use App\Services\StoryProductService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Manual/legacy entrypoint (StoryController::generateProducts).
 * Generates story products on demand, but ONLY for outputs the user
 * actually selected (selected_outputs), to avoid wasted Fal.ai calls
 * and incorrect "completed" StoryOutput rows for unselected products.
 *
 * The primary pipeline (GenerateStoryTextJob -> GenerateImagesJob) already
 * dispatches GenerateInteractiveStorybookJob / GenerateColoringBookJob
 * conditionally and does NOT use this job.
 */
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

        $selected = $this->story->selected_outputs ?? [];

        $wantsStoryBook    = in_array('story_book_pdf', $selected, true);
        $wantsColoringBook = in_array('coloring_book_pdf', $selected, true);

        if ($wantsStoryBook) {
            StoryOutput::updateOrCreate(
                ['story_id' => $this->story->id, 'output_type' => StoryOutput::TYPE_STORY_BOOK_PDF],
                ['status' => 'pending', 'error_message' => null]
            );
            GenerateInteractiveStorybookJob::dispatch($this->story->id);
        }

        if ($wantsColoringBook) {
            StoryOutput::updateOrCreate(
                ['story_id' => $this->story->id, 'output_type' => StoryOutput::TYPE_COLORING_BOOK_PDF],
                ['status' => 'pending', 'error_message' => null]
            );
            GenerateColoringBookJob::dispatch($this->story->id);
        }

        // Mark the story as completed; selected book products (if any) finish in background
        $this->story->update([
            'status'          => 'completed',
            'processing_step' => null,
        ]);

        Log::info('Story products dispatched', [
            'story_id'    => $this->story->id,
            'story_book'  => $wantsStoryBook,
            'coloring_book' => $wantsColoringBook,
        ]);
    }
}
