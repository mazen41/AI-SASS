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
        $sceneCount   = 6;

        $langInstruction = $language === 'ar'
            ? 'Write entirely in Arabic.'
            : 'Write in English.';

        $customPart = $customPrompt
            ? "The parent's special idea: \"{$customPrompt}\". Incorporate this."
            : '';

        $prompt = <<<PROMPT
You are a children's movie story writer. Create a complete short cinematic story for a {$childAge}-year-old child named {$childName}.
Theme: {$theme}. {$customPart}
{$langInstruction}

Respond ONLY with valid JSON, no markdown:
{
  "title": "story title",
  "story_text": "full story 220-320 words written as narration for a 6-scene children's movie",
  "scenes": [
    {
      "scene_number": 1,
      "description": "what happens (1 sentence). Include specific realistic camera motion: e.g. slow zoom in, gentle pan left, pull back to wide shot.",
      "image_prompt": "detailed visual prompt for image generation with {$childName} as the same exact child protagonist; identical facial features; identical hairstyle; identical clothing; identical eye color; same age appearance; strict character consistency across all scenes; cinematic children's movie style; vivid colors; warm lighting; family-friendly mood"
    }
  ]
}

Generate exactly {$sceneCount} scenes.
The 6 scenes MUST form a complete beginning, middle, climax, and ending:
1. opening setup, 2. invitation or discovery, 3. rising action, 4. challenge, 5. climax, 6. warm resolution.
Every scene description MUST include camera movement. Every image_prompt MUST enforce same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, character consistency across all scenes, same age appearance, and cinematic children's movie style.
Make it magical, complete, and age-appropriate.
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
