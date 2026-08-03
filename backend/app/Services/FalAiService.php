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
    private string $lineArtModel;
    private string $lineArtFallbackModel;
    private int $pollInterval;
    private int $pollMaxAttempts;

    public function __construct()
    {
        $this->apiKey               = (string) config('services.fal.key', '');
        $this->imageModel           = config('services.fal.image_model', 'fal-ai/flux-pro/v1.1');
        $this->videoModel           = config('services.fal.video_model', 'fal-ai/kling-video/v2.6/pro/image-to-video');
        $this->lineArtModel         = config('services.fal.lineart_model', 'fal-ai/nano-banana/edit');
        $this->lineArtFallbackModel = config('services.fal.lineart_fallback_model', 'fal-ai/nano-banana-pro/edit');
        $this->pollInterval         = (int) config('services.fal.poll_interval', 5);
        $this->pollMaxAttempts      = (int) config('services.fal.poll_max_attempts', 60);
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
        $initResponse = Http::retry(3, 1000)->withHeaders([
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
        $putResponse = Http::retry(3, 1000)->withHeaders([
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

    /**
     * Generate a black and white line art image for coloring books.
     *
     * Uses fal-ai/flux/schnell — the only Fal model that reliably honours
     * monochrome/coloring-book style prompts. flux-pro and PuLID always
     * produce full-colour output regardless of the prompt wording.
     *
     * The caller (StoryProductService) applies an additional hard-threshold
     * GD pass to guarantee truly pure black/white pixels.
     */
    public function generateLineArtImage(string $prompt, ?string $photoUrl = null, ?int $childAge = null): string
    {
        $this->ensureConfigured();

        // Use flux/dev for line art — more capable of following detailed style instructions.
        // schnell (4-step distilled) ignores nuanced style prompts and produces coloured images.
        // We intentionally ignore $photoUrl here: photo-consistency models always generate
        // full-colour images regardless of the prompt.
        $model = 'fal-ai/flux/dev';

        // Keep the scene description short and put style keywords up front
        $sceneDescription = mb_substr(trim($prompt), 0, 120); // cap scene text
        $ageText = $childAge ? "a {$childAge}-year-old child" : 'a young child';

        $lineArtPrompt =
            'children coloring book page, black and white line art only, '
            . 'thick bold black outlines on pure white background, '
            . 'no color, no shading, no gradients, no gray tones, '
            . 'large open areas for coloring, simple clean cartoon style, '
            . 'cute friendly characters, '
            . "{$ageText}, "
            . $sceneDescription . ', '
            . 'professional printable coloring book illustration, '
            . 'high contrast pure black ink on white paper';

        $negativePrompt =
            'color, coloured, shading, gradients, gray, grey, photograph, photo, '
            . 'realistic, 3d render, watercolor, painting, dark background, '
            . 'filled areas, textures, noise, blurry, sketch lines, cross-hatching';

        $payload = [
            'prompt'                => $lineArtPrompt,
            'negative_prompt'       => $negativePrompt,
            'num_images'            => 1,
            'image_size'            => 'portrait_4_3',
            'num_inference_steps'   => 28,  // dev needs more steps for quality
            'guidance_scale'        => 7.5, // higher guidance = better prompt adherence
            'enable_safety_checker' => true,
        ];

        Log::info('Fal.ai line art: submitting to flux/dev', [
            'prompt_preview' => substr($lineArtPrompt, 0, 120),
        ]);

        [$requestId, $statusUrl, $responseUrl] = $this->submitRequest($model, $payload);
        $result = $this->pollForResult($model, $requestId, $statusUrl, $responseUrl);

        $imageUrl = $result['images'][0]['url'] ?? null;
        if (!$imageUrl) {
            Log::error('Fal.ai line art image: no URL in response', ['result' => $result]);
            throw new \RuntimeException('No image URL in Fal.ai line art response');
        }

        Log::info('Fal.ai line art: image received', ['url' => $imageUrl]);
        return $imageUrl;
    }

    /**
     * Convert an existing image into a black-and-white coloring-book line
     * art page using fal.ai's image-editing models.
     *
     * Replaces the old Gemini-based convertToLineArt(): Gemini's plain chat
     * models (gemini-2.0-flash and friends) never return inline_data images,
     * only text — so that path always failed silently. nano-banana/edit and
     * nano-banana-pro/edit are true image-to-image edit models and reliably
     * return a generated image.
     *
     * Tries the cheap/fast model first (fal-ai/nano-banana/edit, ~$0.039/img)
     * and falls back to the higher-fidelity model (fal-ai/nano-banana-pro/edit,
     * ~$0.15/img) if the primary fails or returns no image.
     *
     * Returns a base64 data URI (same contract as the old Gemini method) so
     * existing callers (e.g. StoryProductService::generateColoringBook)
     * don't need to change how they consume the result.
     */
    public function convertToLineArt(string $localImagePath): string
    {
        $this->ensureConfigured();

        if (!file_exists($localImagePath)) {
            throw new \RuntimeException("File not found for line art conversion: {$localImagePath}");
        }

        // Upload the source photo so fal's workers can fetch it.
        $imageUrl = $this->uploadFileToFal($localImagePath);

        $lineArtPrompt = "Convert this image into a children's coloring book page. "
            . 'PURE black and white line art only. '
            . 'White background, clean black outlines. '
            . 'NO color, NO shading, NO gradients, NO gray tones, NO shadows. '
            . 'Use thick, bold, smooth outlines. '
            . 'Simplify all details to be kid-friendly and easy to color. '
            . 'Remove unnecessary textures and small details. '
            . 'Keep the main subject clearly recognizable. '
            . 'Maintain original composition and proportions. '
            . 'Style: simple cartoon line art, coloring book style, vector-like clean ink drawing. '
            . 'High resolution, crisp edges, print-ready.';

        $models    = [$this->lineArtModel, $this->lineArtFallbackModel];
        $lastError = null;

        foreach ($models as $model) {
            try {
                Log::info('Fal.ai line art conversion: submitting', ['model' => $model]);

                $payload = [
                    'prompt'     => $lineArtPrompt,
                    'image_urls' => [$imageUrl],
                ];

                [$requestId, $statusUrl, $responseUrl] = $this->submitRequest($model, $payload);
                $result = $this->pollForResult($model, $requestId, $statusUrl, $responseUrl);

                $resultImageUrl = $result['images'][0]['url'] ?? null;
                if (!$resultImageUrl) {
                    throw new \RuntimeException("No image URL in {$model} response: " . json_encode($result));
                }

                // Download the result and re-encode as a data URI so the
                // return contract matches the old Gemini-based method.
                $imageResponse = Http::timeout(60)->get($resultImageUrl);
                if (!$imageResponse->successful()) {
                    throw new \RuntimeException("Failed to download line art result from {$model}: " . $imageResponse->status());
                }

                $mime   = $imageResponse->header('Content-Type') ?: 'image/jpeg';
                $base64 = base64_encode($imageResponse->body());

                Log::info('Fal.ai line art conversion completed', ['model' => $model]);

                return "data:{$mime};base64,{$base64}";
            } catch (\Throwable $e) {
                $lastError = $e;
                Log::warning("Fal.ai model {$model} failed for line art conversion, trying fallback", [
                    'model' => $model,
                    'error' => substr($e->getMessage(), 0, 300),
                ]);
                continue;
            }
        }

        throw new \RuntimeException('All Fal.ai models failed for line art conversion. Last error: ' . $lastError?->getMessage());
    }

    public function generateImage(string $prompt, ?string $photoUrl = null, ?int $childAge = null): string
    {
        $this->ensureConfigured();

        // Add age to prompt if provided
        $agePrompt = $childAge ? ", child aged exactly {$childAge} years old" : '';

        if ($photoUrl) {
            // Always upload photos to Fal storage to avoid accessibility issues
            // This ensures fal.ai can always access the reference image regardless of network/firewall
            Log::info('Uploading photo to Fal storage for reliable access', ['original_url' => $photoUrl]);
            // Always 'public' — see downloadAndStore() below for why.
            $disk      = 'public';
            $baseUrl   = rtrim(Storage::disk($disk)->url(''), '/');
            $relative  = ltrim(substr($photoUrl, strlen($baseUrl)), '/');
            $localPath = Storage::disk($disk)->path($relative);
            $photoUrl  = $this->uploadFileToFal($localPath);
            Log::info('Photo uploaded to Fal storage', ['fal_url' => $photoUrl]);

            // Use PuLID — face-identity-preserving model.
            // This keeps the child's actual face consistent across every scene.
            $model   = 'fal-ai/flux-pulid';
            $payload = [
                'prompt'                => $prompt
                    . ', SAME exact child protagonist as the reference image, DO NOT change identity,'
                    . ' identical face structure, identical facial proportions, identical eyes, nose, mouth,'
                    . ' identical hairstyle, identical hair texture, identical clothing and colors,'
                    . ' EXACT SAME AGE (no aging up or down), maintain child proportions strictly,'
                    . $agePrompt
                    . ', consistent height, body proportions, and facial maturity across ALL scenes,'
                    . ' no variation in age, no взросление, no stylization drift, same child identity locked,'
                    . ' strong character consistency, fixed identity seed, same person in every frame,'
                    . ' cinematic children\'s movie style, high-end Pixar/Disney-quality semi-realistic rendering,'
                    . ' soft warm cinematic lighting, global illumination, natural skin tones,'
                    . ' highly expressive eyes, detailed face but still childlike softness preserved,'
                    . ' vibrant magical storybook environment, family-friendly, rich colors, depth of field,'
                    . ' ultra-consistent character design, no randomness in face or age, no reinterpretation',
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
                    . ', SAME exact child protagonist, DO NOT change identity,'
                    . ' identical face structure, identical facial proportions, identical eyes, nose, mouth,'
                    . ' identical hairstyle, identical hair texture, identical clothing and colors,'
                    . ' EXACT SAME AGE (no aging up or down), maintain child proportions strictly,'
                    . $agePrompt
                    . ', consistent height, body proportions, and facial maturity across ALL scenes,'
                    . ' no variation in age, no взросление, no stylization drift, same child identity locked,'
                    . ' strong character consistency, fixed identity seed, same person in every frame,'
                    . ' cinematic children\'s movie style, high-end Pixar/Disney-quality semi-realistic rendering,'
                    . ' soft warm cinematic lighting, global illumination, natural skin tones,'
                    . ' highly expressive eyes, detailed face but still childlike softness preserved,'
                    . ' vibrant magical storybook environment, family-friendly, rich colors, depth of field,'
                    . ' ultra-consistent character design, no randomness in face or age, no reinterpretation',
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

        // Hardcoded to 'public': this is the only disk with a configured
        // `url` resolver (see config/filesystems.php). Using
        // config('filesystems.default') here previously picked up
        // FILESYSTEM_DISK=local from .env, whose disk has no `url` resolver
        // and throws RuntimeException on ->url() — silently breaking asset
        // storage whenever local dev/deploy left FILESYSTEM_DISK unset to
        // its Laravel default of 'local'.
        $disk = 'public';
        Storage::disk($disk)->put($storagePath, $response->body());

        return Storage::disk($disk)->url($storagePath);
    }
}
