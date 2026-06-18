<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryOutput;
use App\Services\StorybookGenerationService;
use App\Services\StorybookIllustrationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerateInteractiveStorybookJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 3600; // 60 minutes - generating many illustrations
    public array $backoff = [60, 180, 300];

    public function __construct(public readonly int $storyId) {}

    public function handle(
        StorybookGenerationService $generationService,
        StorybookIllustrationService $illustrationService
    ): void {
        Log::info('JOB START: GenerateInteractiveStorybookJob', ['story_id' => $this->storyId]);

        $story = Story::with('assets')->findOrFail($this->storyId);
        Log::info('STEP 1 COMPLETE: Story lookup', ['story_id' => $this->storyId]);

        $output = StoryOutput::updateOrCreate(
            ['story_id' => $this->storyId, 'output_type' => StoryOutput::TYPE_STORY_BOOK_PDF],
            ['status' => 'generating', 'error_message' => null]
        );
        Log::info('STEP 2 COMPLETE: StoryOutput created/updated', ['story_id' => $this->storyId]);

        try {
            Log::info("Starting interactive storybook generation", ['story_id' => $this->storyId]);

            // Step 1: Generate page structure and content
            Log::info('STEP 3 START: generateStorybook() call', ['story_id' => $this->storyId]);
            $pages = $generationService->generateStorybook($story);
            Log::info('STEP 3 COMPLETE: generateStorybook() returned', ['story_id' => $this->storyId, 'page_count' => count($pages)]);

            Log::info("Generated storybook page structure", ['story_id' => $this->storyId, 'page_count' => count($pages)]);

            // Update storybook data JSON on story
            Log::info('STEP 4 START: updateStorybookData() call', ['story_id' => $this->storyId]);
            $generationService->updateStorybookData($story, $pages);
            Log::info('STEP 4 COMPLETE: updateStorybookData() returned', ['story_id' => $this->storyId]);

            // Step 2: Generate illustrations for all pages
            Log::info('STEP 5 START: generateAllIllustrations() call', ['story_id' => $this->storyId]);
            $illustrationService->generateAllIllustrations($story);
            Log::info('STEP 5 COMPLETE: generateAllIllustrations() returned', ['story_id' => $this->storyId]);

            Log::info("Generated all storybook illustrations", ['story_id' => $this->storyId]);

            // Step 3: Generate backgrounds only (skip decorative elements - too slow)
            Log::info('STEP 6 START: Generate backgrounds loop', ['story_id' => $this->storyId, 'page_count' => count($story->storybookPages)]);
            foreach ($story->storybookPages as $page) {
                Log::info('STEP 6.1 START: generateBackground() for page', ['story_id' => $this->storyId, 'page_number' => $page->page_number]);
                $illustrationService->generateBackground($page);
                Log::info('STEP 6.1 COMPLETE: generateBackground() returned', ['story_id' => $this->storyId, 'page_number' => $page->page_number]);
            }
            Log::info('STEP 6 COMPLETE: All backgrounds generated', ['story_id' => $this->storyId]);

            Log::info("Generated backgrounds", ['story_id' => $this->storyId]);

            // Step 4: Update story with storybook URL
            Log::info('STEP 7 START: Update storybook_url', ['story_id' => $this->storyId]);
            $storybookUrl = '/api/stories/' . $story->id . '/storybook';
            $story->update(['storybook_url' => $storybookUrl]);
            Log::info('STEP 7 COMPLETE: storybook_url updated', ['story_id' => $this->storyId]);

            // Mark output as completed
            Log::info('STEP 8 START: Mark output as completed', ['story_id' => $this->storyId]);
            $output->update([
                'status' => 'completed',
                'url' => '/api/stories/' . $story->id . '/storybook',
                'metadata' => [
                    'format' => 'interactive_web_storybook',
                    'page_count' => count($pages),
                    'viewer' => 'interactive_flipbook',
                    'generated_at' => now()->toISOString(),
                ],
                'error_message' => null,
            ]);
            Log::info('STEP 8 COMPLETE: Output marked as completed', ['story_id' => $this->storyId]);

            Log::info("Interactive storybook generation completed", ['story_id' => $this->storyId]);

            // Terminal job for story_book_pdf - decrement pending outputs
            Log::info('STEP 9 START: decrementPendingOutputs()', ['story_id' => $this->storyId]);
            $story->decrementPendingOutputs();
            Log::info('STEP 9 COMPLETE: decrementPendingOutputs() returned', ['story_id' => $this->storyId]);

            Log::info('JOB COMPLETE: GenerateInteractiveStorybookJob finished successfully', ['story_id' => $this->storyId]);
        } catch (\Throwable $e) {
            Log::error("Interactive storybook generation failed", [
                'story_id' => $this->storyId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $output->update([
                'status' => 'failed',
                'error_message' => mb_substr($e->getMessage(), 0, 500),
            ]);

            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        $story = Story::find($this->storyId);
        if ($story) {
            $user = $story->user;
            if ($user) {
                $user->refundProductByOutputType('story_book_pdf', $story->id);
            }
            $story->decrementPendingOutputs();
        }

        Log::error("GenerateInteractiveStorybookJob permanently failed for story #{$this->storyId} — refunded story_book credit", [
            'error' => $exception->getMessage(),
        ]);
    }

    public function tags(): array
    {
        return ["story:{$this->storyId}", 'interactive-storybook'];
    }
}
