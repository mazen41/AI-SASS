<?php

namespace App\Services;

/**
 * Derives story word targets and per-scene clip lengths from narration duration.
 *
 * Architecture: Story (time-enforced) -> TTS (full text) -> Audio duration (truth) -> Video timeline
 *
 * Clip model note:
 *   - Wan Pro (fal-ai/wan-pro/image-to-video) supports '5' or '8' second clips.
 *     '10' is not a valid value and falls back to ~6s. Always send '8' for long clips.
 *   - Kling supports '5' or '10'.
 *   We target 12 scenes so that 12 × 8s = 96s covers any narration up to ~90s.
 */
class VideoTimelinePlanner
{
    public const MIN_NARRATION_SECONDS    = 20;
    public const MAX_NARRATION_SECONDS    = 70;
    public const TARGET_NARRATION_SECONDS = 30;
    public const WORDS_PER_MINUTE         = 110;

    /** Effective max seconds per clip for Wan Pro (used for planning). */
    public const CLIP_MAX_SECONDS = 8;

    /** Fixed target: always generate this many scenes for video. 8×8s = 64s covers longer narrations during transition. */
    public const TARGET_SCENE_COUNT = 8;

    public static function wordCountBounds(
        int $minSeconds = self::MIN_NARRATION_SECONDS,
        int $maxSeconds = self::MAX_NARRATION_SECONDS,
        string $language = 'en'
    ): array {
        // Arabic speaks MUCH slower (60 words/min vs 110 for English)
        // Adjusted down further because Arabic TTS is even slower than expected
        $wordsPerMinute = ($language === 'ar') ? 60 : self::WORDS_PER_MINUTE;
        
        return [
            'min' => max(25,  (int) round($minSeconds * $wordsPerMinute / 60)),
            'max' => max(35, (int) round($maxSeconds * $wordsPerMinute / 60)),
        ];
    }

    /**
     * Number of scenes to request from the AI / image generator.
     * Fixed at TARGET_SCENE_COUNT so that 12 × 8s = 96s always covers the
     * longest expected narration (~90s) with headroom.
     */
    public static function sceneCountForMaxDuration(int $maxSeconds = self::MAX_NARRATION_SECONDS): int
    {
        return self::TARGET_SCENE_COUNT;
    }

    public static function countWords(string $text): int
    {
        $text = trim(preg_replace('/\s+/u', ' ', $text));
        if ($text === '') {
            return 0;
        }

        return count(preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY));
    }

    /**
     * Estimate spoken duration from word count at children's narration pace.
     */
    public static function estimateSecondsFromWords(int $wordCount): float
    {
        return ($wordCount / self::WORDS_PER_MINUTE) * 60;
    }

    /**
     * Wan Pro supports 5s or 8s clips (not 10s).
     * Pick per-scene durations so the total >= narrationSeconds.
     * Assembly trims to exact narration length.
     *
     * @return int[] Array of 5 or 8 values, one per scene
     */
    public static function computeClipDurations(float $narrationSeconds, int $sceneCount): array
    {
        if ($sceneCount <= 0) {
            throw new \InvalidArgumentException('sceneCount must be positive');
        }

        $maxPossible = $sceneCount * self::CLIP_MAX_SECONDS;
        if ($narrationSeconds > $maxPossible + 0.5) {
            throw new \RuntimeException(
                "Narration is {$narrationSeconds}s but only {$sceneCount} scenes were generated "
                . "(max {$maxPossible}s at " . self::CLIP_MAX_SECONDS . "s/clip). Need more scenes."
            );
        }

        // Start all clips at 5s, then upgrade to 8s until total >= narrationSeconds
        $durations = array_fill(0, $sceneCount, 5);
        $total     = $sceneCount * 5;
        $index     = 0;

        while ($total < $narrationSeconds && $index < $sceneCount) {
            if ($durations[$index] === 5) {
                $durations[$index] = self::CLIP_MAX_SECONDS;
                $total += self::CLIP_MAX_SECONDS - 5;
            }
            $index++;
        }

        if ($total < $narrationSeconds) {
            throw new \RuntimeException(
                "Cannot cover {$narrationSeconds}s narration with {$sceneCount} scenes at "
                . self::CLIP_MAX_SECONDS . "s max/clip."
            );
        }

        return $durations;
    }

    public static function isNarrationDurationValid(float $seconds, string $language = 'en'): bool
    {
        // Arabic TTS is very slow, allow much wider range
        $maxSeconds = ($language === 'ar') ? 70 : self::MAX_NARRATION_SECONDS + 5;
        return $seconds >= 20 && $seconds <= $maxSeconds;
    }
}
