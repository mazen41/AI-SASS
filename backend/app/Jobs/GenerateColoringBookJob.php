<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryOutput;
use App\Services\StoryProductService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerateColoringBookJob implements ShouldQueue
{
    use Queueable;

    public int $tries   = 3;
    public int $timeout = 600; // 10 minutes — Fal.ai transforms per scene add up
    public array $backoff = [60, 180, 360];

    public function __construct(public readonly int $storyId) {}

    public function handle(StoryProductService $service): void
    {
        $story = Story::with('assets')->findOrFail($this->storyId);

        $output = StoryOutput::updateOrCreate(
            ['story_id' => $this->storyId, 'output_type' => StoryOutput::TYPE_COLORING_BOOK_PDF],
            ['status' => 'generating', 'error_message' => null]
        );

        try {
            $result = $service->generateColoringBook($story);

            if ($result->status === 'completed') {
                Log::info("ColoringBook generated for story #{$this->storyId}", ['path' => $result->storage_path]);
            } else {
                throw new \RuntimeException($result->error_message ?? 'Coloring book generation returned non-completed status.');
            }
        } catch (Throwable $e) {
            $output->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        StoryOutput::where('story_id', $this->storyId)
            ->where('output_type', StoryOutput::TYPE_COLORING_BOOK_PDF)
            ->update(['status' => 'failed', 'error_message' => mb_substr($exception->getMessage(), 0, 500)]);

        Log::error("GenerateColoringBookJob permanently failed for story #{$this->storyId}", [
            'error' => $exception->getMessage(),
        ]);
    }

    public function tags(): array
    {
        return ["story:{$this->storyId}", 'coloring-book'];
    }
}
