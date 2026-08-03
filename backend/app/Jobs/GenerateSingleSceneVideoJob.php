<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Services\FalAiService;
use App\Services\MediaDurationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Single scene video generation - runs in parallel for each scene.
 * Triggered by GenerateSceneVideosJob which dispatches one job per scene.
 * Uses a barrier pattern to track completion and trigger assembly when all scenes are done.
 */
class GenerateSingleSceneVideoJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600; // 10 minutes per scene (Wan Pro is fast)
    public int $tries   = 2;
    public array $backoff = [60, 120];

    public function __construct(
        public int   $storyId,
        public int   $sceneNumber,
        public int   $clipDuration,
        public array $selectedOutputs
    ) {}

    public function handle(FalAiService $fal, MediaDurationService $mediaDuration): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'generate_scene_video_' . $this->sceneNumber);
        
        try {
            $scene = collect($story->scenes ?? [])->firstWhere('scene_number', $this->sceneNumber);
            if (!$scene) {
                throw new \RuntimeException("Scene {$this->sceneNumber} not found in story data");
            }

            $asset = $story->assets()
                ->where('asset_type', 'image')
                ->where('scene_number', $this->sceneNumber)
                ->first();

            if (!$asset) {
                throw new \RuntimeException("No image asset found for scene {$this->sceneNumber}");
            }

            $prompt = $scene['description'] ?? 'a scene from a children\'s story';
            $imageUrlForFal = $asset->url;

            // Upload to Fal.ai if not public
            if (!$this->isPublicFalUrl($imageUrlForFal)) {
                $disk      = 'public';
                $baseUrl   = rtrim(Storage::disk($disk)->url(''), '/');
                $relative  = ltrim(substr($imageUrlForFal, strlen($baseUrl)), '/');
                $localPath = Storage::disk($disk)->path($relative);
                $imageUrlForFal = $fal->uploadFileToFal($localPath);
            }

            Log::info("GenerateSingleSceneVideoJob: starting scene {$this->sceneNumber}", [
                'story_id' => $story->id,
                'scene_number' => $this->sceneNumber,
                'clip_duration' => $this->clipDuration,
                'model' => config('services.fal.video_model'),
            ]);

            $videoUrl  = $fal->generateVideo($imageUrlForFal, $prompt, $this->clipDuration);
            $storedUrl = $fal->downloadAndStore(
                $videoUrl,
                "stories/{$story->id}/scene_{$this->sceneNumber}.mp4"
            );

            StoryAsset::updateOrCreate(
                ['story_id' => $story->id, 'scene_number' => $this->sceneNumber, 'asset_type' => 'video'],
                ['url' => $storedUrl, 'prompt' => $prompt]
            );

            $log->complete();
            
            Log::info("GenerateSingleSceneVideoJob: completed scene {$this->sceneNumber}", [
                'story_id' => $story->id,
                'scene_number' => $this->sceneNumber,
            ]);

            // Check if all scenes are complete - trigger assembly if so
            $this->checkAndTriggerAssembly($story);

        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));
            
            // Mark this scene as failed but don't fail the whole story yet
            // Let the barrier mechanism handle partial failures
            Log::error("GenerateSingleSceneVideoJob failed for scene {$this->sceneNumber}", [
                'story_id' => $story->id,
                'scene_number' => $this->sceneNumber,
                'error' => $e->getMessage(),
            ]);

            // Still check barrier - maybe other scenes succeeded
            $this->checkAndTriggerAssembly($story);
            
            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        $story = Story::find($this->storyId);
        if ($story) {
            $user = $story->user;
            if ($user) {
                // Only refund if this failure makes the video impossible
                $videoAssets = $story->videoAssets()->count();
                $totalScenes = $story->imageAssets()->count();
                
                // If we have less than 80% of scenes, refund
                if ($videoAssets < ($totalScenes * 0.8)) {
                    $user->refundProductByOutputType('video', $story->id);
                    $story->decrementPendingOutputs();
                }
            }
        }

        Log::error("GenerateSingleSceneVideoJob permanently failed for story #{$this->storyId}, scene {$this->sceneNumber}", [
            'error' => $exception->getMessage(),
        ]);
    }

    private function checkAndTriggerAssembly(Story $story): void
    {
        $totalScenes = $story->imageAssets()->count();
        $completedScenes = $story->videoAssets()->count();

        Log::info("Barrier check: video progress", [
            'story_id' => $story->id,
            'completed_scenes' => $completedScenes,
            'total_scenes' => $totalScenes,
        ]);

        // If all scenes are complete, trigger assembly
        if ($completedScenes >= $totalScenes && $totalScenes > 0) {
            Log::info("Barrier reached: all scenes complete, triggering assembly", [
                'story_id' => $story->id,
                'scene_count' => $totalScenes,
            ]);

            AssembleVideoJob::dispatch($story->id, $this->selectedOutputs);
        }
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