<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = (string) config('services.gemini.key', '');
        $this->model  = config('services.gemini.model', 'gemini-2.5-flash');
    }

    // Fallback model list — tried in order if primary is unavailable
    private array $fallbackModels = [
        'gemini-2.5-flash',
    ];

    public function generateStory(array $params): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('GEMINI_API_KEY is not configured.');
        }

        $childName    = $params['child_name']    ?? 'the hero';
        $childAge     = $params['child_age']     ?? 6;
        $theme        = $params['theme']         ?? 'adventure';
        $language     = $params['language']      ?? 'en';
        $customPrompt = $params['custom_prompt'] ?? null;
        $sceneCount   = 6;

        $langInstruction = $language === 'ar'
            ? 'Write entirely in Arabic.'
            : 'Write in English.';

        $customPart = $customPrompt
            ? "The parent's special idea: \"{$customPrompt}\". Incorporate this."
            : '';

        $faceDesc = $childName
            ? "the same exact child protagonist named {$childName}, with identical facial features, identical hairstyle, identical clothing, identical eye color, and the same age appearance in every scene"
            : 'the same exact child protagonist with identical facial features, hairstyle, clothing, eye color, and age appearance in every scene';

        $prompt = <<<PROMPT
You are a children's movie story writer. Create a complete short cinematic story for a {$childAge}-year-old child named {$childName}.
Theme: {$theme}. {$customPart}
{$langInstruction}

Respond ONLY with valid JSON, no markdown, no code fences, no trailing text after the closing brace:
{
  "title": "story title",
  "story_text": "full story 220-320 words written as narration for a 6-scene children's movie",
  "scenes": [
    {
      "scene_number": 1,
      "description": "what happens (1 sentence). Include specific camera motion: e.g. slow zoom in, gentle pan left, pull back to wide shot.",
      "image_prompt": "Describe the scene visually. Always refer to the child as '{$faceDesc}'. Enforce: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, same age appearance, strict character consistency across all scenes, cinematic children's movie style. Include what the child is doing, the environment, lighting, mood, vibrant colors, detailed background."
    }
  ]
}

Generate exactly {$sceneCount} scenes.
The 6 scenes MUST form a complete beginning, middle, climax, and ending:
1. opening setup, 2. invitation or discovery, 3. rising action, 4. challenge, 5. climax, 6. warm resolution.
Every scene description MUST include a specific realistic camera movement instruction (slow zoom in, pan right, pull back, tracking shot, etc.).
Every image_prompt MUST explicitly include: same exact child protagonist, identical facial features, identical hairstyle, identical clothing, identical eye color, character consistency across all scenes, same age appearance, cinematic children's movie style.
Keep story_text under 320 words. Make it magical, complete, and age-appropriate.
IMPORTANT: Output ONLY the JSON object. Do not add any text before or after it.
PROMPT;

        // Build model list: configured model first, then fallbacks (deduped)
        $models = array_unique(array_merge([$this->model], $this->fallbackModels));
        $lastError = null;

        foreach ($models as $model) {
            try {
                $data = $this->callGemini($model, $prompt);
                if ($model !== $this->model) {
                    Log::info("Gemini: using fallback model {$model}");
                }
                return $this->normalizeSceneArchitecture($data, $sceneCount);
            } catch (\RuntimeException $e) {
                $lastError = $e;
                $body = $e->getMessage();
                // Only retry on 503 (overloaded) or 429 (quota) — not on auth/bad-request errors
                if (!str_contains($body, '503') && !str_contains($body, 'UNAVAILABLE')
                    && !str_contains($body, '429') && !str_contains($body, 'RESOURCE_EXHAUSTED')) {
                    throw $e;
                }
                Log::warning("Gemini model {$model} unavailable, trying next", ['error' => substr($body, 0, 200)]);
            }
        }

        throw new \RuntimeException('All Gemini models failed. Last error: ' . $lastError?->getMessage());
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
            'curl' => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],  // skip IPv6 — avoids DNS timeout on Windows
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
                'maxOutputTokens'  => 8192,
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

        // Strip any accidental markdown fences just in case
        $text = preg_replace('/^```json\s*/i', '', trim($text));
        $text = preg_replace('/```\s*$/i', '', $text);

        $data = json_decode(trim($text), true);

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
}
