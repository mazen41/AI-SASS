<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Models\ActivityLog;
use App\Models\StoryOutput;
use App\Services\GeminiService;
use App\Services\VideoTimelinePlanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Phase 1 — Always runs. Generates story text + scene breakdown via Gemini
 * (with automatic fallback across multiple Gemini models on 503/429 errors —
 * see GeminiService::$fallbackModels). On success, dispatches only the
 * downstream jobs the user selected.
 *
 * Dependency tree:
 *
 *   GenerateStoryTextJob          (always)
 *       ↓
 *   GenerateImagesJob             (if: story_book | coloring_book | video)
 *       ├── GenerateInteractiveStorybookJob (if: story_book_pdf selected)
 *       ├── GenerateColoringBookJob    (if: coloring_book_pdf selected)
 *       └── GenerateSceneVideosJob     (if: video selected)
 *               ↓
 *           AssembleVideoJob           (if: video selected)
 *
 *   GenerateNarrationJob          (if: narration_audio selected) — parallel, no image dep
 *
 * Completion tracking:
 *   $story->pending_outputs_count is initialized here to the number of
 *   "terminal" async jobs (narration / story_book / coloring_book / video's
 *   AssembleVideoJob) that must each call decrementPendingOutputs() before
 *   the story is marked 'completed'. If no terminal jobs are needed
 *   (story_text only), the story is marked completed immediately.
 *
 * Failure handling:
 *   If this job fails permanently, ALL selected output credits are refunded
 *   since nothing downstream can run without the story text/scenes.
 */
class GenerateStoryTextJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;
    public int $tries   = 2;

    public function __construct(public Story $story) {}

    public function handle(GeminiService $gemini): void
    {
        $story = $this->story->fresh();
        $log   = AiJobLog::start($story->id, 'generate_story');
        $story->setStep('generate_story');

        try {
            $params = [
                'child_name'              => $story->child_name,
                'child_age'               => $story->child_age,
                'theme'                   => $story->theme,
                'language'                => $story->language,
                'custom_prompt'           => $story->custom_prompt,
                'min_duration_seconds'    => VideoTimelinePlanner::MIN_NARRATION_SECONDS,
                'max_duration_seconds'    => VideoTimelinePlanner::MAX_NARRATION_SECONDS,
                'target_duration_seconds' => VideoTimelinePlanner::TARGET_NARRATION_SECONDS,
            ];

            // GeminiService::generateStory() internally tries the configured
            // model first, then falls back across services.gemini.fallback_models
            // on 503 (overloaded) / 429 (quota) errors.
            $data = $gemini->generateStory($params);

            $story->update([
                'title'   => $data['title'],
                'content' => $data['story_text'],
                'scenes'  => $data['scenes'],
            ]);

            Log::info('GenerateStoryTextJob: story text ready', [
                'story_id'           => $story->id,
                'word_count'         => $data['word_count'] ?? VideoTimelinePlanner::countWords($data['story_text']),
                'scene_count'        => count($data['scenes'] ?? []),
                'estimated_audio_s'  => round(
                    VideoTimelinePlanner::estimateSecondsFromWords(
                        $data['word_count'] ?? VideoTimelinePlanner::countWords($data['story_text'])
                    ),
                    1
                ),
            ]);

            $log->complete();
        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));
            $story->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e;
        }

        // ── Initialize completion tracking ──────────────────────────────────
        $story->initPendingOutputs();
        $story->refresh();

        // ── Dispatch downstream jobs based on selected_outputs ──────────────
        $selected = $story->selected_outputs ?? ['story_text'];
        $needsImages  = array_intersect($selected, ['story_book_pdf', 'coloring_book_pdf', 'video']);
        $needsNarration = in_array('narration_audio', $selected) || in_array('video', $selected);

        if (in_array('video', $selected)) {
            // Video flow: Generate Story -> Generate Narration -> Generate Video
            // We start with narration, which will chain to images/videos
            GenerateNarrationJob::dispatch($story->id);
        } else {
            // Non-video flow: dispatch independent tasks in parallel
            if ($needsNarration) {
                GenerateNarrationJob::dispatch($story->id);
            }
            if (!empty($needsImages)) {
                // Images required — dispatch image job, which will chain downstream
                GenerateImagesJob::dispatch($story->id, $selected);
            }
        }

        if (empty($needsImages) && !$needsNarration) {
            // Nothing else needed — story text only, mark complete
            $story->update(['status' => 'completed', 'processing_step' => null]);

            ActivityLog::log(
                userId: $story->user_id,
                action: 'story_generated',
                entityType: 'story',
                entityId: $story->id,
                newValues: ['status' => 'completed', 'outputs' => $selected]
            );
        }
    }

    /**
     * If story text generation itself fails permanently, nothing downstream
     * can run for any selected output — refund every selected output's credit.
     */
    public function failed(Throwable $exception): void
    {
        $story = $this->story->fresh();
        if (!$story) {
            return;
        }

        $user = $story->user;
        if (!$user) {
            return;
        }

        $selected = $story->selected_outputs ?? ['story_text'];

        foreach ($selected as $outputType) {
            $user->refundProductByOutputType($outputType, $story->id);
        }

        Log::error("GenerateStoryTextJob permanently failed for story #{$story->id} — refunded all selected outputs", [
            'error' => $exception->getMessage(),
            'refunded_outputs' => $selected,
        ]);
    }
}
