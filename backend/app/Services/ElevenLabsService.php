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
        $this->apiKey    = config('services.elevenlabs.key');
        $this->model     = config('services.elevenlabs.model', 'eleven_multilingual_v2');
        $this->enVoiceId = config('services.elevenlabs.en_voice_id', 'EXAVITQu4vr4xnSDxMaL');
        $this->arVoiceId = config('services.elevenlabs.ar_voice_id', 'ThT5KcBeYPX3keUQqHPh');
    }

    public function generateNarration(string $text, string $language, int $storyId): string
    {
        $voiceId = $language === 'ar' ? $this->arVoiceId : $this->enVoiceId;

        $response = Http::withHeaders([
            'xi-api-key'   => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(120)->post("https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}", [
            'text'     => $text,
            'model_id' => $this->model,
            'voice_settings' => [
                'stability'        => 0.5,
                'similarity_boost' => 0.75,
            ],
        ]);

        if (!$response->successful()) {
            Log::error('ElevenLabs error', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('ElevenLabs API failed: ' . $response->body());
        }

        $disk = config('filesystems.default');
        $path = "stories/{$storyId}/narration_{$language}.mp3";
        Storage::disk($disk)->put($path, $response->body());

        return Storage::disk($disk)->url($path);
    }
}
