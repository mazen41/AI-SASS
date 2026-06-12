<?php

namespace App\Jobs;

use App\Models\Story;
use App\Services\StoryProductService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GenerateStoryProductsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 1800;
    public int $tries = 1;

    public function __construct(public Story $story) {}

    public function handle(StoryProductService $storyProducts): void
    {
        $this->story->refresh();

        $storyProducts->registerExistingMediaOutputs($this->story);
        $storyProducts->generateStoryBook($this->story);
        $storyProducts->generateColoringBook($this->story);

        $this->story->update([
            'status' => 'completed',
            'processing_step' => null,
        ]);

        Log::info('Story products generated', ['story_id' => $this->story->id]);
    }
}
