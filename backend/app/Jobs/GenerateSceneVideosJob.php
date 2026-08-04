<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Services\MediaDurationService;
use App\Services\VideoTimelinePlanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Phase 3 (Video path only) — Dispatches parallel jobs to generate scene videos.
 * This job now acts as a coordinator that calculates timing and dispatches
 * parallel GenerateSingleSceneVideoJob instances for each scene.
 * 
 * The barrier pattern is implemented in GenerateSingleSceneVideoJob which
 * checks completion and triggers AssembleVideoJob when all scenes are done.
 */
class GenerateSceneVideosJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300; // 5 minutes for coordination
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
        $testMode = (bool) config('app.story_test_mode', false);

        try {
            $imageAssets = $story->imageAssets()->get();

            if ($imageAssets->isEmpty()) {
                throw new \RuntimeException('No scene images found — cannot generate videos.');
            }

            if (!$story->narration_url) {
                throw new \RuntimeException('Narration audio is required before scene videos can be timed.');
            }

            $narrationLocal = $mediaDuration->resolveLocalPath($story->narration_url);
            $narrationDuration = $story->duration_seconds
                ? (float) $story->duration_seconds
                : $mediaDuration->getDurationSeconds($narrationLocal);

            if ($narrationDuration <= 0) {
                throw new \RuntimeException('Could not determine narration duration for scene video timing.');
            }

            $sceneCount = $imageAssets->count();
            $clipDurations = VideoTimelinePlanner::computeClipDurations($narrationDuration, $sceneCount);

            Log::info('GenerateSceneVideosJob: dispatching parallel scene video jobs', [
                'story_id'             => $story->id,
                'narration_duration_s' => round($narrationDuration, 3),
                'scene_count'          => $sceneCount,
                'clip_durations'       => $clipDurations,
                'planned_video_total_s'=> array_sum($clipDurations),
                'test_mode'            => $testMode,
                'video_model'          => config('services.fal.video_model'),
            ]);

            // Clear any existing video and video_failed assets for this story (in case of retry)
            $story->assets()->whereIn('asset_type', ['video', 'video_failed'])->delete();

            // Initialize barrier counters atomically before dispatching parallel jobs
            $story->update([
                'total_video_scenes'        => $sceneCount,
                'completed_video_scenes'    => 0,
                'video_assembly_triggered'  => false,
            ]);

            // Dispatch parallel jobs for each scene
            $clipIndex = 0;
            foreach ($imageAssets as $asset) {
                $sceneNum = $asset->scene_number;
                $clipDuration = $clipDurations[$clipIndex] ?? end($clipDurations);
                $clipIndex++;

                GenerateSingleSceneVideoJob::dispatch(
                    $story->id,
                    $sceneNum,
                    $clipDuration,
                    $this->selectedOutputs
                );

                Log::info("GenerateSceneVideosJob: dispatched job for scene {$sceneNum}", [
                    'story_id' => $story->id,
                    'scene_number' => $sceneNum,
                    'clip_duration' => $clipDuration,
                ]);
            }

            $log->complete();
            
            Log::info('GenerateSceneVideosJob: all parallel jobs dispatched', [
                'story_id' => $story->id,
                'jobs_dispatched' => $sceneCount,
            ]);

        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));
            $story->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e;
        }

        // Note: AssembleVideoJob is now triggered by the barrier in GenerateSingleSceneVideoJob
        // when all parallel scene jobs complete
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

        Log::error("GenerateSceneVideosJob permanently failed for story #{$this->storyId} — refunded video credit", [
            'error' => $exception->getMessage(),
        ]);
    }
}
