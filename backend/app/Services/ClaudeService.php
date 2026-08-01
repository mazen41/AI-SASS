<?php

namespace App\Services;

use App\Services\Contracts\StoryTextGeneratorInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ClaudeService — alternative provider for story/text generation.
 *
 * Implements the same StoryTextGeneratorInterface as GeminiService, so the
 * active provider can be switched via AI_TEXT_PROVIDER in .env without any
 * code changes. See AppServiceProvider::register().
 *
 * Image and video generation (FalAiService) are NOT touched.
 * Narration audio (ElevenLabsService) is NOT touched.
 */
class ClaudeService implements StoryTextGeneratorInterface
{
    private string $apiKey;
    private string $model;
    private string $apiVersion;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey     = (string) config('services.claude.key', '');
        $this->model      = config('services.claude.model', 'claude-sonnet-4-5');
        $this->apiVersion = config('services.claude.api_version', '2023-06-01');
        $this->baseUrl    = 'https://api.anthropic.com/v1/messages';
    }

    // ── Public API (same signatures as GeminiService) ────────────────────────

    public function generateStory(array $params): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('ANTHROPIC_API_KEY is not configured.');
        }

        $childName      = $params['child_name']      ?? 'the hero';
        $childAge       = $params['child_age']        ?? 6;
        $theme          = $params['theme']            ?? 'adventure';
        $language       = $params['language']         ?? 'en';
        $customPrompt   = $params['custom_prompt']    ?? null;
        $minDuration    = (int) ($params['min_duration_seconds']    ?? VideoTimelinePlanner::MIN_NARRATION_SECONDS);
        $maxDuration    = (int) ($params['max_duration_seconds']    ?? VideoTimelinePlanner::MAX_NARRATION_SECONDS);
        $targetDuration = (int) ($params['target_duration_seconds'] ?? VideoTimelinePlanner::TARGET_NARRATION_SECONDS);

        $minDuration    = max(VideoTimelinePlanner::MIN_NARRATION_SECONDS, min($minDuration, $maxDuration));
        $maxDuration    = max($minDuration, min($maxDuration, VideoTimelinePlanner::MAX_NARRATION_SECONDS));
        $targetDuration = max($minDuration, min($targetDuration, $maxDuration));

        $wordBounds = VideoTimelinePlanner::wordCountBounds($minDuration, $maxDuration);
        $minWords   = $wordBounds['min'];
        $maxWords   = $wordBounds['max'];
        $sceneCount = VideoTimelinePlanner::sceneCountForMaxDuration($maxDuration);

        $langInstruction = $language === 'ar'
            ? 'Write entirely in Arabic.'
            : 'Write in English.';

        $customPart = $customPrompt
            ? "The parent's special idea: \"{$customPrompt}\". Incorporate this."
            : '';

        $faceDesc = $childName
            ? "the same exact child protagonist named {$childName}, with identical facial features, identical hairstyle, identical clothing, identical eye color, and the same age appearance in every scene"
            : 'the same exact child protagonist with identical facial features, hairstyle, clothing, eye color, and age appearance in every scene';

        $lastError = null;

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                $prompt = $this->buildStoryPrompt(
                    $childName, $childAge, $theme, $customPart,
                    $langInstruction, $faceDesc, $sceneCount,
                    $minWords, $maxWords, $minDuration, $maxDuration,
                    $targetDuration, $attempt
                );

                $data      = $this->callClaude($prompt);
                $wordCount = VideoTimelinePlanner::countWords($data['story_text'] ?? '');

                if ($wordCount < $minWords) {
                    Log::warning('ClaudeService: story too short, retrying', [
                        'attempt'    => $attempt,
                        'word_count' => $wordCount,
                        'min_words'  => $minWords,
                    ]);

                    if ($attempt < 3) continue;

                    $data['story_text'] = $this->expandStoryText(
                        $data['story_text'], $minWords, $maxWords,
                        $minDuration, $maxDuration, $langInstruction
                    );
                    $wordCount = VideoTimelinePlanner::countWords($data['story_text']);
                }

                if ($wordCount < $minWords) {
                    throw new \RuntimeException(
                        "Story text is too short for narration ({$wordCount} words, need at least {$minWords} "
                        . "for {$minDuration}-{$maxDuration}s audio)."
                    );
                }

                Log::info('ClaudeService: story generated', [
                    'word_count'              => $wordCount,
                    'estimated_duration_s'    => round(VideoTimelinePlanner::estimateSecondsFromWords($wordCount), 1),
                    'scene_count'             => $sceneCount,
                    'target_duration_range_s' => "{$minDuration}-{$maxDuration}",
                ]);

                $data['scene_count']       = $sceneCount;
                $data['word_count']        = $wordCount;
                $data['min_duration_s']    = $minDuration;
                $data['max_duration_s']    = $maxDuration;
                $data['target_duration_s'] = $targetDuration;

                return $this->normalizeSceneArchitecture($data, $sceneCount);

            } catch (\RuntimeException $e) {
                $lastError = $e;
                $body = $e->getMessage();
                // Retry on overload/rate-limit, throw immediately on other errors
                if (!str_contains($body, '529') && !str_contains($body, '429')
                    && !str_contains($body, 'overloaded') && !str_contains($body, 'rate_limit')) {
                    throw $e;
                }
                Log::warning("ClaudeService: API unavailable (attempt {$attempt}), retrying", [
                    'error' => substr($body, 0, 200),
                ]);
                sleep(min(5 * $attempt, 15));
            }
        }

        throw new \RuntimeException('ClaudeService: all attempts failed. Last error: ' . $lastError?->getMessage());
    }

    public function generateStorybookPages(array $params): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('ANTHROPIC_API_KEY is not configured.');
        }

        $title     = $params['title']      ?? 'Untitled Story';
        $storyText = $params['story_text'] ?? '';
        $scenes    = $params['scenes']     ?? [];
        $childName = $params['child_name'] ?? 'the hero';
        $theme     = $params['theme']      ?? 'adventure';
        $language  = $params['language']   ?? 'en';
        
        // Respect TEST_IMAGE_COUNT for testing, otherwise use default range
        $testImageCount = (int)env('TEST_IMAGE_COUNT', 0);
        if ($testImageCount > 0) {
            $pageCount = $testImageCount;
        } else {
            $pageCount = max(15, min(20, (int) ($params['page_count'] ?? 16)));
        }

        $langInstruction = $language === 'ar'
            ? 'Write all "title", "content", and "dialogue" text fields entirely in Arabic.'
            : 'Write in English.';

        $scenesJson = json_encode($scenes, JSON_UNESCAPED_UNICODE);
        $faceDesc   = "the same exact child protagonist named {$childName}, with identical facial features, "
            . "identical hairstyle, identical clothing, identical eye color, and the same age appearance on every page";

        $prompt = $this->buildStorybookPrompt(
            $title, $theme, $storyText, $scenesJson,
            $langInstruction, $faceDesc, $childName, $pageCount
        );

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                $data = $this->callClaude($prompt);
                return $this->normalizePageArchitecture($data, $pageCount);
            } catch (\RuntimeException $e) {
                $body = $e->getMessage();
                if (!str_contains($body, '529') && !str_contains($body, '429')
                    && !str_contains($body, 'overloaded') && !str_contains($body, 'rate_limit')) {
                    throw $e;
                }
                Log::warning("ClaudeService: storybook pages attempt {$attempt} failed, retrying", [
                    'error' => substr($body, 0, 200),
                ]);
                sleep(min(5 * $attempt, 15));
            }
        }

        throw new \RuntimeException('ClaudeService: generateStorybookPages failed after 3 attempts.');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function callClaude(string $prompt): array
    {
        $response = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => $this->apiVersion,
            'Content-Type'      => 'application/json',
        ])->timeout(120)->post($this->baseUrl, [
            'model'      => $this->model,
            'max_tokens' => 16000,
            'messages'   => [
                [
                    'role'    => 'user',
                    'content' => $prompt,
                ],
            ],
        ]);

        if (!$response->successful()) {
            Log::error('ClaudeService: API error', [
                'status' => $response->status(),
                'body'   => substr($response->body(), 0, 500),
            ]);
            throw new \RuntimeException('Claude API request failed (' . $response->status() . '): ' . $response->body());
        }

        $text = $response->json('content.0.text');

        if (!$text) {
            Log::error('ClaudeService: empty response', ['body' => substr($response->body(), 0, 500)]);
            throw new \RuntimeException('Claude returned an empty response');
        }

        return $this->parseJson($text);
    }

    private function parseJson(string $text): array
    {
        // Strip markdown code fences if Claude wraps in them
        $text = preg_replace('/^```json\s*/i', '', trim($text));
        $text = preg_replace('/^```\s*/i',     '', $text);
        $text = preg_replace('/```\s*$/i',     '', $text);
        $text = trim($text);

        // Strip control characters (common with Arabic/RTL text)
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        $data = json_decode($text, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

        if (json_last_error() !== JSON_ERROR_NONE) {
            if (preg_match('/(\{.*\})/su', $text, $m)) {
                $data = json_decode($m[1], true, 512, JSON_INVALID_UTF8_SUBSTITUTE);
            }
        }

        if (json_last_error() !== JSON_ERROR_NONE || !$data) {
            Log::error('ClaudeService: JSON parse error', [
                'json_error'  => json_last_error_msg(),
                'raw_excerpt' => substr($text, 0, 300),
            ]);
            throw new \RuntimeException('Claude returned invalid JSON: ' . json_last_error_msg());
        }

        return $data;
    }

    private function buildStoryPrompt(
        string $childName, int $childAge, string $theme,
        string $customPart, string $langInstruction, string $faceDesc,
        int $sceneCount, int $minWords, int $maxWords,
        int $minDuration, int $maxDuration, int $targetDuration, int $attempt
    ): string {
        $retryNote = $attempt > 1
            ? "CRITICAL RETRY #{$attempt}: Your previous draft was TOO SHORT. You MUST write at least {$minWords} words in story_text. Do NOT summarize. Expand every story beat."
            : '';

        return <<<PROMPT
You are a children's movie story writer. Create a complete LONG-FORM cinematic story for a {$childAge}-year-old child named {$childName}.
Theme: {$theme}. {$customPart}
{$langInstruction}
{$retryNote}

This story will be read aloud as professional narration for {$minDuration} to {$maxDuration} seconds (target ~{$targetDuration}s).
Write a FULL expanded story — not a summary, not bullet points, not a teaser.

Respond ONLY with valid JSON, no markdown, no code fences, no trailing text after the closing brace:
{
  "title": "story title",
  "story_text": "FULL narration script, {$minWords} to {$maxWords} words. Long-form storytelling with opening, rising action, challenge, climax, and warm resolution. Include dialogue and vivid descriptions suitable for read-aloud narration.",
  "scenes": [
    {
      "scene_number": 1,
      "description": "what happens (1-2 sentences). Include specific camera motion: e.g. slow zoom in, gentle pan left, pull back to wide shot.",
      "image_prompt": "Describe the scene visually. Always refer to the child as '{$faceDesc}'. Enforce: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, strict character consistency across all scenes, cinematic children's movie style. Include what the child is doing, the environment, lighting, mood, vibrant colors, detailed background."
    }
  ]
}

Generate exactly {$sceneCount} scenes.
The scenes MUST form a complete story arc: opening setup, discovery, rising action, challenge, climax, resolution.
Every scene description MUST include a specific realistic camera movement instruction.
Every image_prompt MUST explicitly include: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, character consistency across all scenes, same age appearance, cinematic children's movie style.
story_text MUST be between {$minWords} and {$maxWords} words — mandatory for {$minDuration}-{$maxDuration} second narration.
Make it magical, complete, emotionally engaging, and age-appropriate.
IMPORTANT: Output ONLY the JSON object. Do not add any text before or after it.
PROMPT;
    }

    private function buildStorybookPrompt(
        string $title, string $theme, string $storyText, string $scenesJson,
        string $langInstruction, string $faceDesc, string $childName, int $pageCount
    ): string {
        return <<<PROMPT
You are an art director and editor for a premium interactive children's storybook app (like a Disney+ storybook).
Expand the following short story into a {$pageCount}-page interactive storybook structure.

Story title: {$title}
Theme: {$theme}
Full story text: {$storyText}
Scene reference (for continuity, not 1:1 with pages): {$scenesJson}

{$langInstruction}

Respond ONLY with valid JSON, no markdown, no code fences, no trailing text:
{
  "pages": [
    {
      "page_number": 1,
      "page_type": "cover",
      "title": "short page title or story title for cover",
      "content": "1-3 sentences of story text for this page, age-appropriate and warm",
      "dialogue": "optional short character speech line, or null",
      "illustration_prompt": "Describe the illustration for this page. Always refer to the child as '{$faceDesc}'. Include scene composition, mood, lighting, and what is happening.",
      "layout_type": "full_illustration | split | text_overlay | text_left | text_right | text_top | text_bottom",
      "text_position": "top | bottom | left | right | overlay",
      "color_scheme": "bright_primary | warm_pastel | vibrant | soft | educational | playful | celebration"
    }
  ]
}

Rules:
- Generate exactly {$pageCount} pages.
- page 1 must have page_type "cover" with the story title.
- page 2 should have page_type "character_intro" introducing {$childName}.
- The last page must have page_type "ending" with a warm closing message.
- All other pages have page_type "story" and should each cover a small, distinct beat of the story.
- Vary layout_type and text_position across pages so the book does not feel repetitive.
- Every illustration_prompt MUST explicitly state: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, character consistency across all pages, same age appearance, movie-quality semi-realistic digital animation, warm cinematic lighting, vibrant family-friendly colors.
- Keep each page content short (1-3 sentences) so it fits on one screen.
IMPORTANT: Output ONLY the JSON object. Do not add any text before or after it.
PROMPT;
    }

    private function expandStoryText(
        string $shortText, int $minWords, int $maxWords,
        int $minDuration, int $maxDuration, string $langInstruction
    ): string {
        $currentWords = VideoTimelinePlanner::countWords($shortText);

        $prompt = <<<PROMPT
You are a children's story editor. Expand the following narration script into a LONG-FORM read-aloud story.
{$langInstruction}

Current draft ({$currentWords} words — TOO SHORT):
{$shortText}

Requirements:
- Rewrite as one continuous narration script between {$minWords} and {$maxWords} words.
- Target spoken length: {$minDuration} to {$maxDuration} seconds when read aloud to a child.
- Add dialogue, sensory detail, emotional beats, and a complete beginning-middle-end.
- Do NOT summarize. Do NOT use bullet points.
- Respond ONLY with the expanded narration text, no JSON, no markdown.
PROMPT;

        $response = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => $this->apiVersion,
            'Content-Type'      => 'application/json',
        ])->timeout(120)->post($this->baseUrl, [
            'model'      => $this->model,
            'max_tokens' => 8000,
            'messages'   => [['role' => 'user', 'content' => $prompt]],
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Claude story expansion failed: ' . $response->body());
        }

        $expanded = trim((string) $response->json('content.0.text'));
        if ($expanded === '') {
            throw new \RuntimeException('Claude story expansion returned empty text');
        }

        return $expanded;
    }

    private function normalizeSceneArchitecture(array $data, int $sceneCount): array
    {
        if (!isset($data['scenes']) || !is_array($data['scenes'])) {
            throw new \RuntimeException('Claude response missing scenes array');
        }
        if (count($data['scenes']) < $sceneCount) {
            throw new \RuntimeException("Claude returned fewer than {$sceneCount} scenes");
        }

        $data['scenes'] = array_values(array_slice($data['scenes'], 0, $sceneCount));
        foreach ($data['scenes'] as $index => &$scene) {
            $scene['scene_number'] = $index + 1;
        }
        unset($scene);

        return $data;
    }

    private function normalizePageArchitecture(array $data, int $pageCount): array
    {
        if (!isset($data['pages']) || !is_array($data['pages']) || count($data['pages']) === 0) {
            throw new \RuntimeException('Claude response missing pages array');
        }
        if (count($data['pages']) < $pageCount) {
            throw new \RuntimeException("Claude returned fewer than {$pageCount} storybook pages");
        }

        $data['pages'] = array_values(array_slice($data['pages'], 0, $pageCount));
        foreach ($data['pages'] as $index => &$page) {
            $page['page_number']   = (int)$index + 1;
            $page['page_type']     = $page['page_type']     ?? ($index === 0 ? 'cover' : ($index === $pageCount - 1 ? 'ending' : 'story'));
            $page['layout_type']   = $page['layout_type']   ?? 'full_illustration';
            $page['text_position'] = $page['text_position'] ?? 'bottom';
            $page['color_scheme']  = $page['color_scheme']  ?? 'warm_pastel';
        }
        unset($page);

        return $data;
    }
}
