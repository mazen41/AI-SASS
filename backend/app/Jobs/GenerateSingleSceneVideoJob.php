<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Services\FalAiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Parallel Scene Video Generator — Barrier Pattern
 *
 * Generates a single scene's video clip from its pre-generated story image.
 * All scenes run in PARALLEL (dispatched simultaneously by GenerateSceneVideosJob).
 *
 * Consistency mechanisms:
 *  • PuLID face-lock on images ensures the same child's face in every scene image.
 *  • Per-story seed lock: every video clip uses the same seed → consistent
 *    motion style, color palette, and character movement across all scenes.
 *  • Strict prompt enforcement: identical clothing/style keywords in every prompt.
 *
 * The barrier pattern (checkAndTriggerAssembly) guarantees AssembleVideoJob is
 * dispatched exactly once when ALL parallel scene jobs finish.
 */
class GenerateSingleSceneVideoJob implements ShouldQueue
{
    use Queueable;

    /** 10 minutes per scene (Wan typically completes in 1–2 min) */
    public int $timeout = 600;
    public int $tries   = 1; // NO retries — Fal.ai charges even for failed/timed-out jobs

    public function __construct(
        public int   $storyId,
        public int   $sceneNumber,
        public int   $clipDuration,
        public int   $seed,            // Per-story seed for style consistency
        public array $selectedOutputs
    ) {}

    public function handle(FalAiService $fal): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'generate_scene_video_' . $this->sceneNumber);

        try {
            // ── 1. Get the pre-generated scene image ────────────────────────
            $asset = $story->assets()
                ->where('asset_type', 'image')
                ->where('scene_number', $this->sceneNumber)
                ->first();

            if (!$asset) {
                throw new \RuntimeException("No image asset found for scene {$this->sceneNumber}");
            }

            // ── 2. Get the scene prompt ──────────────────────────────────────
            $scene  = collect($story->scenes ?? [])->firstWhere('scene_number', $this->sceneNumber);
            $prompt = $scene['image_prompt'] ?? $scene['description'] ?? $asset->prompt
                ?? "scene {$this->sceneNumber} from a children's story";

            // ── 3. Resolve image URL for Fal.ai ─────────────────────────────
            $imageUrlForFal = $asset->url;
            if (!$this->isPublicFalUrl($imageUrlForFal)) {
                $disk      = 'public';
                $baseUrl   = rtrim(Storage::disk($disk)->url(''), '/');
                $relative  = ltrim(substr($imageUrlForFal, strlen($baseUrl)), '/');
                $localPath = Storage::disk($disk)->path($relative);
                $imageUrlForFal = $fal->uploadFileToFal($localPath);
            }

            Log::info("GenerateSingleSceneVideoJob: starting scene {$this->sceneNumber}", [
                'story_id'     => $story->id,
                'scene_number' => $this->sceneNumber,
                'clip_duration'=> $this->clipDuration,
                'seed'         => $this->seed,
                'model'        => config('services.fal.video_model'),
            ]);

            // ── 4. Generate video with seed lock ─────────────────────────────
            $videoUrl  = $fal->generateVideo($imageUrlForFal, $prompt, $this->clipDuration, $this->seed);
            $storedUrl = $fal->downloadAndStore(
                $videoUrl,
                "stories/{$story->id}/scene_{$this->sceneNumber}.mp4"
            );

            // ── 5. Clear any video_failed marker from a previous retry ───────
            $story->assets()
                ->where('scene_number', $this->sceneNumber)
                ->where('asset_type', 'video_failed')
                ->delete();

            StoryAsset::updateOrCreate(
                ['story_id' => $story->id, 'scene_number' => $this->sceneNumber, 'asset_type' => 'video'],
                ['url' => $storedUrl, 'prompt' => $prompt]
            );

            DB::table('stories')
                ->where('id', $story->id)
                ->update(['completed_video_scenes' => DB::raw('completed_video_scenes + 1')]);

            $log->complete();

            Log::info("GenerateSingleSceneVideoJob: completed scene {$this->sceneNumber}", [
                'story_id'     => $story->id,
                'scene_number' => $this->sceneNumber,
            ]);

            // ── 6. Barrier: trigger assembly when all scenes done ────────────
            $this->checkAndTriggerAssembly($story);

        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));

            Log::error("GenerateSingleSceneVideoJob failed for scene {$this->sceneNumber}", [
                'story_id'     => $story->id,
                'scene_number' => $this->sceneNumber,
                'error'        => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        $story = Story::find($this->storyId);
        if (!$story) return;

        // ── Race-condition guard ─────────────────────────────────────────────
        // If the supervisor killed and re-queued this job but the original
        // worker process was still alive and completed the Fal.ai call, a
        // successful 'video' asset will already exist. In that case this
        // failed() call is a ghost — ignore it entirely to avoid corrupting
        // the barrier and triggering partial assembly.
        $alreadySucceeded = $story->assets()
            ->where('asset_type', 'video')
            ->where('scene_number', $this->sceneNumber)
            ->exists();

        if ($alreadySucceeded) {
            Log::warning("GenerateSingleSceneVideoJob: failed() ghost call ignored — video asset already exists for scene {$this->sceneNumber}", [
                'story_id'     => $story->id,
                'scene_number' => $this->sceneNumber,
                'error'        => substr($exception->getMessage(), 0, 200),
            ]);
            return;
        }

        // Mark scene as permanently failed
        StoryAsset::updateOrCreate(
            ['story_id' => $story->id, 'scene_number' => $this->sceneNumber, 'asset_type' => 'video_failed'],
            ['url' => '', 'prompt' => substr($exception->getMessage(), 0, 500)]
        );

        DB::table('stories')
            ->where('id', $story->id)
            ->update(['completed_video_scenes' => DB::raw('completed_video_scenes + 1')]);

        // Still check barrier — assemble with whatever scenes succeeded
        $this->checkAndTriggerAssembly($story);

        Log::error("GenerateSingleSceneVideoJob permanently failed for story #{$this->storyId}, scene {$this->sceneNumber}", [
            'error' => $exception->getMessage(),
        ]);

        // Refund only if less than 80% of scenes succeeded
        $totalScenes    = $story->imageAssets()->count();
        $successScenes  = $story->assets()->where('asset_type', 'video')->distinct('scene_number')->count('scene_number');
        if ($successScenes < ($totalScenes * 0.8)) {
            $user = $story->user;
            if ($user) {
                $user->refundProductByOutputType('video', $story->id);
                $story->decrementPendingOutputs();
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function checkAndTriggerAssembly(Story $story): void
    {
        $totalScenes = $story->imageAssets()->count();

        // Count unique scene numbers that have FINISHED (success or failure)
        $finishedScenes = $story->assets()
            ->whereIn('asset_type', ['video', 'video_failed'])
            ->distinct('scene_number')
            ->count('scene_number');

        $completedScenes = $story->assets()
            ->where('asset_type', 'video')
            ->distinct('scene_number')
            ->count('scene_number');

        Log::info('Barrier check: video progress', [
            'story_id'        => $story->id,
            'completed_scenes'=> $completedScenes,
            'finished_scenes' => $finishedScenes,
            'total_scenes'    => $totalScenes,
        ]);

        if ($finishedScenes >= $totalScenes && $totalScenes > 0) {
            // Atomic update — ensures AssembleVideoJob is dispatched exactly once
            $affected = DB::table('stories')
                ->where('id', $story->id)
                ->where('video_assembly_triggered', false)
                ->update(['video_assembly_triggered' => true]);

            if ($affected > 0) {
                Log::info('Barrier reached: all scenes complete, triggering assembly', [
                    'story_id'    => $story->id,
                    'scene_count' => $totalScenes,
                ]);
                AssembleVideoJob::dispatch($story->id, $this->selectedOutputs);
            } else {
                Log::info('Barrier already triggered by another worker, skipping duplicate', [
                    'story_id' => $story->id,
                ]);
            }
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