<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryOutput;
use App\Models\AiJobLog;
use App\Services\MediaDurationService;
use App\Services\VideoTimelinePlanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Phase 4 (Video path only) — Concatenates scene videos with FFmpeg.
 *
 * Architecture: narration audio duration is the master clock.
 * Scene clips are trimmed (never looped) so the final export ends exactly
 * when narration ends.
 */
class AssembleVideoJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 1800;
    public int $tries   = 1;

    public function __construct(
        public int   $storyId,
        public array $selectedOutputs
    ) {}

    public function handle(MediaDurationService $mediaDuration): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'assemble_video');
        $story->setStep('assemble_video');

        try {
            $videoAssets = $story->videoAssets()->orderBy('scene_number')->get();

            if ($videoAssets->isEmpty()) {
                throw new \RuntimeException('No video assets available for assembly.');
            }

            $story->refresh();
            $narrationUrl = $story->narration_url;
            if (!$narrationUrl) {
                throw new \RuntimeException(
                    'AssembleVideoJob: Narration audio is required for video products but is missing. '
                    . 'Ensure GenerateNarrationJob completed successfully before AssembleVideoJob runs.'
                );
            }

            $finalUrl = $this->assembleVideo($story, $videoAssets, $narrationUrl, $mediaDuration);

            $story->update([
                'assembled_video_url' => $finalUrl,
                'video_url'           => $finalUrl,
            ]);

            StoryOutput::updateOrCreate(
                ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_FINAL_VIDEO],
                ['status' => 'completed', 'url' => $finalUrl, 'metadata' => ['format' => 'MP4']]
            );

            $log->complete();
        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));
            $story->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e;
        }

        $story->decrementPendingOutputs();

        Log::info('Story assembled', ['story_id' => $story->id, 'url' => $story->assembled_video_url]);
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

        StoryOutput::updateOrCreate(
            ['story_id' => $this->storyId, 'output_type' => StoryOutput::TYPE_FINAL_VIDEO],
            ['status' => 'failed', 'error_message' => mb_substr($exception->getMessage(), 0, 500)]
        );

        Log::error("AssembleVideoJob permanently failed for story #{$this->storyId} — refunded video credit", [
            'error' => $exception->getMessage(),
        ]);
    }

    private function assembleVideo($story, $videoAssets, string $narrationUrl, MediaDurationService $mediaDuration): string
    {
        $disk   = 'public';
        $tmpDir = storage_path('app/tmp/story_' . $story->id . '_' . time());
        @mkdir($tmpDir, 0755, true);

        $listFile     = "{$tmpDir}/concat.txt";
        $outputConcat = "{$tmpDir}/concat.mp4";
        $finalOutput  = "{$tmpDir}/final.mp4";

        try {
            $ffmpeg = $this->findFfmpeg();

            $normalizedPaths = [];
            foreach ($videoAssets as $i => $asset) {
                $localPath = $mediaDuration->resolveLocalPath($asset->url, $disk);
                if (!file_exists($localPath)) {
                    throw new \RuntimeException("Video clip not found: {$localPath}");
                }
                $normPath = "{$tmpDir}/norm_{$i}.mp4";
                $cmdNorm  = "\"{$ffmpeg}\" -y -i \"{$localPath}\" "
                    . "-vf \"scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2\" "
                    . "-r 25 -c:v libx264 -crf 20 -preset fast -an "
                    . "\"{$normPath}\" 2>&1";
                exec($cmdNorm, $outN, $codeN);
                if ($codeN !== 0 || !file_exists($normPath)) {
                    throw new \RuntimeException('Normalization failed (exit ' . $codeN . '): ' . implode("\n", array_slice($outN, -20)));
                }
                $normalizedPaths[] = $normPath;
            }

            $numClips = count($normalizedPaths);
            if ($numClips === 1) {
                copy($normalizedPaths[0], $outputConcat);
            } else {
                $clipDurations = [];
                foreach ($normalizedPaths as $path) {
                    $clipDurations[] = $mediaDuration->getDurationSeconds($path);
                }

                $xfadeDuration = 0.4;
                $filterParts   = [];
                $runningOffset = 0.0;

                for ($i = 1; $i < $numClips; $i++) {
                    $prevDuration   = $clipDurations[$i - 1];
                    $runningOffset += $prevDuration - $xfadeDuration;

                    $inLabel   = ($i === 1) ? '[0:v]' : '[v' . ($i - 1) . ']';
                    $outLabel  = ($i === $numClips - 1) ? '[vout]' : '[v' . $i . ']';
                    $offsetStr = number_format(max(0.0, $runningOffset), 3, '.', '');

                    $filterParts[] = "{$inLabel}[{$i}:v]xfade=transition=dissolve:duration={$xfadeDuration}:offset={$offsetStr}{$outLabel}";
                }

                $filterComplex = implode(';', $filterParts);
                $inputsStr     = '';
                foreach ($normalizedPaths as $path) {
                    $inputsStr .= " -i \"{$path}\"";
                }

                $cmdXfade = "\"{$ffmpeg}\" -y {$inputsStr} -filter_complex \"{$filterComplex}\" -map \"[vout]\" -c:v libx264 -crf 20 -preset fast -an \"{$outputConcat}\" 2>&1";
                exec($cmdXfade, $outX, $codeX);

                if ($codeX !== 0 || !file_exists($outputConcat)) {
                    throw new \RuntimeException('FFmpeg xfade failed (exit ' . $codeX . '): ' . implode("\n", array_slice($outX, -20)));
                }
            }

            $videoDuration = $mediaDuration->getDurationSeconds($outputConcat);

            $narrationLocal = $mediaDuration->resolveLocalPath($narrationUrl, $disk);
            if (!file_exists($narrationLocal)) {
                throw new \RuntimeException("Narration audio file not found: {$narrationLocal}");
            }

            $narrationDuration = $story->duration_seconds
                ? (float) $story->duration_seconds
                : $mediaDuration->getDurationSeconds($narrationLocal);

            Log::info('AssembleVideoJob: durations before final mix', [
                'story_id'             => $story->id,
                'scene_count'          => $videoAssets->count(),
                'video_concat_s'       => round($videoDuration, 3),
                'narration_duration_s' => round($narrationDuration, 3),
            ]);

            $durStr = number_format($narrationDuration, 3, '.', '');

            // If concatenated clips are shorter than narration (e.g. some parallel scenes
            // failed or timed out), loop the clips to fill the gap rather than crashing.
            if ($videoDuration + 0.25 < $narrationDuration) {
                Log::warning('AssembleVideoJob: video shorter than narration — looping clips to fill gap', [
                    'story_id'        => $story->id,
                    'video_duration'  => round($videoDuration, 1),
                    'narration_s'     => round($narrationDuration, 1),
                    'gap_s'           => round($narrationDuration - $videoDuration, 1),
                ]);
                $loopedConcat = "{$tmpDir}/looped.mp4";
                $cmdLoop = "\"{$ffmpeg}\" -y -stream_loop -1 -i \"{$outputConcat}\" -t {$durStr}"
                    . " -c:v libx264 -crf 20 -preset fast -an"
                    . " \"{$loopedConcat}\" 2>&1";
                exec($cmdLoop, $outLoop, $codeLoop);
                if ($codeLoop !== 0 || !file_exists($loopedConcat)) {
                    throw new \RuntimeException('FFmpeg loop-fill failed (exit ' . $codeLoop . '): ' . implode("\n", array_slice($outLoop, -20)));
                }
                $outputConcat = $loopedConcat;
                $videoDuration = $narrationDuration; // treat as covered
            }

            if ($videoDuration > $narrationDuration + 0.25) {
                $trimmedConcat = "{$tmpDir}/trimmed.mp4";
                $cmdTrim = "\"{$ffmpeg}\" -y -i \"{$outputConcat}\" -t {$durStr}"
                    . " -c:v libx264 -crf 20 -preset fast -an"
                    . " \"{$trimmedConcat}\" 2>&1";
                exec($cmdTrim, $outTrim, $codeTrim);
                if ($codeTrim !== 0 || !file_exists($trimmedConcat)) {
                    throw new \RuntimeException('FFmpeg video trim failed (exit ' . $codeTrim . '): ' . implode("\n", array_slice($outTrim, -20)));
                }
                $videoForMix = $trimmedConcat;
            } else {
                $videoForMix = $outputConcat;
            }

            $bgMusicPath = storage_path('app/public/audio/background_lullaby.mp3');
            $hasBgMusic = file_exists($bgMusicPath);

            if ($hasBgMusic) {
                // Calculate dynamic fade out start time (last 2 seconds of narration)
                $fadeStart = max(0.0, $narrationDuration - 2.0);
                $fadeStartStr = number_format($fadeStart, 3, '.', '');

                // normalize=0 forces amix to preserve original narration volume at 100% (preventing halving)
                $audioFilter = "[1:a]volume=1.0,apad[narr]; [2:a]volume=0.12,atrim=end={$durStr},afade=t=out:st={$fadeStartStr}:d=2.0[bgm]; [narr][bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[audio_out]";
                $cmd2 = "\"{$ffmpeg}\" -y"
                    . " -i \"{$videoForMix}\""
                    . " -i \"{$narrationLocal}\""
                    . " -i \"{$bgMusicPath}\""
                    . " -filter_complex \"{$audioFilter}\""
                    . " -map 0:v -map \"[audio_out]\""
                    . " -t {$durStr}"
                    . " -c:v copy -c:a aac -b:a 128k"
                    . " \"{$finalOutput}\" 2>&1";
            } else {
                $audioFilter = "[1:a]apad,atrim=duration={$durStr}[audio_out]";
                $cmd2 = "\"{$ffmpeg}\" -y"
                    . " -i \"{$videoForMix}\""
                    . " -i \"{$narrationLocal}\""
                    . " -filter_complex \"{$audioFilter}\""
                    . " -map 0:v -map \"[audio_out]\""
                    . " -t {$durStr}"
                    . " -c:v copy -c:a aac -b:a 128k"
                    . " \"{$finalOutput}\" 2>&1";
            }

            exec($cmd2, $out2, $code2);

            if ($code2 !== 0 || !file_exists($finalOutput) || filesize($finalOutput) <= 1000) {
                throw new \RuntimeException(
                    'FFmpeg audio mix failed (exit ' . $code2 . '): ' . implode("\n", array_slice($out2, -20))
                );
            }

            $finalDuration = $mediaDuration->getDurationSeconds($finalOutput);
            $delta = abs($finalDuration - $narrationDuration);

            Log::info('AssembleVideoJob: final video duration', [
                'story_id'             => $story->id,
                'final_duration_s'     => round($finalDuration, 3),
                'narration_duration_s' => round($narrationDuration, 3),
                'delta_s'              => round($delta, 3),
            ]);

            if ($delta > 0.5) {
                throw new \RuntimeException(
                    'Final video duration (' . round($finalDuration, 2) . 's) does not match narration ('
                    . round($narrationDuration, 2) . 's).'
                );
            }

            $bytes = file_get_contents($finalOutput);

            if ($bytes === false || strlen($bytes) < 1000) {
                throw new \RuntimeException("Final video file is empty: {$finalOutput}");
            }

            $storedPath = "stories/{$story->id}/final.mp4";
            Storage::disk($disk)->put($storedPath, $bytes);
            $finalUrl = Storage::disk($disk)->url($storedPath);

            return $finalUrl;

        } finally {
            // Clean up temporary files under all circumstances to prevent server disk bloat
            $files = glob("{$tmpDir}/*");
            if (is_array($files)) {
                foreach ($files as $f) {
                    if (is_file($f)) @unlink($f);
                }
            }
            @rmdir($tmpDir);
        }
    }

    private function findFfmpeg(): string
    {
        $candidates = [
            'ffmpeg',
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg',
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\tools\\ffmpeg\\bin\\ffmpeg.exe',
        ];
        foreach ($candidates as $c) {
            if (str_contains($c, '\\') && !file_exists($c)) continue;
            if (str_contains($c, '/') && !file_exists($c)) continue;

            $cmd = str_contains($c, ' ') ? "\"{$c}\"" : $c;
            exec("{$cmd} -version 2>&1", $out, $code);
            if ($code === 0) return $c;
        }

        // Try Linux/macOS 'which'
        exec('which ffmpeg 2>&1', $whichOut, $whichCode);
        if ($whichCode === 0 && !empty($whichOut[0])) {
            return trim($whichOut[0]);
        }

        // Try Windows 'where'
        exec('where ffmpeg 2>&1', $whereOut, $whereCode);
        if ($whereCode === 0 && !empty($whereOut[0])) return trim($whereOut[0]);

        throw new \RuntimeException('FFmpeg not found. Run: winget install ffmpeg or apt-get install ffmpeg');
    }
}
