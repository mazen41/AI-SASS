<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\AiJobLog;
use App\Services\MediaDurationService;
use App\Services\VideoTimelinePlanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Phase 3 (Video path only) — Parallel scene video coordinator.
 *
 * Dispatches one GenerateSingleSceneVideoJob per scene simultaneously.
 * All scenes generate in parallel (~30s total vs ~4 min sequential).
 *
 * Consistency is maintained by:
 *  • PuLID face-lock on every image (same child's face in every scene)
 *  • Per-story seed lock (same seed → same art style, clothing, lighting)
 *  • Strong prompt enforcement (identical clothing description in every prompt)
 *
 * The barrier pattern in GenerateSingleSceneVideoJob triggers AssembleVideoJob
 * exactly once when all scenes complete.
 */
class GenerateSceneVideosJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;
    public int $tries   = 1;

    public function __construct(
        public int   $storyId,
        public array $selectedOutputs
    ) {}

    public function handle(MediaDurationService $mediaDuration): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'dispatch_scene_videos');
        $story->setStep('generate_videos');

        try {
            // ── 1. Validate prerequisites ───────────────────────────────────
            $imageAssets = $story->imageAssets()->orderBy('scene_number')->get();

            if ($imageAssets->isEmpty()) {
                throw new \RuntimeException('No scene images found — cannot generate videos.');
            }

            if (!$story->narration_url) {
                throw new \RuntimeException('Narration audio is required before scene videos can be timed.');
            }

            $narrationLocal    = $mediaDuration->resolveLocalPath($story->narration_url);
            $narrationDuration = $story->duration_seconds
                ? (float) $story->duration_seconds
                : $mediaDuration->getDurationSeconds($narrationLocal);

            if ($narrationDuration <= 0) {
                throw new \RuntimeException('Could not determine narration duration for scene video timing.');
            }

            // ── 2. Compute clip durations ────────────────────────────────────
            $sceneCount    = $imageAssets->count();
            $clipDurations = VideoTimelinePlanner::computeClipDurations($narrationDuration, $sceneCount);

            // ── 3. Per-story seed (same seed = same style across all clips) ──
            // Using the same seed the image job used ensures the video style
            // matches the images exactly.
            $storySeed = abs(crc32('story_' . $story->id)) % 2147483647;

            Log::info('GenerateSceneVideosJob: dispatching parallel scene jobs', [
                'story_id'              => $story->id,
                'narration_duration_s'  => round($narrationDuration, 3),
                'scene_count'           => $sceneCount,
                'clip_durations'        => $clipDurations,
                'planned_video_total_s' => array_sum($clipDurations),
                'seed'                  => $storySeed,
                'video_model'           => config('services.fal.video_model'),
            ]);

            // ── 4. Reset barrier state ───────────────────────────────────────
            $story->assets()->whereIn('asset_type', ['video', 'video_failed'])->delete();
            $story->update([
                'total_video_scenes'       => $sceneCount,
                'completed_video_scenes'   => 0,
                'video_assembly_triggered' => false,
            ]);

            // ── 5. Dispatch ALL scenes in parallel ───────────────────────────
            $clipIndex = 0;
            foreach ($imageAssets as $asset) {
                $sceneNum    = $asset->scene_number;
                $clipDuration = $clipDurations[$clipIndex] ?? end($clipDurations);
                $clipIndex++;

                GenerateSingleSceneVideoJob::dispatch(
                    $story->id,
                    $sceneNum,
                    $clipDuration,
                    $storySeed,
                    $this->selectedOutputs
                );

                Log::info("GenerateSceneVideosJob: dispatched scene {$sceneNum}", [
                    'story_id'     => $story->id,
                    'scene_number' => $sceneNum,
                    'clip_duration'=> $clipDuration,
                ]);
            }

            $log->complete();

            Log::info('GenerateSceneVideosJob: all parallel jobs dispatched', [
                'story_id'       => $story->id,
                'jobs_dispatched'=> $sceneCount,
            ]);

        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));
            $story->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        $story = Story::find($this->storyId);
        if ($story) {
            $user = $story->user;
            if ($user) {
                $user->refundProductByOutputType('video', $story->id);
            }
            $story->decrementPendingOutputs();
        }

        Log::error("GenerateSceneVideosJob permanently failed for story #{$this->storyId}", [
            'error' => $exception->getMessage(),
        ]);
    }
}
