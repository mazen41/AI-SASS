<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\StoryOutput;
use App\Models\AiJobLog;
use App\Services\ElevenLabsService;
use App\Services\MediaDurationService;
use App\Services\VideoTimelinePlanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Narration — Parallel job, no image dependency.
 * Dispatched directly from GenerateStoryTextJob when narration_audio is selected.
 *
 * After TTS, measures the real audio duration with ffprobe and stores it on
 * $story->duration_seconds — the single source of truth for video assembly.
 */
class GenerateNarrationJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;
    public int $tries   = 3;
    public array $backoff = [30, 60, 120];

    public function __construct(public int $storyId) {}

    public function handle(ElevenLabsService $elevenLabs, MediaDurationService $mediaDuration): void
    {
        $story = Story::findOrFail($this->storyId);
        $log   = AiJobLog::start($story->id, 'generate_narration');
        $story->setStep('generate_narration');
        $testMode = (bool) config('app.story_test_mode', false);

        try {
            if (!$story->content) {
                throw new \RuntimeException('No story content available for narration.');
            }

            $text = trim($story->content);
            $wordCount = VideoTimelinePlanner::countWords($text);

            Log::info('GenerateNarrationJob: starting TTS', [
                'story_id'   => $story->id,
                'word_count' => $wordCount,
                'char_count' => mb_strlen($text),
                'test_mode'  => $testMode,
            ]);

            if ($testMode) {
                $sentences = preg_split('/(?<=[.!?])\s+/u', $text);
                $text = implode(' ', array_slice($sentences, 0, 2));
                Log::warning('GenerateNarrationJob: STORY_TEST_MODE truncating narration to 2 sentences');
            }

            $narrationUrl = $elevenLabs->generateNarration($text, $story->language ?? 'en', $story->id);

            $narrationLocal = $mediaDuration->resolveLocalPath($narrationUrl);
            $narrationDuration = $mediaDuration->getDurationSeconds($narrationLocal);

            if (!$testMode && !VideoTimelinePlanner::isNarrationDurationValid($narrationDuration)) {
                throw new \RuntimeException(
                    'Narration audio is ' . round($narrationDuration, 1) . 's but must be '
                    . VideoTimelinePlanner::MIN_NARRATION_SECONDS . '-'
                    . VideoTimelinePlanner::MAX_NARRATION_SECONDS . 's. '
                    . "Story had {$wordCount} words — regenerate story text with more content."
                );
            }

            $story->update([
                'narration_url'      => $narrationUrl,
                'duration_seconds'   => (int) round($narrationDuration),
            ]);

            StoryOutput::updateOrCreate(
                ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_NARRATION_AUDIO],
                [
                    'status'   => 'completed',
                    'url'      => $narrationUrl,
                    'metadata' => [
                        'format'            => 'audio/mpeg',
                        'duration_seconds'  => round($narrationDuration, 3),
                        'word_count'        => $wordCount,
                    ],
                ]
            );

            $log->complete();
            Log::info('Narration generated', [
                'story_id'           => $story->id,
                'duration_seconds'   => round($narrationDuration, 3),
                'word_count'         => $wordCount,
            ]);
        } catch (Throwable $e) {
            $log->fail(mb_substr($e->getMessage(), 0, 500));

            $selected = $story->selected_outputs ?? [];
            if (in_array('narration_audio', $selected)) {
                StoryOutput::updateOrCreate(
                    ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_NARRATION_AUDIO],
                    ['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]
                );
            }
            if (in_array('video', $selected)) {
                StoryOutput::updateOrCreate(
                    ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_FINAL_VIDEO],
                    ['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]
                );
            }

            throw $e;
        }

        $selected = $story->selected_outputs ?? [];
        if (in_array('narration_audio', $selected)) {
            $story->decrementPendingOutputs();
        }

        if (in_array('video', $selected)) {
            GenerateImagesJob::dispatch($story->id, $selected);
        }
    }

    public function failed(Throwable $exception): void
    {
        $story = Story::find($this->storyId);

        if ($story) {
            $user = $story->user;
            $selected = $story->selected_outputs ?? [];
            if (in_array('narration_audio', $selected)) {
                if ($user) {
                    $user->refundProductByOutputType('narration_audio', $story->id);
                }
                $story->decrementPendingOutputs();
            } elseif (in_array('video', $selected)) {
                if ($user) {
                    $user->refundProductByOutputType('video', $story->id);
                }
                $story->decrementPendingOutputs();
            }
        }

        Log::error("GenerateNarrationJob permanently failed for story #{$this->storyId}", [
            'error' => $exception->getMessage(),
        ]);
    }
}
