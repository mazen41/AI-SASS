<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Services\FalAiService;
use App\Services\MediaDurationService;
use App\Services\VideoTimelinePlanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Phase 3 (Video path only) — Generates one video clip per scene image.
 * Clip length per scene is derived from measured narration duration (master clock),
 * not hardcoded 5s/10s assumptions.
 */
class GenerateSceneVideosJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600;
    public int $tries   = 1;

    public function __construct(
        public int   $storyId,
        public array $selectedOutputs
    ) {}

    public function handle(FalAiService $fal, MediaDurationService $mediaDuration): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'generate_videos');
        $story->setStep('generate_videos');
        $testMode = (bool) config('app.story_test_mode', false);

        try {
            $imageAssets = $story->imageAssets()->get();
            $scenes      = collect($story->scenes ?? [])->keyBy('scene_number');

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

            Log::info('GenerateSceneVideosJob: clip plan from narration duration', [
                'story_id'             => $story->id,
                'narration_duration_s' => round($narrationDuration, 3),
                'scene_count'          => $sceneCount,
                'clip_durations'       => $clipDurations,
                'planned_video_total_s'=> array_sum($clipDurations),
                'test_mode'            => $testMode,
            ]);

            $assetsToProcess = $imageAssets;
            $clipIndex = 0;

            foreach ($assetsToProcess as $asset) {
                $sceneNum = $asset->scene_number;
                $scene    = $scenes->get($sceneNum);
                $prompt   = $scene['description'] ?? 'a scene from a children\'s story';
                $clipDuration = $clipDurations[$clipIndex] ?? end($clipDurations);
                $clipIndex++;

                $imageUrlForFal = $asset->url;
                if (!$this->isPublicFalUrl($imageUrlForFal)) {
                    $disk      = config('filesystems.default', 'public');
                    $baseUrl   = rtrim(Storage::disk($disk)->url(''), '/');
                    $relative  = ltrim(substr($imageUrlForFal, strlen($baseUrl)), '/');
                    $localPath = Storage::disk($disk)->path($relative);
                    $imageUrlForFal = $fal->uploadFileToFal($localPath);
                }

                $videoUrl  = $fal->generateVideo($imageUrlForFal, $prompt, $clipDuration);
                $storedUrl = $fal->downloadAndStore(
                    $videoUrl,
                    "stories/{$story->id}/scene_{$sceneNum}.mp4"
                );

                StoryAsset::updateOrCreate(
                    ['story_id' => $story->id, 'scene_number' => $sceneNum, 'asset_type' => 'video'],
                    ['url' => $storedUrl, 'prompt' => $prompt]
                );

                Log::info("Video stored for scene {$sceneNum}", [
                    'story_id'             => $story->id,
                    'requested_duration_s' => $clipDuration,
                ]);
            }

            $log->complete();
        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));
            $story->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e;
        }

        AssembleVideoJob::dispatch($story->id, $this->selectedOutputs);
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
