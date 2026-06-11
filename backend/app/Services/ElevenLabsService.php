<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ElevenLabsService
{
    private string $apiKey;
    private string $model;
    private string $enVoiceId;
    private string $arVoiceId;

    public function __construct()
    {
        $this->apiKey    = (string) config('services.elevenlabs.key', '');
        $this->model     = config('services.elevenlabs.model', 'eleven_multilingual_v2');
        $this->enVoiceId = config('services.elevenlabs.en_voice_id', 'EXAVITQu4vr4xnSDxMaL');
        $this->arVoiceId = config('services.elevenlabs.ar_voice_id', 'ThT5KcBeYPX3keUQqHPh');
    }

    public function generateNarration(string $text, string $language, int $storyId): string
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('ELEVENLABS_API_KEY is not configured.');
        }

        $voiceId = ($language === 'ar') ? $this->arVoiceId : $this->enVoiceId;

        // ElevenLabs has a ~5000 char limit per request; truncate gracefully
        $text = mb_substr(trim($text), 0, 4500);

        if (empty($text)) {
            throw new \RuntimeException('Story text is empty -- cannot generate narration');
        }

        Log::info('ElevenLabs: generating narration', [
            'story_id' => $storyId,
            'language' => $language,
            'voice_id' => $voiceId,
            'length'   => strlen($text),
        ]);

        $response = Http::withHeaders([
            'xi-api-key'   => $this->apiKey,
            'Content-Type' => 'application/json',
            'Accept'       => 'audio/mpeg',
        ])->timeout(180)->post("https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}", [
            'text'     => $text,
            'model_id' => $this->model,
            'voice_settings' => [
                'stability'         => 0.5,
                'similarity_boost'  => 0.75,
                'style'             => 0.0,
                'use_speaker_boost' => true,
            ],
        ]);

        if (!$response->successful()) {
            Log::error('ElevenLabs error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('ElevenLabs API failed (' . $response->status() . '): ' . $response->body());
        }

        $audioContent = $response->body();
        if (empty($audioContent) || strlen($audioContent) < 100) {
            throw new \RuntimeException('ElevenLabs returned empty or invalid audio response');
        }

        $disk = config('filesystems.default', 'public');
        $path = "stories/{$storyId}/narration_{$language}.mp3";

        Storage::disk($disk)->put($path, $audioContent);

        $url = Storage::disk($disk)->url($path);
        Log::info('ElevenLabs: narration stored', ['story_id' => $storyId, 'url' => $url]);

        return $url;
    }
}
