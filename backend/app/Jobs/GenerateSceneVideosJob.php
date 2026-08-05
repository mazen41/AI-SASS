<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\AiJobLog;
use App\Services\FalAiService;
use App\Services\MediaDurationService;
use App\Services\VideoTimelinePlanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Phase 3 (Video path only) — Sequential frame-chaining coordinator.
 *
 * Builds the full clip plan (scene_number → clip_duration) from the measured
 * narration duration, then kicks off Scene 1's GenerateSingleSceneVideoJob.
 *
 * Each scene job, after completing, extracts its own last frame via FFmpeg and
 * passes it as the "inputImageUrl" to the next scene job — so Scene N always
 * begins from the exact pixel where Scene N-1 ended.
 *
 * The last scene job dispatches AssembleVideoJob directly.
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

    public function handle(MediaDurationService $mediaDuration, FalAiService $fal): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'dispatch_scene_videos');
        $story->setStep('generate_videos');
        $testMode = (bool) config('app.story_test_mode', false);

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

            // ── 2. Build clip plan ──────────────────────────────────────────
            $scenes      = collect($story->scenes ?? [])->sortBy('scene_number');
            $sceneCount  = $scenes->count();
            $clipDurations = VideoTimelinePlanner::computeClipDurations($narrationDuration, $sceneCount);

            // Build a map of scene_number => clip_duration using index mapping
            $clipPlan = [];
            $index = 0;
            foreach ($scenes as $scene) {
                $sceneNum = $scene['scene_number'];
                $clipPlan[$sceneNum] = $clipDurations[$index] ?? end($clipDurations);
                $index++;
            }

            Log::info('GenerateSceneVideosJob: starting sequential frame-chain', [
                'story_id'              => $story->id,
                'narration_duration_s'  => round($narrationDuration, 3),
                'scene_count'           => $sceneCount,
                'clip_durations'        => $clipDurations,
                'planned_video_total_s' => array_sum($clipDurations),
                'test_mode'             => $testMode,
                'video_model'           => config('services.fal.video_model'),
            ]);

            // ── 3. Clear any stale video assets & reset state ───────────────
            $story->assets()->whereIn('asset_type', ['video', 'video_failed'])->delete();
            $story->update([
                'total_video_scenes'       => $sceneCount,
                'completed_video_scenes'   => 0,
                'video_assembly_triggered' => false,
            ]);

            // ── 4. Resolve + upload Scene 1's story image to Fal.ai ─────────
            $firstAsset    = $imageAssets->first();
            $firstImageUrl = $this->resolveAndUploadImage($firstAsset->url, $fal);

            // ── 5. Dispatch Scene 1 with full clip plan for frame chaining ───────────
            GenerateSingleSceneVideoJob::dispatch(
                $story->id,
                $firstAsset->scene_number,       // Use actual scene number from image
                $clipPlan[$firstAsset->scene_number], // Scene 1 duration
                $firstImageUrl,                 // Scene 1 image (Fal-ready)
                $clipPlan,                      // Full plan for all scenes
                $this->selectedOutputs
            );

            $log->complete();

            Log::info('GenerateSceneVideosJob: Scene 1 dispatched — chain will self-propagate', [
                'story_id'    => $story->id,
                'scene_count' => $sceneCount,
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

        Log::error("GenerateSceneVideosJob permanently failed for story #{$this->storyId} — refunded video credit", [
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Resolve a storage URL to a local path, then upload it to Fal.ai storage
     * so it can be used as an image-to-video input.
     */
    private function resolveAndUploadImage(string $storageUrl, FalAiService $fal): string
    {
        if ($this->isPublicFalUrl($storageUrl)) {
            return $storageUrl;
        }

        $disk     = 'public';
        $baseUrl  = rtrim(\Illuminate\Support\Facades\Storage::disk($disk)->url(''), '/');
        $relative = ltrim(substr($storageUrl, strlen($baseUrl)), '/');
        $localPath = \Illuminate\Support\Facades\Storage::disk($disk)->path($relative);

        return $fal->uploadFileToFal($localPath);
    }

    private function isPublicFalUrl(string $url): bool
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) return false;
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) return false;
        return !in_array($host, ['localhost', '127.0.0.1', '::1'], true)
            && !str_starts_with($host, '192.168.')
            && !str_starts_with($host, '10.')
            && !str_starts_with($host, '172.');
    }
}
