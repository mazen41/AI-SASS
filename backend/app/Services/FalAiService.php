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
        $this->imageModel      = config('services.fal.image_model', 'fal-ai/flux-pro/v1.1');
        $this->videoModel      = config('services.fal.video_model', 'fal-ai/kling-video/v2.6/pro/image-to-video');
        $this->pollInterval    = (int) config('services.fal.poll_interval', 5);
        $this->pollMaxAttempts = (int) config('services.fal.poll_max_attempts', 60);
    }

    // --- File Upload to Fal.ai storage ------------------------------------

    /**
     * Upload a local file to Fal.ai storage and return a public URL.
     * Used to make locally-stored photos accessible to Fal.ai workers.
     */
    public function uploadFileToFal(string $localPath): string
    {
        if (!file_exists($localPath)) {
            throw new \RuntimeException("File not found for Fal upload: {$localPath}");
        }

        $mime     = mime_content_type($localPath) ?: 'image/jpeg';
        $filename = basename($localPath);

        // Step 1: Initiate upload — get presigned upload_url + final file_url
        $initResponse = Http::withHeaders([
            'Authorization' => 'Key ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])->timeout(30)->post('https://rest.fal.ai/storage/upload/initiate', [
            'content_type' => $mime,
            'file_name'    => $filename,
        ]);

        if (!$initResponse->successful()) {
            throw new \RuntimeException('Fal.ai upload initiate failed: ' . $initResponse->body());
        }

        $uploadUrl = $initResponse->json('upload_url');
        $fileUrl   = $initResponse->json('file_url');

        if (!$uploadUrl || !$fileUrl) {
            throw new \RuntimeException('Fal.ai upload initiate missing URLs: ' . $initResponse->body());
        }

        // Step 2: PUT the raw file bytes to the presigned URL
        $putResponse = Http::withHeaders([
            'Content-Type' => $mime,
        ])->timeout(60)->withBody(file_get_contents($localPath), $mime)->put($uploadUrl);

        if (!$putResponse->successful()) {
            throw new \RuntimeException('Fal.ai file PUT failed: ' . $putResponse->body());
        }

        Log::info('Fal.ai file uploaded', ['file_url' => $fileUrl]);

        return $fileUrl;
    }

    /**
     * Check if a URL is publicly accessible (not localhost/private).
     */
    private function isPublicUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) return false;
        return !in_array($host, ['localhost', '127.0.0.1', '::1'])
            && !str_starts_with($host, '192.168.')
            && !str_starts_with($host, '10.')
            && !str_starts_with($host, '172.');
    }

    // --- Image Generation ---------------------------------------------------

    public function generateImage(string $prompt, ?string $photoUrl = null): string
    {
        $this->ensureConfigured();

        if ($photoUrl) {
            // If the photo is on localhost/private network, upload it to Fal storage first
            if (!$this->isPublicUrl($photoUrl)) {
                Log::info('Photo URL is local, uploading to Fal storage', ['original_url' => $photoUrl]);
                $disk      = config('filesystems.default', 'public');
                $baseUrl   = rtrim(Storage::disk($disk)->url(''), '/');
                $relative  = ltrim(substr($photoUrl, strlen($baseUrl)), '/');
                $localPath = Storage::disk($disk)->path($relative);
                $photoUrl  = $this->uploadFileToFal($localPath);
                Log::info('Photo uploaded to Fal storage', ['fal_url' => $photoUrl]);
            }

            // Use PuLID — face-identity-preserving model.
            // This keeps the child's actual face consistent across every scene.
            $model   = 'fal-ai/flux-pulid';
            $payload = [
                'prompt'                => $prompt
                    . ', same exact child protagonist from the reference photo, identical facial features,'
                    . ' identical hairstyle, identical clothing, identical eye color, same age appearance,'
                    . ' strict character consistency across all scenes, consistent face identity, same child,'
                    . ' cinematic children\'s movie style, movie-quality semi-realistic digital animation,'
                    . ' warm cinematic lighting, detailed facial features, natural skin tone, expressive eyes,'
                    . ' vibrant family-friendly storybook world',
                'reference_image_url'   => $photoUrl,
                'num_images'            => 1,
                'image_size'            => 'landscape_16_9',
                'id_weight'             => 1.0,   // max face adherence
                'num_inference_steps'   => 40,
                'guidance_scale'        => 8.0,
                'true_cfg'              => 1.0,
                'enable_safety_checker' => true,
            ];
        } else {
            $model   = $this->imageModel;
            $payload = [
                'prompt'                => $prompt
                    . ', same exact child protagonist, identical facial features, identical hairstyle,'
                    . ' identical clothing, identical eye color, same age appearance, strict character consistency across all scenes,'
                    . ' cinematic children\'s movie style, movie-quality semi-realistic digital animation,'
                    . ' warm cinematic lighting, vibrant colors, safe for kids',
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

    /**
     * Generate a scene video clip from an image.
     * $durationSeconds: desired clip length. Kling only supports 5 or 10 seconds;
     * values >= 8 request a 10s clip, anything lower requests 5s.
     */
    public function generateVideo(string $imageUrl, string $prompt, int $durationSeconds = 5): string
    {
        $this->ensureConfigured();

        // Kling supports '5' or '10' second clips — clamp to nearest valid value.
        $falDuration = $durationSeconds >= 8 ? '10' : '5';

        $payload = [
            'image_url'       => $imageUrl,
            'prompt'          => $prompt
                . ', smooth cinematic motion, natural body movement, expressive facial animation,'
                . ' consistent character identity, realistic camera movement, movie-quality animation,'
                . ' family-friendly atmosphere, warm storytelling style, gentle cinematic lighting,'
                . ' polished children\'s movie sequence',
            'duration'        => $falDuration,
            'negative_prompt' => 'blur, distort, low quality, inconsistent face, different child, changed hairstyle, changed clothing, different eye color, scary mood, unsafe content',
            'generate_audio'  => false,
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

        // How long to wait before the first poll:
        //   - Video models are very slow → wait 60s before even trying
        //   - Image models (PuLID included) wait 20s
        $isVideo     = str_contains($model, 'video');
        $initialWait = $isVideo ? 60 : 20;
        Log::info('Fal.ai polling start', [
            'model'        => $model,
            'request_id'   => $requestId,
            'initial_wait' => $initialWait,
        ]);
        sleep($initialWait);

        $maxAttempts   = max($this->pollMaxAttempts * 2, 120);
        $networkErrors = 0;
        $maxNetErrors  = 10;

        for ($i = 0; $i < $maxAttempts; $i++) {
            $response = Http::withHeaders([
                'Authorization' => 'Key ' . $this->apiKey,
            ])->timeout(30)->get($statusUrl);

            if (!$response->successful()) {
                $networkErrors++;
                Log::warning('Fal.ai poll non-200', [
                    'attempt'        => $i,
                    'http_status'    => $response->status(),
                    'body'           => $response->body(),
                    'network_errors' => $networkErrors,
                ]);
                if ($networkErrors >= $maxNetErrors) {
                    throw new \RuntimeException(
                        "Fal.ai polling aborted after {$networkErrors} consecutive network errors. request_id={$requestId}"
                    );
                }
                sleep($this->pollInterval);
                continue;
            }

            $networkErrors = 0;
            $data          = $response->json();
            $status        = strtoupper($data['status'] ?? '');
            $elapsed       = $initialWait + ($i * $this->pollInterval);

            Log::info('Fal.ai poll', [
                'attempt'    => $i,
                'status'     => $status,
                'elapsed_s'  => $elapsed,
                'request_id' => $requestId,
            ]);

            if ($status === 'COMPLETED') {
                $result = Http::withHeaders([
                    'Authorization' => 'Key ' . $this->apiKey,
                ])->timeout(60)->get($responseUrl);

                if ($result->successful()) {
                    Log::info('Fal.ai job completed', ['elapsed_s' => $elapsed, 'request_id' => $requestId]);
                    return $result->json();
                }

                throw new \RuntimeException('Fal.ai: COMPLETED but failed to fetch result: ' . $result->body());
            }

            if ($status === 'FAILED') {
                $error = $data['error'] ?? json_encode($data);
                throw new \RuntimeException('Fal.ai job failed: ' . $error);
            }

            if (isset($data['queue_position'])) {
                Log::info('Fal.ai queue position', ['position' => $data['queue_position'], 'request_id' => $requestId]);
            }

            sleep($this->pollInterval);
        }

        $totalBudget = $initialWait + ($maxAttempts * $this->pollInterval);
        throw new \RuntimeException(
            "Fal.ai polling timed out after {$totalBudget}s ({$maxAttempts} attempts). request_id={$requestId}"
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
