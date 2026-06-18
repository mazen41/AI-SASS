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
        $this->assertSame(9, VideoTimelinePlanner::sceneCountForMaxDuration(90));
    }

    public function test_clip_durations_cover_narration_without_looping(): void
    {
        $durations = VideoTimelinePlanner::computeClipDurations(75.0, 9);

        $this->assertCount(9, $durations);
        $this->assertGreaterThanOrEqual(75, array_sum($durations));
        $this->assertContains(5, $durations);
        $this->assertContains(10, $durations);
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
