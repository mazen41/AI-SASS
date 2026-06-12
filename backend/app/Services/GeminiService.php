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
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
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
        $testMode     = (bool) config('app.story_test_mode', false);

        // ✅ UPDATED: 18 scenes × 5 seconds each = 90 seconds final video
        // Test mode keeps 2 scenes to save credits during development
        $sceneCount = $testMode ? 2 : 18;

        $langInstruction = $language === 'ar'
            ? 'Write entirely in Arabic.'
            : 'Write in English.';

        $customPart = $customPrompt
            ? "The parent's special idea: \"{$customPrompt}\". Incorporate this."
            : '';

        $faceDesc = $childName
            ? "a child named {$childName} with the exact same face as the reference photo"
            : 'the main child character';

        $prompt = <<<PROMPT
You are a children's story writer. Create a short illustrated story for a {$childAge}-year-old child named {$childName}.
Theme: {$theme}. {$customPart}
{$langInstruction}

Respond ONLY with valid JSON, no markdown, no code fences, no trailing text after the closing brace:
{
  "title": "story title",
  "story_text": "full story 400-500 words to match the longer video duration",
  "scenes": [
    {
      "scene_number": 1,
      "description": "what happens (1 sentence). Include specific camera motion: e.g. slow zoom in, gentle pan left, pull back to wide shot.",
      "image_prompt": "Describe the scene visually. Always refer to the child as '{$faceDesc}'. Include: what they are doing, the environment, lighting, mood. Semi-realistic cinematic style, warm lighting, vibrant colors, detailed background."
    }
  ]
}

Generate exactly {$sceneCount} scenes. The scenes should flow as a continuous narrative arc with a clear beginning, rising action, climax, and resolution.
Each scene description MUST include a specific camera movement instruction (zoom in, pan right, pull back, tracking shot, etc.) for cinematic variety.
Keep story_text under 500 words. Make it magical and age-appropriate.
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
                return $data;
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
