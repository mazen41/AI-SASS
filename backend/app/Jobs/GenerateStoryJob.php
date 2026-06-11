<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Models\ActivityLog;
use App\Services\OpenAIService;
use App\Services\FalAiService;
use App\Services\ElevenLabsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateStoryJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 7200;  // 2 hours -- video gen is slow
    public int $tries   = 1;

    public function __construct(public Story $story) {}

    public function handle(OpenAIService $openAI, FalAiService $fal, ElevenLabsService $elevenLabs): void
    {
        try {
            // Phase 1: Generate story text and scene breakdown
            $this->runStep('generate_story', function () use ($openAI) {
                $this->story->refresh();

                $data = $openAI->generateStory([
                    'child_name'    => $this->story->child_name,
                    'child_age'     => $this->story->child_age,
                    'theme'         => $this->story->theme,
                    'language'      => $this->story->language,
                    'custom_prompt' => $this->story->custom_prompt,
                ]);

                $this->story->update([
                    'title'   => $data['title'],
                    'content' => $data['story_text'],
                    'scenes'  => $data['scenes'],
                ]);
            });

            // Phase 2: Generate scene images
            $this->runStep('generate_images', function () use ($fal) {
                $this->story->refresh();
                $scenes = $this->story->scenes ?? [];

                if (empty($scenes)) {
                    throw new \RuntimeException('No scenes returned from story generation');
                }

                foreach ($scenes as $scene) {
                    $sceneNum = $scene['scene_number'];
                    $prompt   = $scene['image_prompt'];

                    // Only pass photo_url if it's publicly accessible
                    $photoUrl = $this->story->photo_url;
                    if ($photoUrl && !str_starts_with($photoUrl, 'http')) {
                        $photoUrl = null;
                    }

                    Log::info("Generating image for scene {$sceneNum}", ['story_id' => $this->story->id]);

                    $imageUrl = $fal->generateImage($prompt, $photoUrl);

                    $storedUrl = $fal->downloadAndStore(
                        $imageUrl,
                        "stories/{$this->story->id}/scene_{$sceneNum}.jpg"
                    );

                    StoryAsset::updateOrCreate(
                        [
                            'story_id'     => $this->story->id,
                            'scene_number' => $sceneNum,
                            'asset_type'   => 'image',
                        ],
                        ['url' => $storedUrl, 'prompt' => $prompt]
                    );

                    Log::info("Image stored for scene {$sceneNum}", ['url' => $storedUrl]);
                }
            });

            // Phase 3: Generate scene videos
            $this->runStep('generate_videos', function () use ($fal) {
                $this->story->refresh();
                $imageAssets = $this->story->imageAssets()->get();
                $scenes      = collect($this->story->scenes ?? [])->keyBy('scene_number');

                if ($imageAssets->isEmpty()) {
                    throw new \RuntimeException('No image assets found -- cannot generate videos');
                }

                foreach ($imageAssets as $asset) {
                    $sceneNum = $asset->scene_number;
                    $scene    = $scenes->get($sceneNum);
                    $prompt   = ($scene['description'] ?? '') . " gentle camera movement, children's story scene, smooth animation";

                    Log::info("Generating video for scene {$sceneNum}", ['story_id' => $this->story->id]);

                    $videoUrl = $fal->generateVideo($asset->url, $prompt);

                    $storedUrl = $fal->downloadAndStore(
                        $videoUrl,
                        "stories/{$this->story->id}/scene_{$sceneNum}.mp4"
                    );

                    StoryAsset::updateOrCreate(
                        [
                            'story_id'     => $this->story->id,
                            'scene_number' => $sceneNum,
                            'asset_type'   => 'video',
                        ],
                        ['url' => $storedUrl, 'prompt' => $prompt]
                    );

                    Log::info("Video stored for scene {$sceneNum}", ['url' => $storedUrl]);
                }
            });

            // Phase 4: Generate narration
            $this->runStep('generate_narration', function () use ($elevenLabs) {
                $this->story->refresh();

                if (!$this->story->content) {
                    throw new \RuntimeException('No story content available for narration');
                }

                $narrationUrl = $elevenLabs->generateNarration(
                    $this->story->content,
                    $this->story->language ?? 'en',
                    $this->story->id
                );

                $this->story->update(['narration_url' => $narrationUrl]);
                Log::info('Narration generated', ['story_id' => $this->story->id]);
            });

            // Phase 5: Assemble final video
            $this->runStep('assemble_video', function () {
                $this->story->refresh();
                $videoAssets  = $this->story->videoAssets()->orderBy('scene_number')->get();
                $narrationUrl = $this->story->narration_url;

                if ($videoAssets->isEmpty()) {
                    throw new \RuntimeException('No video assets available to assemble');
                }

                $finalUrl = $this->assembleVideo($videoAssets, $narrationUrl);

                $this->story->update([
                    'assembled_video_url' => $finalUrl,
                    'video_url'           => $finalUrl,
                    'status'              => 'completed',
                    'processing_step'     => null,
                ]);

                Log::info('Story completed', ['story_id' => $this->story->id, 'final_url' => $finalUrl]);
            });

            ActivityLog::log(
                userId: $this->story->user_id,
                action: 'story_generated',
                entityType: 'story',
                entityId: $this->story->id,
                oldValues: ['status' => 'processing'],
                newValues: ['status' => 'completed']
            );

        } catch (\Throwable $e) {
            Log::error('Story generation failed', [
                'story_id' => $this->story->id,
                'step'     => $this->story->processing_step,
                'error'    => $e->getMessage(),
                'trace'    => substr($e->getTraceAsString(), 0, 2000),
            ]);

            $this->story->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            try {
                ActivityLog::log(
                    userId: $this->story->user_id,
                    action: 'story_generation_failed',
                    entityType: 'story',
                    entityId: $this->story->id,
                    newValues: ['error' => $e->getMessage()]
                );
            } catch (\Throwable $ignored) {}
        }
    }

    // ------------------------------------------------------------------------

    private function runStep(string $step, callable $fn): void
    {
        $this->story->setStep($step);
        $log = AiJobLog::start($this->story->id, $step);

        try {
            $fn();
            $log->complete();
        } catch (\Throwable $e) {
            $log->fail($e->getMessage());
            throw $e;
        }
    }

    private function assembleVideo($videoAssets, ?string $narrationUrl): string
    {
        $disk   = config('filesystems.default', 'public');
        $tmpDir = storage_path('app/tmp/story_' . $this->story->id . '_' . time());

        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }

        // Build ffmpeg concat list
        $listFile = "{$tmpDir}/concat.txt";
        $lines    = [];

        foreach ($videoAssets as $asset) {
            $localPath = $this->resolveLocalPath($asset->url, $disk);

            if (!file_exists($localPath)) {
                throw new \RuntimeException(
                    "Video clip not found on disk: {$localPath} (stored url: {$asset->url})"
                );
            }

            // Escape single quotes for ffmpeg concat format
            $escaped = str_replace("'", "'\\''", $localPath);
            $lines[] = "file '{$escaped}'";
        }

        file_put_contents($listFile, implode("\n", $lines) . "\n");

        $ffmpeg       = $this->findFfmpeg();
        $outputConcat = "{$tmpDir}/concat.mp4";
        $finalOutput  = "{$tmpDir}/final.mp4";

        // Step 1: Concatenate video clips (re-encode to ensure compatibility)
        $cmd1 = "\"{$ffmpeg}\" -y -f concat -safe 0 -i \"{$listFile}\" -c:v libx264 -crf 23 -preset fast -an \"{$outputConcat}\" 2>&1";
        exec($cmd1, $out1, $code1);

        if ($code1 !== 0 || !file_exists($outputConcat)) {
            throw new \RuntimeException(
                'FFmpeg concat failed (exit ' . $code1 . '): ' . implode("\n", array_slice($out1, -20))
            );
        }

        // Step 2: Mix with narration audio
        $useFinalWithAudio = false;
        if ($narrationUrl) {
            try {
                $narrationLocal = $this->resolveLocalPath($narrationUrl, $disk);

                if (file_exists($narrationLocal)) {
                    $cmd2 = "\"{$ffmpeg}\" -y -i \"{$outputConcat}\" -i \"{$narrationLocal}\" "
                          . "-c:v copy -c:a aac -b:a 128k -shortest \"{$finalOutput}\" 2>&1";

                    exec($cmd2, $out2, $code2);

                    if ($code2 === 0 && file_exists($finalOutput) && filesize($finalOutput) > 1000) {
                        $useFinalWithAudio = true;
                    } else {
                        Log::warning('FFmpeg audio mix failed, falling back to video-only', [
                            'exit' => $code2,
                            'out'  => implode("\n", array_slice($out2, -10)),
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Narration resolve failed: ' . $e->getMessage());
            }
        }

        $sourceFile = $useFinalWithAudio ? $finalOutput : $outputConcat;

        // Step 3: Store in permanent storage
        $storedPath = "stories/{$this->story->id}/final.mp4";
        $bytes      = file_get_contents($sourceFile);

        if ($bytes === false || strlen($bytes) < 1000) {
            throw new \RuntimeException("Final video file is empty or unreadable: {$sourceFile}");
        }

        Storage::disk($disk)->put($storedPath, $bytes);
        $finalUrl = Storage::disk($disk)->url($storedPath);

        // Cleanup temp files
        foreach ([$listFile, $outputConcat, $finalOutput] as $f) {
            if (file_exists($f)) @unlink($f);
        }
        @rmdir($tmpDir);

        return $finalUrl;
    }

    /**
     * Convert a stored URL back to an absolute local file path.
     */
    private function resolveLocalPath(string $url, string $disk): string
    {
        $baseUrl = rtrim(Storage::disk($disk)->url(''), '/');

        if (str_starts_with($url, $baseUrl)) {
            $relative = ltrim(substr($url, strlen($baseUrl)), '/');
            return Storage::disk($disk)->path($relative);
        }

        // Already a relative path
        if (!str_starts_with($url, 'http')) {
            return Storage::disk($disk)->path(ltrim($url, '/'));
        }

        throw new \RuntimeException("Cannot resolve local path for URL: {$url}");
    }

    private function findFfmpeg(): string
    {
        $candidates = [
            'ffmpeg',
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\tools\\ffmpeg\\bin\\ffmpeg.exe',
        ];

        foreach ($candidates as $candidate) {
            exec("\"{$candidate}\" -version 2>&1", $out, $code);
            if ($code === 0) {
                return $candidate;
            }
        }

        // Try system where
        exec('where ffmpeg 2>&1', $whereOut, $whereCode);
        if ($whereCode === 0 && !empty($whereOut[0])) {
            return trim($whereOut[0]);
        }

        throw new \RuntimeException(
            'FFmpeg not found in PATH or common locations. '
            . 'Download from https://ffmpeg.org/download.html and add to PATH, '
            . 'or install via: winget install ffmpeg'
        );
    }
}
