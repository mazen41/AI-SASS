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
        $disk   = config('filesystems.default', 'public');
        $tmpDir = storage_path('app/tmp/story_' . $story->id . '_' . time());
        @mkdir($tmpDir, 0755, true);

        $ffmpeg = $this->findFfmpeg();

        $listFile = "{$tmpDir}/concat.txt";
        $lines    = [];

        foreach ($videoAssets as $asset) {
            $localPath = $mediaDuration->resolveLocalPath($asset->url, $disk);
            if (!file_exists($localPath)) {
                throw new \RuntimeException("Video clip not found: {$localPath}");
            }
            $escaped = str_replace("'", "'\\''", $localPath);
            $lines[] = "file '{$escaped}'";
        }

        file_put_contents($listFile, implode("\n", $lines) . "\n");

        $outputConcat = "{$tmpDir}/concat.mp4";
        $finalOutput  = "{$tmpDir}/final.mp4";

        $cmd1 = "\"{$ffmpeg}\" -y -f concat -safe 0 -i \"{$listFile}\" -c:v libx264 -crf 23 -preset fast -an \"{$outputConcat}\" 2>&1";
        exec($cmd1, $out1, $code1);

        if ($code1 !== 0 || !file_exists($outputConcat)) {
            throw new \RuntimeException('FFmpeg concat failed (exit ' . $code1 . '): ' . implode("\n", array_slice($out1, -20)));
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

        if ($videoDuration + 0.25 < $narrationDuration) {
            throw new \RuntimeException(
                'Concatenated scene video (' . round($videoDuration, 1) . 's) is shorter than narration ('
                . round($narrationDuration, 1) . 's). Scene clips must be planned from measured narration duration.'
            );
        }

        $durStr = number_format($narrationDuration, 3, '.', '');

        if ($videoDuration > $narrationDuration + 0.25) {
            $trimmedConcat = "{$tmpDir}/trimmed.mp4";
            $cmdTrim = "\"{$ffmpeg}\" -y -i \"{$outputConcat}\" -t {$durStr}"
                . " -c:v libx264 -crf 23 -preset fast -an"
                . " \"{$trimmedConcat}\" 2>&1";
            exec($cmdTrim, $outTrim, $codeTrim);
            if ($codeTrim !== 0 || !file_exists($trimmedConcat)) {
                throw new \RuntimeException('FFmpeg video trim failed (exit ' . $codeTrim . '): ' . implode("\n", array_slice($outTrim, -20)));
            }
            $videoForMix = $trimmedConcat;
        } else {
            $videoForMix = $outputConcat;
        }

        $audioFilter = "[1:a]apad,atrim=duration={$durStr}[audio_out]";

        $cmd2 = "\"{$ffmpeg}\" -y"
            . " -i \"{$videoForMix}\""
            . " -i \"{$narrationLocal}\""
            . " -filter_complex \"{$audioFilter}\""
            . " -map 0:v -map \"[audio_out]\""
            . " -t {$durStr}"
            . " -c:v copy -c:a aac -b:a 128k"
            . " \"{$finalOutput}\" 2>&1";

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

        foreach ([$listFile, $outputConcat, $finalOutput] as $f) {
            if ($f && file_exists($f)) @unlink($f);
        }
        @rmdir($tmpDir);

        return $finalUrl;
    }

    private function findFfmpeg(): string
    {
        $candidates = [
            'ffmpeg',
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\tools\\ffmpeg\\bin\\ffmpeg.exe',
        ];
        foreach ($candidates as $c) {
            if (str_contains($c, '\\') && !file_exists($c)) continue;
            exec("\"{$c}\" -version 2>&1", $out, $code);
            if ($code === 0) return $c;
        }
        exec('where ffmpeg 2>&1', $whereOut, $whereCode);
        if ($whereCode === 0 && !empty($whereOut[0])) return trim($whereOut[0]);
        throw new \RuntimeException('FFmpeg not found. Run: winget install ffmpeg');
    }
}
