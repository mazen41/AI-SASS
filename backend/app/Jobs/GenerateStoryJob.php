<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\AiJobLog;
use App\Models\ActivityLog;
// use App\Services\OpenAIService; // disabled: quota exceeded
use App\Services\GeminiService;
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

    public function handle(GeminiService $openAI, FalAiService $fal, ElevenLabsService $elevenLabs): void
    {
        $testMode = (bool) config('app.story_test_mode', false);
        if ($testMode) {
            Log::info('GenerateStoryJob: TEST MODE ON — only 2 scenes, 1 image, 1 video, short narration', ['story_id' => $this->story->id]);
        }
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
            $this->runStep('generate_images', function () use ($fal, $testMode) {
                $this->story->refresh();
                $scenes = $this->story->scenes ?? [];

                if (empty($scenes)) {
                    throw new \RuntimeException('No scenes returned from story generation');
                }

                // In test mode only generate 1 image to save credits
                $scenesToProcess = $testMode ? array_slice($scenes, 0, 1) : $scenes;

                foreach ($scenesToProcess as $scene) {
                    $sceneNum = $scene['scene_number'];
                    $prompt   = $scene['image_prompt'];

                    $photoUrl = $this->story->photo_url;

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
            $this->runStep('generate_videos', function () use ($fal, $testMode) {
                $this->story->refresh();
                $imageAssets = $this->story->imageAssets()->get();
                $scenes      = collect($this->story->scenes ?? [])->keyBy('scene_number');

                if ($imageAssets->isEmpty()) {
                    throw new \RuntimeException('No image assets found -- cannot generate videos');
                }

                // In test mode only generate 1 video to save credits
                $assetsToProcess = $testMode ? $imageAssets->take(1) : $imageAssets;

                foreach ($assetsToProcess as $asset) {
                    $sceneNum = $asset->scene_number;
                    $scene    = $scenes->get($sceneNum);

                    // ✅ IMPROVED: Scene-specific video prompts instead of a generic suffix.
                    // The scene description already contains camera motion instructions
                    // (added by the updated Gemini prompt), so we just enrich with
                    // Kling v2.1 quality keywords tailored to each scene's mood.
                    $sceneDescription = $scene['description'] ?? '';
                    $prompt = $sceneDescription
                        . ', photorealistic motion, lifelike facial expressions,'
                        . ' natural body movement, film quality 4K, warm cinematic lighting,'
                        . ' smooth motion blur, atmospheric depth of field';

                    Log::info("Generating video for scene {$sceneNum}", [
                        'story_id' => $this->story->id,
                        'prompt'   => $prompt,
                    ]);

                    // Fal.ai workers cannot reach localhost URLs — upload the stored image to Fal storage first
                    $imageUrlForFal = $asset->url;
                    if (!str_starts_with($imageUrlForFal, 'https://fal.media') && !str_starts_with($imageUrlForFal, 'https://storage.googleapis.com')) {
                        $disk      = config('filesystems.default', 'public');
                        $baseUrl   = rtrim(\Illuminate\Support\Facades\Storage::disk($disk)->url(''), '/');
                        $relative  = ltrim(substr($imageUrlForFal, strlen($baseUrl)), '/');
                        $localPath = \Illuminate\Support\Facades\Storage::disk($disk)->path($relative);
                        Log::info("Uploading scene image to Fal storage for video gen", ['scene' => $sceneNum]);
                        $imageUrlForFal = $fal->uploadFileToFal($localPath);
                    }

                    $videoUrl = $fal->generateVideo($imageUrlForFal, $prompt);

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
            $this->runStep('generate_narration', function () use ($elevenLabs, $testMode) {
                $this->story->refresh();

                if (!$this->story->content) {
                    throw new \RuntimeException('No story content available for narration');
                }

                $text = $this->story->content;

                // In test mode narrate only the first 2 sentences to save ElevenLabs credits
                if ($testMode) {
                    $sentences = preg_split('/(?<=[.!?])\s+/u', trim($text));
                    $text = implode(' ', array_slice($sentences, 0, 2));
                    Log::info('Test mode: trimmed narration to 2 sentences', ['story_id' => $this->story->id]);
                }

                $narrationUrl = $elevenLabs->generateNarration(
                    $text,
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

            try {
                $this->story->update([
                    'status'        => 'failed',
                    'error_message' => $this->safeError($e->getMessage()),
                ]);
            } catch (\Throwable $dbErr) {
                Log::error('Could not save error_message to story', ['db_error' => $dbErr->getMessage()]);
            }

            try {
                ActivityLog::log(
                    userId: $this->story->user_id,
                    action: 'story_generation_failed',
                    entityType: 'story',
                    entityId: $this->story->id,
                    newValues: ['error' => $this->safeError($e->getMessage())]
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
            try {
                $log->fail($this->safeError($e->getMessage()));
            } catch (\Throwable $ignored) {}
            throw $e;
        }
    }

    /**
     * Truncate an error message and strip non-BMP characters so it is always
     * safe to store in a MySQL utf8mb4 column (which supports up to U+FFFF).
     */
    private function safeError(string $message): string
    {
        $clean = mb_convert_encoding($message, 'UTF-8', 'UTF-8');
        return mb_substr($clean, 0, 500);
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
            'C:\\Users\\' . get_current_user() . '\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe',
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\tools\\ffmpeg\\bin\\ffmpeg.exe',
        ];

        foreach ($candidates as $candidate) {
            if (str_contains($candidate, '\\') && !file_exists($candidate)) {
                continue;
            }
            exec("\"{$candidate}\" -version 2>&1", $out, $code);
            if ($code === 0) {
                return $candidate;
            }
        }

        exec('where ffmpeg 2>&1', $whereOut, $whereCode);
        if ($whereCode === 0 && !empty($whereOut[0])) {
            return trim($whereOut[0]);
        }

        throw new \RuntimeException(
            'FFmpeg not found. It was just installed via winget — please restart the queue worker so the new PATH is loaded: '
            . 'php artisan queue:restart && php artisan queue:work'
        );
    }
}
