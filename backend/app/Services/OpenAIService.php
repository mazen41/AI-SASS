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

        $langInstruction = $language === 'ar'
            ? 'Write entirely in Arabic.'
            : 'Write in English.';

        $customPart = $customPrompt
            ? "The parent's special idea: \"{$customPrompt}\". Incorporate this."
            : '';

        $prompt = <<<PROMPT
You are a children's story writer. Create a short illustrated story for a {$childAge}-year-old child named {$childName}.
Theme: {$theme}. {$customPart}
{$langInstruction}

Respond ONLY with valid JSON, no markdown:
{
  "title": "story title",
  "story_text": "full story 200-300 words",
  "scenes": [
    {
      "scene_number": 1,
      "description": "what happens (1-2 sentences)",
      "image_prompt": "detailed visual prompt for image generation, describing the scene with {$childName} as the main character, vivid colors, children's book illustration style"
    }
  ]
}

Generate exactly 6 scenes. Make it magical and age-appropriate.
PROMPT;

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
            'model'      => $this->model,
            'max_tokens' => $this->maxTokens,
            'messages'   => [
                ['role' => 'system', 'content' => 'You are a creative children\'s story writer. Always respond with valid JSON only.'],
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

        return $data;
    }
}
