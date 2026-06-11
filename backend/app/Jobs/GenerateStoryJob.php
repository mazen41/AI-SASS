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

    public int $timeout = 3600;
    public int $tries   = 1;

    public function __construct(public Story $story) {}

    public function handle(OpenAIService $openAI, FalAiService $fal, ElevenLabsService $elevenLabs): void
    {
        try {
            // ── Phase 2a: Generate story text ──────────────────────────────
            $this->runStep('generate_story', function () use ($openAI) {
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

            // ── Phase 2b: Generate images ──────────────────────────────────
            $this->runStep('generate_images', function () use ($fal) {
                $scenes = $this->story->fresh()->scenes ?? [];
                foreach ($scenes as $scene) {
                    $imageUrl = $fal->generateImage(
                        $scene['image_prompt'],
                        $this->story->photo_url
                    );

                    $stored = $fal->downloadAndStore(
                        $imageUrl,
                        "stories/{$this->story->id}/scene_{$scene['scene_number']}.jpg"
                    );

                    StoryAsset::updateOrCreate(
                        ['story_id' => $this->story->id, 'scene_number' => $scene['scene_number'], 'asset_type' => 'image'],
                        ['url' => $stored, 'prompt' => $scene['image_prompt']]
                    );
                }
            });

            // ── Phase 3: Generate videos ───────────────────────────────────
            $this->runStep('generate_videos', function () use ($fal) {
                $imageAssets = $this->story->imageAssets()->get();
                $scenes      = collect($this->story->scenes)->keyBy('scene_number');

                foreach ($imageAssets as $asset) {
                    $scene    = $scenes->get($asset->scene_number);
                    $prompt   = $scene['description'] ?? 'gentle camera movement, children\'s story scene';

                    $videoUrl = $fal->generateVideo($asset->url, $prompt);
                    $stored   = $fal->downloadAndStore(
                        $videoUrl,
                        "stories/{$this->story->id}/scene_{$asset->scene_number}.mp4"
                    );

                    StoryAsset::updateOrCreate(
                        ['story_id' => $this->story->id, 'scene_number' => $asset->scene_number, 'asset_type' => 'video'],
                        ['url' => $stored, 'prompt' => $prompt]
                    );
                }
            });

            // ── Phase 4a: Generate narration ───────────────────────────────
            $this->runStep('generate_narration', function () use ($elevenLabs) {
                $narrationUrl = $elevenLabs->generateNarration(
                    $this->story->content,
                    $this->story->language,
                    $this->story->id
                );
                $this->story->update(['narration_url' => $narrationUrl]);
            });

            // ── Phase 4b: Assemble final video ─────────────────────────────
            $this->runStep('assemble_video', function () {
                $videoAssets  = $this->story->videoAssets()->get();
                $narrationUrl = $this->story->fresh()->narration_url;

                $finalUrl = $this->assembleVideo($videoAssets, $narrationUrl);
                $this->story->update([
                    'assembled_video_url' => $finalUrl,
                    'video_url'           => $finalUrl,
                    'status'              => 'completed',
                    'processing_step'     => null,
                ]);
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
            Log::error('Story generation failed', ['story_id' => $this->story->id, 'error' => $e->getMessage()]);
            $this->story->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            ActivityLog::log(
                userId: $this->story->user_id,
                action: 'story_generation_failed',
                entityType: 'story',
                entityId: $this->story->id,
                newValues: ['error' => $e->getMessage()]
            );
        }
    }

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
        // Build ffmpeg concat list
        $disk      = config('filesystems.default');
        $tmpDir    = storage_path("app/tmp/story_{$this->story->id}");
        @mkdir($tmpDir, 0755, true);

        $listFile = "{$tmpDir}/concat.txt";
        $lines    = [];

        foreach ($videoAssets as $asset) {
            // Get local path
            $storagePath = str_replace(Storage::disk($disk)->url(''), '', $asset->url);
            $storagePath = ltrim($storagePath, '/');
            $localPath   = Storage::disk($disk)->path($storagePath);
            $lines[]     = "file '" . addslashes($localPath) . "'";
        }

        file_put_contents($listFile, implode("\n", $lines));

        $outputConcat = "{$tmpDir}/concat.mp4";
        $finalOutput  = "{$tmpDir}/final.mp4";

        // Concatenate videos
        exec("ffmpeg -y -f concat -safe 0 -i \"{$listFile}\" -c copy \"{$outputConcat}\" 2>&1", $out, $code);
        if ($code !== 0 || !file_exists($outputConcat)) {
            throw new \RuntimeException('FFmpeg concat failed: ' . implode("\n", $out));
        }

        // Mix with narration if available
        if ($narrationUrl) {
            $narrationStoragePath = str_replace(Storage::disk($disk)->url(''), '', $narrationUrl);
            $narrationStoragePath = ltrim($narrationStoragePath, '/');
            $narrationLocal       = Storage::disk($disk)->path($narrationStoragePath);

            exec("ffmpeg -y -i \"{$outputConcat}\" -i \"{$narrationLocal}\" -c:v copy -c:a aac -shortest \"{$finalOutput}\" 2>&1", $out2, $code2);

            if ($code2 !== 0 || !file_exists($finalOutput)) {
                // Narration failed — use concat without audio
                $finalOutput = $outputConcat;
            }
        } else {
            $finalOutput = $outputConcat;
        }

        // Store final video
        $storedPath = "stories/{$this->story->id}/final.mp4";
        Storage::disk($disk)->put($storedPath, file_get_contents($finalOutput));

        // Clean up tmp
        @unlink($listFile);
        @unlink("{$tmpDir}/concat.mp4");
        @unlink("{$tmpDir}/final.mp4");
        @rmdir($tmpDir);

        return Storage::disk($disk)->url($storedPath);
    }
}
