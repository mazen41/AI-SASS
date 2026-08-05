<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Services\FalAiService;
use App\Services\MediaDurationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Sequential Scene Video Generator — Frame Chaining
 *
 * Flow per scene:
 *  1. Receive inputImageUrl (Fal-ready URL): for Scene 1 this is the story image;
 *     for Scenes 2–N it is the LAST FRAME extracted from the previous scene's video.
 *  2. Generate video clip from inputImageUrl via Wan Pro.
 *  3. Store the video clip.
 *  4. Extract the LAST FRAME of the clip using FFmpeg.
 *  5. Upload that frame to Fal.ai storage.
 *  6a. If more scenes remain → dispatch next GenerateSingleSceneVideoJob with that frame URL.
 *  6b. If last scene → dispatch AssembleVideoJob.
 *
 * This guarantees that every scene visually begins at the exact pixel where
 * the previous scene ended — no random jumps, no character repositioning.
 */
class GenerateSingleSceneVideoJob implements ShouldQueue
{
    use Queueable;

    /** 10 minutes per scene (Wan typically completes in 2–4 min) */
    public int $timeout = 600;
    public int $tries   = 1; // NO retries — Fal.ai charges even for failed/timed-out jobs


    public function __construct(
        public int    $storyId,
        public int    $sceneNumber,
        public int    $clipDuration,
        public string $inputImageUrl,   // Fal-ready URL: story image (scene 1) OR last frame (scene 2..N)
        public array  $clipPlan,        // [scene_number => clip_duration] for the whole story
        public array  $selectedOutputs
    ) {}

    public function handle(FalAiService $fal, MediaDurationService $mediaDuration): void
    {
        $story   = Story::findOrFail($this->storyId);
        $log     = AiJobLog::start($story->id, 'generate_scene_video_' . $this->sceneNumber);
        $totalScenes = count($this->clipPlan);

        try {
            // ── 1. Get scene prompt from story's image asset ────────────────
            $asset = $story->assets()
                ->where('asset_type', 'image')
                ->where('scene_number', $this->sceneNumber)
                ->first();

            if (!$asset) {
                throw new \RuntimeException("No image asset found for scene {$this->sceneNumber}");
            }

            $prompt = $asset->prompt
                ?? (collect($story->scenes ?? [])->firstWhere('scene_number', $this->sceneNumber)['description'] ?? null)
                ?? "scene {$this->sceneNumber} from a children's story";

            Log::info("GenerateSingleSceneVideoJob: starting scene {$this->sceneNumber}", [
                'story_id'     => $story->id,
                'scene_number' => $this->sceneNumber,
                'clip_duration'=> $this->clipDuration,
                'total_scenes' => $totalScenes,
                'model'        => config('services.fal.video_model'),
                'is_chain'     => $this->sceneNumber > 1 ? 'yes (last frame of previous scene)' : 'no (original story image)',
            ]);

            // ── 2. Generate video from inputImageUrl ────────────────────────
            $videoUrl  = $fal->generateVideo($this->inputImageUrl, $prompt, $this->clipDuration);
            $storedUrl = $fal->downloadAndStore(
                $videoUrl,
                "stories/{$story->id}/scene_{$this->sceneNumber}.mp4"
            );

            // ── 3. Clear any video_failed marker from a previous retry ──────
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

            // ── 4. Extract last frame of this clip via FFmpeg ────────────────
            $nextSceneNumber = $this->nextSceneNumber();

            if ($nextSceneNumber !== null) {
                $lastFrameUrl = $this->extractLastFrameAndUpload($storedUrl, $story->id, $fal, $mediaDuration);

                $nextClipDuration = $this->clipPlan[$nextSceneNumber];

                Log::info("GenerateSingleSceneVideoJob: chaining to scene {$nextSceneNumber}", [
                    'story_id'    => $story->id,
                    'next_scene'  => $nextSceneNumber,
                    'frame_url'   => $lastFrameUrl,
                ]);

                // ── 5a. Dispatch NEXT scene job with last frame ───────────────
                GenerateSingleSceneVideoJob::dispatch(
                    $story->id,
                    $nextSceneNumber,
                    $nextClipDuration,
                    $lastFrameUrl,
                    $this->clipPlan,
                    $this->selectedOutputs
                );

            } else {
                // ── 5b. All scenes done → trigger assembly ────────────────────
                Log::info("GenerateSingleSceneVideoJob: last scene complete, triggering assembly", [
                    'story_id'    => $story->id,
                    'scene_count' => $totalScenes,
                ]);

                $affected = DB::table('stories')
                    ->where('id', $story->id)
                    ->where('video_assembly_triggered', false)
                    ->update(['video_assembly_triggered' => true]);

                if ($affected > 0) {
                    AssembleVideoJob::dispatch($story->id, $this->selectedOutputs);
                }
            }

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
        if (!$story) {
            Log::error("GenerateSingleSceneVideoJob permanently failed for story #{$this->storyId}, scene {$this->sceneNumber} — story not found");
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

        // Since we're sequential, a permanent failure breaks the chain.
        // Assemble with whatever completed scenes we have so far.
        $completedScenes = $story->assets()
            ->where('asset_type', 'video')
            ->distinct('scene_number')
            ->count('scene_number');

        Log::error("GenerateSingleSceneVideoJob permanently failed for story #{$this->storyId}, scene {$this->sceneNumber}", [
            'error'            => $exception->getMessage(),
            'completed_scenes' => $completedScenes,
        ]);

        if ($completedScenes > 0) {
            // Trigger assembly with whatever clips succeeded
            $affected = DB::table('stories')
                ->where('id', $story->id)
                ->where('video_assembly_triggered', false)
                ->update(['video_assembly_triggered' => true]);

            if ($affected > 0) {
                Log::warning("GenerateSingleSceneVideoJob: assembling partial video after scene {$this->sceneNumber} failure", [
                    'story_id'        => $story->id,
                    'completed_scenes' => $completedScenes,
                ]);
                AssembleVideoJob::dispatch($story->id, $this->selectedOutputs);
            }
        } else {
            // No scenes at all succeeded — refund
            $user = $story->user;
            if ($user) {
                $user->refundProductByOutputType('video', $story->id);
            }
            $story->decrementPendingOutputs();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Returns the next scene number in the plan, or null if this is the last scene.
     */
    private function nextSceneNumber(): ?int
    {
        $sceneNumbers = array_keys($this->clipPlan);
        sort($sceneNumbers);
        $currentIndex = array_search($this->sceneNumber, $sceneNumbers);

        if ($currentIndex === false || $currentIndex >= count($sceneNumbers) - 1) {
            return null;
        }

        return $sceneNumbers[$currentIndex + 1];
    }

    /**
     * Extract the very last frame of a stored video clip and upload it to
     * Fal.ai storage so the next scene job can use it as its starting image.
     *
     * Uses `ffmpeg -sseof -0.1 -i video.mp4 -vframes 1 last_frame.jpg`
     */
    private function extractLastFrameAndUpload(
        string $storedVideoUrl,
        int $storyId,
        FalAiService $fal,
        MediaDurationService $mediaDuration
    ): string {
        $tmpDir   = storage_path('app/tmp/lastframe_' . $storyId . '_' . $this->sceneNumber . '_' . time());
        @mkdir($tmpDir, 0755, true);
        $framePath = "{$tmpDir}/last_frame.jpg";

        try {
            $ffmpeg    = $this->findFfmpeg();
            $localPath = $mediaDuration->resolveLocalPath($storedVideoUrl, 'public');

            if (!file_exists($localPath)) {
                throw new \RuntimeException("Stored video not found for last-frame extraction: {$localPath}");
            }

            // Extract last frame: seek from EOF 0.1s and grab 1 frame at max quality
            $cmd = "\"{$ffmpeg}\" -y -sseof -0.1 -i \"{$localPath}\" -vframes 1 -q:v 1 \"{$framePath}\" 2>&1";
            exec($cmd, $out, $code);

            if ($code !== 0 || !file_exists($framePath) || filesize($framePath) < 100) {
                // Fallback: try from a fixed offset (0.5s from end)
                $duration   = $mediaDuration->getDurationSeconds($localPath);
                $offset     = number_format(max(0, $duration - 0.5), 3, '.', '');
                $cmdFallback = "\"{$ffmpeg}\" -y -ss {$offset} -i \"{$localPath}\" -vframes 1 -q:v 1 \"{$framePath}\" 2>&1";
                exec($cmdFallback, $outFb, $codeFb);

                if ($codeFb !== 0 || !file_exists($framePath) || filesize($framePath) < 100) {
                    throw new \RuntimeException('FFmpeg last-frame extraction failed: ' . implode("\n", array_slice($out, -10)));
                }
            }

            Log::info("GenerateSingleSceneVideoJob: extracted last frame for scene {$this->sceneNumber}", [
                'story_id'   => $storyId,
                'frame_size' => filesize($framePath),
                'frame_path' => $framePath,
            ]);

            // Upload the frame to Fal.ai storage so the next scene can use it
            $falUrl = $fal->uploadFileToFal($framePath);

            return $falUrl;

        } finally {
            if (file_exists($framePath)) @unlink($framePath);
            @rmdir($tmpDir);
        }
    }

    private function findFfmpeg(): string
    {
        $candidates = [
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg',
            'ffmpeg',
        ];

        foreach ($candidates as $c) {
            if (str_contains($c, '/') && !file_exists($c)) continue;
            $cmd = "\"{$c}\" -version 2>&1";
            exec($cmd, $out, $code);
            if ($code === 0) return $c;
        }

        exec('which ffmpeg 2>&1', $whichOut, $whichCode);
        if ($whichCode === 0 && !empty($whichOut[0])) {
            return trim($whichOut[0]);
        }

        throw new \RuntimeException('FFmpeg not found on server. Install with: apt-get install ffmpeg');
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