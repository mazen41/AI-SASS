<?php

namespace App\Services;

/**
 * Derives story word targets and per-scene clip lengths from narration duration.
 *
 * Architecture: Story (time-enforced) -> TTS (full text) -> Audio duration (truth) -> Video timeline
 */
class VideoTimelinePlanner
{
    public const MIN_NARRATION_SECONDS = 60;
    public const MAX_NARRATION_SECONDS = 90;
    public const TARGET_NARRATION_SECONDS = 75;
    public const WORDS_PER_MINUTE = 110;

    public static function wordCountBounds(
        int $minSeconds = self::MIN_NARRATION_SECONDS,
        int $maxSeconds = self::MAX_NARRATION_SECONDS
    ): array {
        return [
            'min' => max(60, (int) round($minSeconds * self::WORDS_PER_MINUTE / 60)),
            'max' => max(80, (int) round($maxSeconds * self::WORDS_PER_MINUTE / 60)),
        ];
    }

    /**
     * Scene count for cinematic pacing while ensuring enough 10s clip slots
     * to cover the maximum target narration length without looping.
     */
    public static function sceneCountForMaxDuration(int $maxSeconds = self::MAX_NARRATION_SECONDS): int
    {
        return max(6, min(12, (int) ceil($maxSeconds / 10)));
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
     * Kling only supports 5s or 10s clips. Pick per-scene durations so the
     * total is >= narrationSeconds (assembly trims to exact narration length).
     *
     * @return int[] Array of 5 or 10 values, one per scene
     */
    public static function computeClipDurations(float $narrationSeconds, int $sceneCount): array
    {
        if ($sceneCount <= 0) {
            throw new \InvalidArgumentException('sceneCount must be positive');
        }

        $maxPossible = $sceneCount * 10;
        if ($narrationSeconds > $maxPossible + 0.5) {
            throw new \RuntimeException(
                "Narration is {$narrationSeconds}s but only {$sceneCount} scenes were generated "
                . "(max {$maxPossible}s at 10s/clip). Regenerate story with more scenes."
            );
        }

        $durations = array_fill(0, $sceneCount, 5);
        $total     = $sceneCount * 5;
        $index     = 0;

        while ($total < $narrationSeconds && $index < $sceneCount) {
            if ($durations[$index] === 5) {
                $durations[$index] = 10;
                $total += 5;
            }
            $index++;
        }

        if ($total < $narrationSeconds) {
            throw new \RuntimeException(
                "Cannot cover {$narrationSeconds}s narration with {$sceneCount} scenes."
            );
        }

        return $durations;
    }

    public static function isNarrationDurationValid(float $seconds): bool
    {
        return $seconds >= self::MIN_NARRATION_SECONDS - 3
            && $seconds <= self::MAX_NARRATION_SECONDS + 5;
    }
}
