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
        $this->apiKey          = (string) config('services.fal.key', '');
        $this->imageModel      = config('services.fal.image_model', 'fal-ai/flux/schnell');
        $this->videoModel      = config('services.fal.video_model', 'fal-ai/minimax-video/image-to-video');
        $this->pollInterval    = (int) config('services.fal.poll_interval', 5);
        $this->pollMaxAttempts = (int) config('services.fal.poll_max_attempts', 60);
    }

    // --- Image Generation ---------------------------------------------------

    public function generateImage(string $prompt, ?string $photoUrl = null): string
    {
        $this->ensureConfigured();

        if ($photoUrl) {
            $model   = 'fal-ai/flux/dev/image-to-image';
            $payload = [
                'prompt'                => $prompt . ", children's book illustration style, vibrant colors, safe for kids",
                'image_url'             => $photoUrl,
                'strength'              => 0.75,
                'num_images'            => 1,
                'image_size'            => 'landscape_16_9',
                'enable_safety_checker' => true,
            ];
        } else {
            $model   = $this->imageModel;
            $payload = [
                'prompt'                => $prompt . ", children's book illustration style, vibrant colors, safe for kids",
                'num_images'            => 1,
                'image_size'            => 'landscape_16_9',
                'enable_safety_checker' => true,
            ];
        }

        [$requestId, $statusUrl, $responseUrl] = $this->submitRequest($model, $payload);
        $result = $this->pollForResult($model, $requestId, $statusUrl, $responseUrl);

        $imageUrl = $result['images'][0]['url'] ?? null;
        if (!$imageUrl) {
            Log::error('Fal.ai image: no URL in response', ['result' => $result]);
            throw new \RuntimeException('No image URL in Fal.ai response');
        }

        return $imageUrl;
    }

    // --- Video Generation ---------------------------------------------------

    public function generateVideo(string $imageUrl, string $prompt): string
    {
        $this->ensureConfigured();

        $payload = [
            'image_url' => $imageUrl,
            'prompt'    => $prompt . ', gentle cinematic motion, smooth camera movement, child-safe storybook animation',
            'duration'  => '5',
        ];

        [$requestId, $statusUrl, $responseUrl] = $this->submitRequest($this->videoModel, $payload);
        $result = $this->pollForResult($this->videoModel, $requestId, $statusUrl, $responseUrl);

        $videoUrl = $result['video']['url']
            ?? $result['videos'][0]['url']
            ?? null;

        if (!$videoUrl) {
            Log::error('Fal.ai video: no URL in response', ['result' => $result]);
            throw new \RuntimeException('No video URL in Fal.ai response');
        }

        return $videoUrl;
    }

    // --- Internal Helpers ---------------------------------------------------

    /**
     * Submit a job to the Fal.ai queue.
     * Returns [requestId, statusUrl, responseUrl].
     * Fal returns model-scoped URLs:
     *   status_url:   https://queue.fal.run/fal-ai/flux/requests/{id}/status
     *   response_url: https://queue.fal.run/fal-ai/flux/requests/{id}
     */
    private function submitRequest(string $model, array $payload): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Key ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])->timeout(30)->post("https://queue.fal.run/{$model}", $payload);

        if (!$response->successful()) {
            Log::error('Fal.ai submit error', [
                'model'  => $model,
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('Fal.ai submit failed: ' . $response->body());
        }

        $data        = $response->json();
        $requestId   = $data['request_id']   ?? null;
        $statusUrl   = $data['status_url']   ?? null;
        $responseUrl = $data['response_url']  ?? null;

        if (!$requestId) {
            throw new \RuntimeException('Fal.ai: no request_id in response: ' . json_encode($data));
        }

        // Build fallback URLs from request_id if Fal didn't return them
        if (!$statusUrl) {
            $statusUrl = "https://queue.fal.run/{$model}/requests/{$requestId}/status";
        }
        if (!$responseUrl) {
            $responseUrl = "https://queue.fal.run/{$model}/requests/{$requestId}";
        }

        Log::info('Fal.ai job submitted', ['model' => $model, 'request_id' => $requestId, 'status_url' => $statusUrl]);

        return [$requestId, $statusUrl, $responseUrl];
    }

    private function pollForResult(string $model, string $requestId, ?string $statusUrl, ?string $responseUrl): array
    {
        $statusUrl   = $statusUrl   ?? "https://queue.fal.run/{$model}/requests/{$requestId}/status";
        $responseUrl = $responseUrl ?? "https://queue.fal.run/{$model}/requests/{$requestId}";

        for ($i = 0; $i < $this->pollMaxAttempts; $i++) {
            sleep($this->pollInterval);

            $response = Http::withHeaders([
                'Authorization' => 'Key ' . $this->apiKey,
            ])->timeout(30)->get($statusUrl);

            if (!$response->successful()) {
                Log::warning('Fal.ai poll non-200', ['attempt' => $i, 'status' => $response->status()]);
                continue;
            }

            $data   = $response->json();
            $status = $data['status'] ?? '';

            Log::debug('Fal.ai poll', ['attempt' => $i, 'status' => $status, 'request_id' => $requestId]);

            if ($status === 'COMPLETED') {
                $result = Http::withHeaders([
                    'Authorization' => 'Key ' . $this->apiKey,
                ])->timeout(60)->get($responseUrl);

                if ($result->successful()) {
                    return $result->json();
                }

                throw new \RuntimeException('Fal.ai: COMPLETED but failed to fetch result: ' . $result->body());
            }

            if ($status === 'FAILED') {
                $error = $data['error'] ?? json_encode($data);
                throw new \RuntimeException('Fal.ai job failed: ' . $error);
            }

            // IN_QUEUE or IN_PROGRESS -- keep polling
        }

        throw new \RuntimeException(
            'Fal.ai polling timed out after ' . ($this->pollMaxAttempts * $this->pollInterval) . 's. request_id=' . $requestId
        );
    }

    private function ensureConfigured(): void
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('FAL_API_KEY is not configured.');
        }
    }

    public function downloadAndStore(string $url, string $storagePath): string
    {
        $response = Http::timeout(120)->get($url);

        if (!$response->successful()) {
            throw new \RuntimeException('Failed to download asset from: ' . $url);
        }

        $disk = config('filesystems.default', 'public');
        Storage::disk($disk)->put($storagePath, $response->body());

        return Storage::disk($disk)->url($storagePath);
    }
}
