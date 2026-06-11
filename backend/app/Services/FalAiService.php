<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FalAiService
{
    private string $apiKey;
    private string $imageModel;
    private string $videoModel;
    private int $pollInterval;
    private int $pollMaxAttempts;

    public function __construct()
    {
        $this->apiKey          = config('services.fal.key');
        $this->imageModel      = config('services.fal.image_model', 'fal-ai/flux/schnell');
        $this->videoModel      = config('services.fal.video_model', 'fal-ai/minimax-video/image-to-video');
        $this->pollInterval    = config('services.fal.poll_interval', 5);
        $this->pollMaxAttempts = config('services.fal.poll_max_attempts', 60);
    }

    // ─── Image Generation ─────────────────────────────────────────────────────

    public function generateImage(string $prompt, ?string $photoUrl = null): string
    {
        $model   = $photoUrl ? 'fal-ai/flux/dev/image-to-image' : 'fal-ai/flux/schnell';
        $payload = [
            'prompt'          => $prompt . ', children\'s book illustration style, vibrant colors, safe for kids',
            'num_images'      => 1,
            'image_size'      => 'landscape_16_9',
            'enable_safety_checker' => true,
        ];

        if ($photoUrl) {
            $payload['image_url'] = $photoUrl;
            $payload['strength']  = 0.75;
        }

        $requestId = $this->submitRequest($model, $payload);
        $result    = $this->pollForResult($requestId);

        $imageUrl = $result['images'][0]['url'] ?? null;
        if (!$imageUrl) {
            throw new \RuntimeException('No image URL in Fal.ai response');
        }

        return $imageUrl;
    }

    // ─── Video Generation ─────────────────────────────────────────────────────

    public function generateVideo(string $imageUrl, string $prompt): string
    {
        $payload = [
            'image_url'   => $imageUrl,
            'prompt'      => $prompt,
            'duration'    => '5',
        ];

        $requestId = $this->submitRequest($this->videoModel, $payload);
        $result    = $this->pollForResult($requestId);

        $videoUrl = $result['video']['url'] ?? $result['videos'][0]['url'] ?? null;
        if (!$videoUrl) {
            throw new \RuntimeException('No video URL in Fal.ai response');
        }

        return $videoUrl;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    private function submitRequest(string $model, array $payload): string
    {
        $response = Http::withHeaders([
            'Authorization' => 'Key ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])->timeout(30)->post("https://queue.fal.run/{$model}", $payload);

        if (!$response->successful()) {
            Log::error('Fal.ai submit error', ['model' => $model, 'status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('Fal.ai submit failed: ' . $response->body());
        }

        $requestId = $response->json('request_id');
        if (!$requestId) {
            throw new \RuntimeException('No request_id from Fal.ai');
        }

        return $requestId;
    }

    private function pollForResult(string $requestId): array
    {
        for ($i = 0; $i < $this->pollMaxAttempts; $i++) {
            sleep($this->pollInterval);

            $response = Http::withHeaders([
                'Authorization' => 'Key ' . $this->apiKey,
            ])->timeout(30)->get("https://queue.fal.run/requests/{$requestId}");

            if (!$response->successful()) {
                continue;
            }

            $data   = $response->json();
            $status = $data['status'] ?? '';

            if ($status === 'COMPLETED') {
                $result = Http::withHeaders([
                    'Authorization' => 'Key ' . $this->apiKey,
                ])->timeout(30)->get("https://queue.fal.run/requests/{$requestId}/response");

                if ($result->successful()) {
                    return $result->json();
                }
            }

            if ($status === 'FAILED') {
                throw new \RuntimeException('Fal.ai job failed: ' . json_encode($data));
            }
        }

        throw new \RuntimeException('Fal.ai polling timed out for request: ' . $requestId);
    }

    public function downloadAndStore(string $url, string $storagePath): string
    {
        $contents = Http::timeout(60)->get($url)->body();
        $disk     = config('filesystems.default');
        Storage::disk($disk)->put($storagePath, $contents);
        return Storage::disk($disk)->url($storagePath);
    }
}
