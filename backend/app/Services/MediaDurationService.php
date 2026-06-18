<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Measures real media duration via ffprobe/ffmpeg.
 * Used as the single source of truth for narration length in the video pipeline.
 */
class MediaDurationService
{
    public function getDurationSeconds(string $filePath): float
    {
        if (!file_exists($filePath)) {
            throw new \RuntimeException("Media file not found: {$filePath}");
        }

        $ffmpeg  = $this->findFfmpeg();
        $ffprobe = str_replace('ffmpeg', 'ffprobe', $ffmpeg);

        $cmd = "\"{$ffprobe}\" -v error -show_entries format=duration"
            . " -of default=noprint_wrappers=1:nokey=1 \"{$filePath}\" 2>&1";
        exec($cmd, $out, $code);

        if ($code === 0 && !empty($out[0]) && is_numeric(trim($out[0]))) {
            return (float) trim($out[0]);
        }

        $cmd2 = "\"{$ffmpeg}\" -i \"{$filePath}\" 2>&1";
        exec($cmd2, $out2);
        $text = implode("\n", $out2);

        if (preg_match('/Duration:\s*(\d+):(\d+):([\d.]+)/', $text, $m)) {
            return (float) $m[1] * 3600 + (float) $m[2] * 60 + (float) $m[3];
        }

        throw new \RuntimeException("Could not determine media duration for: {$filePath}");
    }

    public function resolveLocalPath(string $url, ?string $disk = null): string
    {
        $disk    = $disk ?? config('filesystems.default', 'public');
        $baseUrl = rtrim(Storage::disk($disk)->url(''), '/');

        if (str_starts_with($url, $baseUrl)) {
            return Storage::disk($disk)->path(ltrim(substr($url, strlen($baseUrl)), '/'));
        }

        if (!str_starts_with($url, 'http')) {
            return Storage::disk($disk)->path(ltrim($url, '/'));
        }

        throw new \RuntimeException("Cannot resolve local path for: {$url}");
    }

    private function findFfmpeg(): string
    {
        $candidates = [
            'ffmpeg',
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
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

        throw new \RuntimeException('FFmpeg not found. Install ffmpeg to measure narration duration.');
    }
}
