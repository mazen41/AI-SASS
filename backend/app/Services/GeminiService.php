<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
    private string $model;
    private array $fallbackModels;

    public function __construct()
    {
        $this->apiKey = (string) config('services.gemini.key', '');
        $this->model  = config('services.gemini.model', 'gemini-2.5-flash');
        $this->fallbackModels = array_values(array_diff(
            (array) config('services.gemini.fallback_models', ['gemini-2.5-flash', 'gemini-2.0-flash']),
            [$this->model]
        ));
    }


    public function generateStory(array $params): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('GEMINI_API_KEY is not configured.');
        }

        $childName      = $params['child_name']      ?? 'the hero';
        $childAge       = $params['child_age']        ?? 6;
        $theme          = $params['theme']            ?? 'adventure';
        $language       = $params['language']         ?? 'en';
        $customPrompt   = $params['custom_prompt']    ?? null;
        $minDuration    = (int) ($params['min_duration_seconds'] ?? VideoTimelinePlanner::MIN_NARRATION_SECONDS);
        $maxDuration    = (int) ($params['max_duration_seconds'] ?? VideoTimelinePlanner::MAX_NARRATION_SECONDS);
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

        $models    = array_unique(array_merge([$this->model], $this->fallbackModels));
        $lastError = null;

        foreach ($models as $model) {
            for ($attempt = 1; $attempt <= 3; $attempt++) {
                try {
                    $prompt = $this->buildStoryPrompt(
                        $childName,
                        $childAge,
                        $theme,
                        $customPart,
                        $langInstruction,
                        $faceDesc,
                        $sceneCount,
                        $minWords,
                        $maxWords,
                        $minDuration,
                        $maxDuration,
                        $targetDuration,
                        $attempt
                    );

                    $data = $this->callGemini($model, $prompt);
                    $wordCount = VideoTimelinePlanner::countWords($data['story_text'] ?? '');

                    if ($wordCount < $minWords) {
                        Log::warning('Gemini story too short, retrying', [
                            'model'      => $model,
                            'attempt'    => $attempt,
                            'word_count' => $wordCount,
                            'min_words'  => $minWords,
                        ]);

                        if ($attempt < 3) {
                            continue;
                        }

                        $data['story_text'] = $this->expandStoryText(
                            $model,
                            $data['story_text'],
                            $minWords,
                            $maxWords,
                            $minDuration,
                            $maxDuration,
                            $langInstruction
                        );
                        $wordCount = VideoTimelinePlanner::countWords($data['story_text']);
                    }

                    if ($wordCount < $minWords) {
                        throw new \RuntimeException(
                            "Story text is too short for narration ({$wordCount} words, need at least {$minWords} "
                            . "for {$minDuration}-{$maxDuration}s audio)."
                        );
                    }

                    if ($model !== $this->model) {
                        Log::info("Gemini: using fallback model {$model}");
                    }

                    Log::info('Gemini story generated', [
                        'word_count'              => $wordCount,
                        'estimated_duration_s'    => round(VideoTimelinePlanner::estimateSecondsFromWords($wordCount), 1),
                        'scene_count'             => $sceneCount,
                        'target_duration_range_s' => "{$minDuration}-{$maxDuration}",
                    ]);

                    $data['scene_count']         = $sceneCount;
                    $data['word_count']          = $wordCount;
                    $data['min_duration_s']      = $minDuration;
                    $data['max_duration_s']      = $maxDuration;
                    $data['target_duration_s']   = $targetDuration;

                    return $this->normalizeSceneArchitecture($data, $sceneCount);
                } catch (\RuntimeException $e) {
                    $lastError = $e;
                    $body = $e->getMessage();
                    if (!str_contains($body, '503') && !str_contains($body, 'UNAVAILABLE')
                        && !str_contains($body, '429') && !str_contains($body, 'RESOURCE_EXHAUSTED')) {
                        throw $e;
                    }
                    Log::warning("Gemini model {$model} unavailable, trying next", ['error' => substr($body, 0, 200)]);
                    break;
                }
            }
        }

        throw new \RuntimeException('All Gemini models failed. Last error: ' . $lastError?->getMessage());
    }

    private function buildStoryPrompt(
        string $childName,
        int $childAge,
        string $theme,
        string $customPart,
        string $langInstruction,
        string $faceDesc,
        int $sceneCount,
        int $minWords,
        int $maxWords,
        int $minDuration,
        int $maxDuration,
        int $targetDuration,
        int $attempt
    ): string {
        $retryNote = $attempt > 1
            ? "CRITICAL RETRY #{$attempt}: Your previous draft was TOO SHORT. You MUST write at least {$minWords} words in story_text. Do NOT summarize. Expand every story beat with rich sensory detail, dialogue, and emotional beats."
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
      "image_prompt": "Describe the scene visually. Always refer to the child as '{$faceDesc}'. Enforce: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, same age appearance, strict character consistency across all scenes, cinematic children's movie style. Include what the child is doing, the environment, lighting, mood, vibrant colors, detailed background."
    }
  ]
}

Generate exactly {$sceneCount} scenes.
The scenes MUST form a complete story arc spread across all {$sceneCount} scenes: opening setup, discovery, rising action, challenge, climax, resolution.
Every scene description MUST include a specific realistic camera movement instruction (slow zoom in, pan right, pull back, tracking shot, etc.).
Every image_prompt MUST explicitly include: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, character consistency across all scenes, same age appearance, cinematic children's movie style.
story_text MUST be between {$minWords} and {$maxWords} words — this is mandatory for {$minDuration}-{$maxDuration} second narration.
Make it magical, complete, emotionally engaging, and age-appropriate.
IMPORTANT: Output ONLY the JSON object. Do not add any text before or after it.
PROMPT;
    }

    private function expandStoryText(
        string $model,
        string $shortText,
        int $minWords,
        int $maxWords,
        int $minDuration,
        int $maxDuration,
        string $langInstruction
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

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->withOptions([
            'curl' => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],
        ])->timeout(120)->post($url, [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'temperature'     => 0.7,
                'maxOutputTokens' => 8192,
            ],
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Gemini story expansion failed: ' . $response->body());
        }

        $expanded = trim((string) $response->json('candidates.0.content.parts.0.text'));
        if ($expanded === '') {
            throw new \RuntimeException('Gemini story expansion returned empty text');
        }

        return $expanded;
    }

    private function normalizeSceneArchitecture(array $data, int $sceneCount): array
    {
        if (!isset($data['scenes']) || !is_array($data['scenes'])) {
            throw new \RuntimeException('Gemini response missing scenes array');
        }

        if (count($data['scenes']) < $sceneCount) {
            throw new \RuntimeException("Gemini returned fewer than {$sceneCount} scenes");
        }

        $data['scenes'] = array_values(array_slice($data['scenes'], 0, $sceneCount));
        foreach ($data['scenes'] as $index => &$scene) {
            $scene['scene_number'] = $index + 1;
        }
        unset($scene);

        return $data;
    }

    private function callGemini(string $model, string $prompt): array
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->withOptions([
            'curl' => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],  // skip IPv6 - avoids DNS timeout on Windows
        ])->timeout(120)->post($url, [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature'      => 0.7,
                'maxOutputTokens'  => 16384,
            ],
        ]);

        if (!$response->successful()) {
            Log::error('Gemini API error', ['model' => $model, 'status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('Gemini API request failed: ' . $response->body());
        }

        $text = $response->json('candidates.0.content.parts.0.text');

        if (!$text) {
            Log::error('Gemini empty response', ['model' => $model, 'body' => $response->body()]);
            throw new \RuntimeException('Gemini returned an empty response');
        }


        // Strip control characters that break json_decode (common with Arabic/RTL text)
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        $data = json_decode($text, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

        if (json_last_error() !== JSON_ERROR_NONE) {
            // Last-chance: try extracting the JSON object manually
            if (preg_match('/(\{.*\})/su', $text, $m)) {
                $data = json_decode($m[1], true, 512, JSON_INVALID_UTF8_SUBSTITUTE);
            }
        }

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Gemini JSON parse error', ['model' => $model, 'json_error' => json_last_error_msg(), 'raw_length' => strlen($text)]);
            throw new \RuntimeException('Gemini returned invalid JSON: ' . json_last_error_msg());
        }

        $missing = array_diff(['title', 'story_text', 'scenes'], array_keys($data ?? []));
        if (!$data || !empty($missing)) {
            Log::error('Gemini missing fields', ['model' => $model, 'missing' => $missing, 'keys' => array_keys($data ?? [])]);
            throw new \RuntimeException('Gemini response missing fields: ' . implode(', ', $missing));
        }

        if (!is_array($data['scenes']) || count($data['scenes']) === 0) {
            throw new \RuntimeException('Gemini returned no scenes');
        }

        return $data;
    }

    /**
     * Storybook V2: Break a completed story (title/content/scenes) into
     * 15-20 interactive storybook pages with per-page layout/illustration
     * direction. Reuses the model-fallback strategy from generateStory().
     */
    public function generateStorybookPages(array $params): array
    {
        Log::info("GEMINI START: GeminiService::generateStorybookPages()", [
            'title' => $params['title'] ?? 'Untitled',
            'language' => $params['language'] ?? 'en'
        ]);

        if ($this->apiKey === '') {
            throw new \RuntimeException('GEMINI_API_KEY is not configured.');
        }

        $title     = $params['title'] ?? 'Untitled Story';
        $storyText = $params['story_text'] ?? '';
        $scenes    = $params['scenes'] ?? [];
        $childName = $params['child_name'] ?? 'the hero';
        $theme     = $params['theme'] ?? 'adventure';
        $language  = $params['language'] ?? 'en';
        $pageCount = max(15, min(20, (int) ($params['page_count'] ?? 16)));

        Log::info("GEMINI STEP 1: Parameters prepared", [
            'title' => $title,
            'story_text_length' => strlen($storyText),
            'scenes_count' => count($scenes),
            'child_name' => $childName,
            'theme' => $theme,
            'language' => $language,
            'page_count' => $pageCount
        ]);

        $langInstruction = $language === 'ar'
            ? 'Write all "title", "content", and "dialogue" text fields entirely in Arabic.'
            : 'Write in English.';

        $scenesJson = json_encode($scenes, JSON_UNESCAPED_UNICODE);
        $faceDesc = "the same exact child protagonist named {$childName}, with identical facial features, identical hairstyle, identical clothing, identical eye color, and the same age appearance on every page";

        $prompt = <<<PROMPT
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
      "illustration_prompt": "Describe the illustration for this page. Always refer to the child as '{$faceDesc}'. Include scene composition, mood, lighting, and what's happening.",
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
- All other pages have page_type "story" and should each cover a small, distinct beat of the story (no repeated content).
- Vary layout_type and text_position across pages so the book doesn't feel repetitive.
- Every illustration_prompt MUST explicitly state: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, character consistency across all pages, same age appearance, movie-quality semi-realistic digital animation, warm cinematic lighting, detailed facial features, natural skin tone, expressive eyes, vibrant family-friendly colors.
- Keep each page's "content" short (1-3 sentences) so it fits on one screen.
IMPORTANT: Output ONLY the JSON object. Do not add any text before or after it.
PROMPT;

        $models = array_unique(array_merge([$this->model], $this->fallbackModels));
        $lastError = null;

        foreach ($models as $model) {
            try {
                $data = $this->requestJson($model, $prompt);
                return $this->normalizePageArchitecture($data, $pageCount);
            } catch (\RuntimeException $e) {
                $lastError = $e;
                $body = $e->getMessage();
                if (!str_contains($body, '503') && !str_contains($body, 'UNAVAILABLE')
                    && !str_contains($body, '429') && !str_contains($body, 'RESOURCE_EXHAUSTED')) {
                    throw $e;
                }
                Log::warning("Gemini model {$model} unavailable for storybook pages, trying next", ['error' => substr($body, 0, 200)]);
            }
        }

        throw new \RuntimeException('All Gemini models failed for storybook pages. Last error: ' . $lastError?->getMessage());
    }

    private function normalizePageArchitecture(array $data, int $pageCount): array
    {
        if (!isset($data['pages']) || !is_array($data['pages']) || count($data['pages']) === 0) {
            throw new \RuntimeException('Gemini response missing pages array');
        }

        if (count($data['pages']) < $pageCount) {
            throw new \RuntimeException("Gemini returned fewer than {$pageCount} storybook pages");
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

    /**
     * Generic Gemini JSON call without story-specific field validation.
     * Used by generateStorybookPages(). Mirrors callGemini()'s HTTP/parsing
     * logic but returns the raw decoded payload.
     */
    private function requestJson(string $model, string $prompt): array
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->withOptions([
            'curl' => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],
        ])->timeout(120)->post($url, [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature'      => 0.7,
                'maxOutputTokens'  => 16384,
            ],
        ]);

        if (!$response->successful()) {
            Log::error('Gemini API error', ['model' => $model, 'status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('Gemini API request failed: ' . $response->body());
        }

        $text = $response->json('candidates.0.content.parts.0.text');

        if (!$text) {
            Log::error('Gemini empty response', ['model' => $model, 'body' => $response->body()]);
            throw new \RuntimeException('Gemini returned an empty response');
        }

        $text = preg_replace('/^```json\s*/i', '', trim($text));
        $text = preg_replace('/```\s*$/i', '', $text);
        $text = trim($text);

        // Strip control characters that break json_decode (common with Arabic/RTL text)
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        $data = json_decode($text, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

        if (json_last_error() !== JSON_ERROR_NONE) {
            // Last-chance: try extracting the JSON object/array manually
            if (preg_match('/(\{.*\}|\[.*\])/su', $text, $m)) {
                $data = json_decode($m[1], true, 512, JSON_INVALID_UTF8_SUBSTITUTE);
            }
        }

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Gemini JSON parse error', ['model' => $model, 'json_error' => json_last_error_msg(), 'raw_length' => strlen($text)]);
            throw new \RuntimeException('Gemini returned invalid JSON: ' . json_last_error_msg());
        }

        if (!$data) {
            throw new \RuntimeException('Gemini returned empty JSON');
        }

        return $data;
    }

}
