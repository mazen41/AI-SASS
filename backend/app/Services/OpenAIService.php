<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    private string $apiKey;
    private string $model;
    private int $maxTokens;

    public function __construct()
    {
        $this->apiKey    = (string) config('services.openai.key', '');
        $this->model     = config('services.openai.model', 'gpt-4o');
        $this->maxTokens = config('services.openai.max_tokens', 4000);
    }

    public function generateStory(array $params): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $childName   = $params['child_name'] ?? 'the hero';
        $childAge    = $params['child_age']  ?? 6;
        $theme       = $params['theme']      ?? 'adventure';
        $language    = $params['language']   ?? 'en';
        $customPrompt = $params['custom_prompt'] ?? null;
        
        // Respect TEST_IMAGE_COUNT for testing, otherwise use default 6 scenes
        $testImageCount = (int)env('TEST_IMAGE_COUNT', 0);
        $sceneCount   = $testImageCount > 0 ? $testImageCount : 6;

        $langInstruction = $language === 'ar'
            ? 'Write the title, story_text, and all scene descriptions entirely in Arabic. The image_prompt values MUST remain in English so that the image generator can understand them.'
            : 'Write in English.';

        $customPart = $customPrompt
            ? "The parent's special idea: \"{$customPrompt}\". Incorporate this."
            : '';

        $targetPageCount = max(8, min(12, $sceneCount));

        $prompt = <<<PROMPT
You are a children's book author. Create a magical children's storybook and a corresponding video narration script for a {$childAge}-year-old child named {$childName}.
Theme: {$theme}. {$customPart}
{$langInstruction}

Respond ONLY with valid JSON, no markdown:
{
  "title": "Story Book Title",
  "story_text": "A concise, warm narration script in the chosen language (220 to 300 words total) to be read aloud as video narration for 60 to 90 seconds.",
  "scenes": [
    {
      "scene_number": 1,
      "title": "Creative Page Title",
      "description": "The rich, long, and detailed storybook text for this page (MUST be between 120 and 180+ words). Write in a magical, emotional bedtime storybook style. NO camera movements or filmmaking instructions.",
      "image_prompt": "detailed visual prompt for illustration. MUST ALWAYS be written in English. Always use {$childName} as the same exact child protagonist; identical facial features; identical hairstyle; identical clothing; identical eye color; same age appearance; strict character consistency across all pages; cinematic children's book illustration style; vivid colors; warm lighting; family-friendly mood"
    }
  ]
}

Rules:
1. Generate exactly {$targetPageCount} pages in the "scenes" array.
2. Each element in "scenes" represents a STORYBOOK PAGE (not a movie scene).
3. Do NOT include camera movements or movie directions in page descriptions.
4. Each page's "description" MUST be a long, rich paragraph of 120-180+ words.
5. The language of "title", "story_text", page "title", and page "description" must strictly match the chosen story language (Arabic if language is Arabic).
6. The "image_prompt" fields must remain in English.
PROMPT;

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
            'model'      => $this->model,
            'max_tokens' => $this->maxTokens,
            'messages'   => [
                ['role' => 'system', 'content' => 'You are a creative children\'s movie story writer. Always respond with valid JSON only.'],
                ['role' => 'user',   'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
        ]);

        if (!$response->successful()) {
            Log::error('OpenAI API error', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('OpenAI API request failed: ' . $response->body());
        }

        $content = $response->json('choices.0.message.content');
        $data    = json_decode($content, true);

        if (!$data || !isset($data['title'], $data['story_text'], $data['scenes'])) {
            throw new \RuntimeException('Invalid OpenAI response structure');
        }

        return $this->normalizeSceneArchitecture($data, $sceneCount);
    }

    private function normalizeSceneArchitecture(array $data, int $sceneCount): array
    {
        if (!isset($data['scenes']) || !is_array($data['scenes'])) {
            throw new \RuntimeException('OpenAI response missing scenes array');
        }

        if (count($data['scenes']) < $sceneCount) {
            throw new \RuntimeException("OpenAI returned fewer than {$sceneCount} scenes");
        }

        $data['scenes'] = array_values(array_slice($data['scenes'], 0, $sceneCount));
        foreach ($data['scenes'] as $index => &$scene) {
            $scene['scene_number'] = $index + 1;
        }
        unset($scene);

        return $data;
    }
}
