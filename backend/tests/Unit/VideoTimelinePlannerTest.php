<?php

namespace Tests\Unit;

use App\Services\VideoTimelinePlanner;
use PHPUnit\Framework\TestCase;

class VideoTimelinePlannerTest extends TestCase
{
    public function test_word_count_bounds_for_sixty_to_ninety_seconds(): void
    {
        $bounds = VideoTimelinePlanner::wordCountBounds(60, 90);

        $this->assertSame(110, $bounds['min']);
        $this->assertSame(165, $bounds['max']);
    }

    public function test_scene_count_covers_ninety_second_narration(): void
    {
        // Fixed at TARGET_SCENE_COUNT (12) regardless of requested duration —
        // 12 × CLIP_MAX_SECONDS (8) = 96s, which covers the 90s validation
        // ceiling in isNarrationDurationValid() below with headroom.
        $this->assertSame(12, VideoTimelinePlanner::sceneCountForMaxDuration(90));
    }

    public function test_clip_durations_cover_narration_without_looping(): void
    {
        $durations = VideoTimelinePlanner::computeClipDurations(75.0, 12);

        $this->assertCount(12, $durations);
        $effectiveTimeline = array_sum($durations)
            - max(0, count($durations) - 1) * VideoTimelinePlanner::XFADE_SECONDS;
        $this->assertGreaterThanOrEqual(75, $effectiveTimeline);
        $this->assertContains(5, $durations);
        $this->assertContains(8, $durations);
    }

    public function test_clip_durations_reject_narration_beyond_scene_capacity(): void
    {
        // 12 scenes × 8s max = 96s capacity. A narration longer than that
        // (plus the 0.5s tolerance) must fail loudly here rather than
        // silently truncating audio during assembly.
        $this->expectException(\RuntimeException::class);
        VideoTimelinePlanner::computeClipDurations(97.0, 12);
    }

    public function test_scene_capacity_covers_the_full_valid_narration_range(): void
    {
        // Regression guard for the bug where TARGET_SCENE_COUNT (8) was
        // lower than what isNarrationDurationValid() actually allowed (90s),
        // so any narration in the 64–90s range passed validation but then
        // threw a RuntimeException in computeClipDurations() during video
        // generation. This asserts the two are consistent.
        $maxAllowedNarration = 90.0;
        $sceneCapacity = VideoTimelinePlanner::TARGET_SCENE_COUNT * VideoTimelinePlanner::CLIP_MAX_SECONDS
            - (VideoTimelinePlanner::TARGET_SCENE_COUNT - 1) * VideoTimelinePlanner::XFADE_SECONDS;
        $this->assertGreaterThanOrEqual($maxAllowedNarration, $sceneCapacity);

        // And confirm it actually plans successfully at that ceiling.
        $durations = VideoTimelinePlanner::computeClipDurations(
            $maxAllowedNarration,
            VideoTimelinePlanner::sceneCountForMaxDuration($maxAllowedNarration)
        );
        $effectiveTimeline = array_sum($durations)
            - (count($durations) - 1) * VideoTimelinePlanner::XFADE_SECONDS;
        $this->assertGreaterThanOrEqual($maxAllowedNarration, $effectiveTimeline);
    }

    public function test_short_story_word_count_is_detected(): void
    {
        $short = 'Once upon a time, a child found a magic key. They opened a door and smiled.';
        $this->assertLessThan(110, VideoTimelinePlanner::countWords($short));
    }

    public function test_long_story_word_count_meets_minimum(): void
    {
        $words = array_fill(0, 120, 'word');
        $long  = implode(' ', $words);

        $this->assertGreaterThanOrEqual(110, VideoTimelinePlanner::countWords($long));
        $this->assertGreaterThanOrEqual(60, VideoTimelinePlanner::estimateSecondsFromWords(110));
    }

    public function test_narration_duration_validation_window(): void
    {
        $this->assertTrue(VideoTimelinePlanner::isNarrationDurationValid(62.0));
        $this->assertTrue(VideoTimelinePlanner::isNarrationDurationValid(88.0));
        $this->assertFalse(VideoTimelinePlanner::isNarrationDurationValid(18.0));
    }
}
