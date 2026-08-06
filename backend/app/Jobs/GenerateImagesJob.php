<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Services\FalAiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Phase 2 — Generates one image per scene via Fal.ai.
 * Only dispatched when at least one of: story_book_pdf, coloring_book_pdf, video is selected.
 * On success, dispatches the relevant downstream jobs.
 *
 * Completion tracking: this job itself is not a "terminal" job (it doesn't
 * decrement pending_outputs_count) — each downstream job
 * (GenerateStoryBookJob / GenerateColoringBookJob / AssembleVideoJob via
 * GenerateSceneVideosJob) decrements its own slot.
 *
 * Failure handling: if image generation fails, none of story_book,
 * coloring_book, or video can be produced — refund credits for whichever
 * of those were selected, and decrement their pending-output slots so the
 * story doesn't stay stuck in 'processing' forever.
 */
class GenerateImagesJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600; // 10 min — reduced for testing mode (2 images)
    public int $tries   = 1;

    public function __construct(
        public int   $storyId,
        public array $selectedOutputs
    ) {}

    public function handle(FalAiService $fal): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'generate_images');
        $story->setStep('generate_images');

        try {
            $scenes = $story->scenes ?? [];
            if (empty($scenes)) {
                throw new \RuntimeException('No scenes available for image generation.');
            }

            $selected        = $this->selectedOutputs;
            $needsStoryBook  = in_array('story_book_pdf',   $selected, true);
            $needsColorBook  = in_array('coloring_book_pdf', $selected, true);
            $needsVideo      = in_array('video',             $selected, true);

            // Always generate images for all scenes — parallel generation.
            // Every scene needs its own image as the starting frame for video.
            // TEST_IMAGE_COUNT can limit scenes for cheaper dev testing.
            $testImageCount  = (int) env('TEST_IMAGE_COUNT', 0);
            $scenesToProcess = ($testImageCount > 0)
                ? array_slice($scenes, 0, $testImageCount)
                : $scenes;

            // ── Per-story seed lock ──────────────────────────────────────────
            // A fixed seed derived from the story ID ensures every scene image
            // is generated with the same style, lighting, color palette, and
            // clothing — maximising visual consistency across all scenes.
            $storySeed = abs(crc32('story_' . $story->id)) % 2147483647;

            Log::info('GenerateImagesJob: generating all scene images with seed lock', [
                'story_id'    => $story->id,
                'scene_count' => count($scenesToProcess),
                'seed'        => $storySeed,
            ]);

            foreach ($scenesToProcess as $scene) {
                $sceneNum = $scene['scene_number'];
                $prompt   = $scene['image_prompt'];
                $photoUrl = $story->photo_url;
                $childAge = $story->child_age;

                // Always generate images when story_book_pdf OR video is selected.
                // coloring_book_pdf alone defers to StoryProductService line-art conversion.
                $needsImages = $needsStoryBook || $needsVideo;

                if ($needsImages) {
                    $stylePrefix    = 'Manga/comic style illustration, bold outlines, vibrant colors, dynamic composition, professional children\'s book art style. ';
                    $enhancedPrompt = $stylePrefix . $prompt;

                    $imageUrl  = $fal->generateImage($enhancedPrompt, $photoUrl, $childAge, $storySeed);
                    $storedUrl = $fal->downloadAndStore(
                        $imageUrl,
                        "stories/{$story->id}/scene_{$sceneNum}.jpg"
                    );

                    StoryAsset::updateOrCreate(
                        ['story_id' => $story->id, 'scene_number' => $sceneNum, 'asset_type' => 'image'],
                        ['url' => $storedUrl, 'prompt' => $prompt]
                    );

                    Log::info("Image stored for scene {$sceneNum}", ['story_id' => $story->id]);
                } else {
                    // coloring_book_pdf only — StoryProductService converts colored images to line art.
                    Log::info("Skipping image for scene {$sceneNum} (coloring-only path, handled by StoryProductService)", ['story_id' => $story->id]);
                }
            }

            $log->complete();
        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));
            $story->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e;
        }

        // ── Dispatch downstream based on what was selected ─────────────────
        // Story Book and Coloring Book can run in parallel after images
        if (in_array('story_book_pdf', $selected, true)) {
            GenerateStoryBookJob::dispatch($story->id);
            // Companion interactive flipbook viewer — best-effort, does not
            // affect the story_book_pdf credit/slot (see GenerateInteractiveStorybookJob).
            GenerateInteractiveStorybookJob::dispatch($story->id);
        }

        if (in_array('coloring_book_pdf', $selected)) {
            GenerateColoringBookJob::dispatch($story->id);
        }

        // Video requires scene videos next
        if (in_array('video', $selected)) {
            GenerateSceneVideosJob::dispatch($story->id, $selected);
        }
    }

    /**
     * Images failed -> story_book, coloring_book, and video can never be
     * produced. Refund credits for each of those that was selected, and
     * decrement their pending-output slots so the story resolves to
     * 'failed' instead of staying stuck on pending_outputs_count > 0.
     */
    public function failed(Throwable $exception): void
    {
        $story = Story::find($this->storyId);
        if (!$story) {
            return;
        }

        $user = $story->user;
        $blockedOutputs = array_intersect($this->selectedOutputs, ['story_book_pdf', 'coloring_book_pdf', 'video']);

        foreach ($blockedOutputs as $outputType) {
            if ($user) {
                $user->refundProductByOutputType($outputType, $story->id);
            }
            $story->decrementPendingOutputs();
        }

        Log::error("GenerateImagesJob permanently failed for story #{$this->storyId} — refunded blocked outputs", [
            'error' => $exception->getMessage(),
            'refunded_outputs' => $blockedOutputs,
        ]);
    }
}
