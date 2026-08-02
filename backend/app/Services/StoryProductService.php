<?php

namespace App\Services;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\StoryOutput;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StoryProductService
{
    private string $disk;

    private const COLORING_PROMPT = 'Convert this children\'s illustration into a clean printable coloring-book page. Thick black outlines. No shading. No gray tones. No colors. Pure black and white line art only. Large open coloring areas. Child-friendly. Professional coloring book style. White background. Bold clean outlines suitable for crayons or colored pencils.';

    public function __construct()
    {
        // IMPORTANT: scene images (FalAiService::downloadAndStore) and every
        // page/PDF built here are only ever retrievable via the 'public' disk
        // (storage/app/public + the public/storage symlink), which is the
        // only disk with a configured `url` resolver. Historically this used
        // config('filesystems.default', 'public'), which silently picked up
        // FILESYSTEM_DISK=local from .env. The 'local' disk has no `url`
        // resolver, so every Storage::disk($this->disk)->url(...) call below
        // threw RuntimeException and aborted book generation on the very
        // first page. Hardcode 'public' so this can't regress via .env.
        $this->disk = 'public';
    }

    // -------------------------------------------------------------------------
    // Story Book (using DomPDF for Arabic/English support)
    // -------------------------------------------------------------------------

    /**
     * Downloads (or resolves, if already local) an image URL to a real file
     * on disk and returns its local path, or null if it can't be fetched or
     * decoded as a valid non-zero-dimension image.
     *
     * PDF renderers (mPDF, DomPDF) internally divide by an embedded image's
     * width/height. They re-fetch every <img src="..."> themselves at render
     * time — a SEPARATE request from any check we run beforehand. A URL that
     * was valid a moment ago (signed/expiring link, flaky CDN, slow response)
     * can fail on that second fetch, leaving the renderer trying to size a
     * broken image and throwing an unhandled "Division by zero" deep in its
     * layout code. Fetching once here and handing the renderer a local,
     * already-verified file removes that second, redundant, unguarded fetch
     * entirely.
     */
    /**
     * mPDF cannot accept multiple concatenated full HTML documents (each with
     * their own <!DOCTYPE>, <html>, <head>, <body> tags) in a single WriteHTML()
     * call — it causes "Undefined array key -1" from the internal table-level
     * stack going out of sync.  This helper extracts the <style> from the first
     * page and the <body> content from every page, then wraps them into one
     * well-formed HTML document that mPDF is happy to process.
     */
    private function mergePagesForMpdf(string $concatenatedHtml): string
    {
        // Split on each full HTML document boundary
        $pages = preg_split('/<!DOCTYPE html>/i', $concatenatedHtml, -1, PREG_SPLIT_NO_EMPTY);

        $headCss   = '';
        $bodyParts = [];

        foreach ($pages as $i => $page) {
            $page = '<!DOCTYPE html>' . $page;

            // Collect <style> blocks only from the first page to avoid duplication
            if ($i === 0 && preg_match_all('/<style[^>]*>(.*?)<\/style>/si', $page, $matches)) {
                $headCss = implode("\n", $matches[1]);
            }

            // Extract the content inside <body>...</body>
            if (preg_match('/<body[^>]*>(.*?)<\/body>/si', $page, $m)) {
                $bodyParts[] = trim($m[1]);
            }
        }

        return '<!DOCTYPE html>' .
               '<html lang="ar" dir="rtl">' .
               '<head><meta charset="UTF-8">' .
               '<style>' . $headCss . '</style>' .
               '</head>' .
               '<body>' . implode("\n", $bodyParts) . '</body>' .
               '</html>';
    }

    private function cacheImageLocally(?string $url, string $tmpDir, string $name, bool $returnPath = false): ?string
    {
        if (!$url) {
            return null;
        }

        try {
            $localPath = $this->resolveLocalPath($url);
            $bytes = ($localPath && file_exists($localPath))
                ? file_get_contents($localPath)
                : @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 15]]));

            if (!$bytes) {
                Log::warning("Failed to fetch image bytes", ['url' => $url, 'local_path' => $localPath]);
                return null;
            }

            $size = @getimagesizefromstring($bytes);
            if (!$size || $size[0] <= 0 || $size[1] <= 0) {
                Log::warning("Invalid image dimensions", ['url' => $url, 'size' => $size]);
                return null;
            }

            // Additional validation: ensure minimum dimensions
            if ($size[0] < 50 || $size[1] < 50) {
                Log::warning("Image too small for PDF rendering", ['url' => $url, 'dimensions' => $size]);
                return null;
            }

            // Additional validation: ensure maximum dimensions to prevent memory issues
            if ($size[0] > 10000 || $size[1] > 10000) {
                Log::warning("Image too large for PDF rendering", ['url' => $url, 'dimensions' => $size]);
                return null;
            }

            $image = @imagecreatefromstring($bytes);
            if (!$image) {
                Log::warning("Failed to create GD image from bytes", ['url' => $url]);
                return null;
            }

            $cachedPath = "{$tmpDir}/{$name}.jpg";
            imagejpeg($image, $cachedPath, 92);
            imagedestroy($image);

            // Verify the cached file exists and is valid
            if (!file_exists($cachedPath)) {
                Log::warning("Cached file does not exist", ['cached_path' => $cachedPath]);
                return null;
            }

            $cachedSize = @getimagesize($cachedPath);
            if (!$cachedSize || $cachedSize[0] <= 0 || $cachedSize[1] <= 0) {
                Log::warning("Cached file has invalid dimensions", ['cached_path' => $cachedPath, 'size' => $cachedSize]);
                return null;
            }

            // mPDF needs a local file path; DomPDF works best with base64 data URIs
            if ($returnPath) {
                return $cachedPath;
            }

            $imageData = base64_encode(file_get_contents($cachedPath));
            $imageType = pathinfo($cachedPath, PATHINFO_EXTENSION);
            return "data:image/{$imageType};base64,{$imageData}";
        } catch (\Throwable $e) {
            Log::error("Exception in cacheImageLocally", [
                'url' => $url,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    public function generateStoryBook(Story $story): StoryOutput
    {
        $output = StoryOutput::updateOrCreate(
            ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_STORY_BOOK_PDF],
            [
                'status' => 'planned',
                'url' => null,
                'path' => null,
                'error_message' => null,
                'metadata' => [
                    'planned_at' => now()->toDateTimeString(),
                    'message' => 'Waiting for frontend-driven PDF generation',
                ]
            ]
        );

        return $output;
    }

    // -------------------------------------------------------------------------
    // Coloring Book (using DomPDF for Arabic/English support + Fal.ai line art)
    // -------------------------------------------------------------------------

    public function generateColoringBook(Story $story): StoryOutput
    {
        $output = $this->markGenerating($story, StoryOutput::TYPE_COLORING_BOOK_PDF);
        $tmpDir = storage_path('app/tmp/coloring_book_' . $story->id . '_' . uniqid());
        @mkdir($tmpDir, 0755, true);

        try {
            // Check if we already have coloring_page assets (black and white)
            $coloringAssets = $story->assets()->where('asset_type', 'coloring_page')->get();
            $images = $coloringAssets->isNotEmpty()
                ? $coloringAssets->sortBy('scene_number')  // Use existing B&W assets
                : $story->imageAssets()->get()->sortBy('scene_number');  // Or convert colored assets

            $scenes = collect($story->scenes ?? [])->keyBy('scene_number');
            $isRtl  = ($story->language ?? 'en') === 'ar';
            $language = $story->language ?? 'en';

            if ($images->isEmpty()) {
                throw new \RuntimeException('No scene images are available for coloring book generation.');
            }

            // Limit to TEST_IMAGE_COUNT for testing
            $testImageCount = (int)env('TEST_IMAGE_COUNT', 0);
            $originalImages = $images; // Keep original for conversion logic

            // Only generate B&W conversion if we don't already have coloring_page assets
            $needsConversion = $coloringAssets->isEmpty();

            if ($needsConversion) {
                // Generate black and white line art images using Fal.ai
                $falAi = app(FalAiService::class);
                
                // Limit to TEST_IMAGE_COUNT for testing
                $imagesToProcess = $testImageCount > 0 ? $originalImages->take($testImageCount) : $originalImages;

                foreach ($imagesToProcess as $asset) {
                    $scene = $scenes->get($asset->scene_number);
                    $sceneCaption = $scene['title'] ?? ('Scene ' . $asset->scene_number);

                    // Generate line art using Fal.ai
                    $rawFalImage = $this->createLineArtPageViaFal($tmpDir, $asset, $falAi, $sceneCaption);

                    // Load the image as GD resource
                    $gdImage = imagecreatefromstring(file_get_contents($rawFalImage));
                    if (!$gdImage) {
                        throw new \RuntimeException("Failed to load image for B&W conversion: {$rawFalImage}");
                    }

                    // Convert to pure black and white line art
                    $lineArtGd = $this->convertToPureLineArt($gdImage);

                    // Save B&W image to temp file
                    $lineArtPath = "{$tmpDir}/bw_lineart_{$asset->scene_number}.jpg";
                    imagejpeg($lineArtGd, $lineArtPath, 95);
                    imagedestroy($gdImage);
                    imagedestroy($lineArtGd);

                    // Store the black and white line art as the coloring page asset
                    $coloringStoragePath = "stories/{$story->id}/coloring/pages/scene_{$asset->scene_number}.jpg";
                    Storage::disk($this->disk)->put($coloringStoragePath, file_get_contents($lineArtPath), ['visibility' => 'public']);

                    StoryAsset::updateOrCreate(
                        ['story_id' => $story->id, 'scene_number' => $asset->scene_number, 'asset_type' => 'coloring_page'],
                        ['url' => Storage::disk($this->disk)->url($coloringStoragePath), 'prompt' => self::COLORING_PROMPT]
                    );

                    // Clean up temp files
                    if (file_exists($rawFalImage)) unlink($rawFalImage);
                    if (file_exists($lineArtPath)) unlink($lineArtPath);
                }

                // Refresh images to use the new coloring_page assets
                $images = $story->assets()->where('asset_type', 'coloring_page')->get()->sortBy('scene_number');
            } else {
                // Use existing coloring_page assets
                $images = $coloringAssets->sortBy('scene_number');
            }
            
            // B&W images generated. Now mark the output as planned for frontend PDF generation.
            $output->update([
                'status' => 'planned',
                'url' => null,
                'path' => null,
                'error_message' => null,
                'metadata' => [
                    'planned_at' => now()->toDateTimeString(),
                    'message' => 'Waiting for frontend-driven PDF generation',
                    'page_count' => $images->count() + 1 // +1 for cover
                ]
            ]);

            return $output;
        } catch (\Throwable $e) {
            return $this->markFailed($output, $e);
        } finally {
            $this->cleanupDirectory($tmpDir);
        }
    }

    // -------------------------------------------------------------------------
    // Register existing media outputs (video / audio)
    // -------------------------------------------------------------------------

    public function registerExistingMediaOutputs(Story $story): void
    {
        if ($story->assembled_video_url || $story->video_url) {
            StoryOutput::updateOrCreate(
                ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_FINAL_VIDEO],
                ['status' => 'completed', 'url' => $story->assembled_video_url ?: $story->video_url, 'metadata' => ['format' => 'MP4']]
            );
        }

        if ($story->narration_url) {
            StoryOutput::updateOrCreate(
                ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_NARRATION_AUDIO],
                ['status' => 'completed', 'url' => $story->narration_url, 'metadata' => ['format' => 'audio']]
            );
        }

        StoryOutput::updateOrCreate(
            ['story_id' => $story->id, 'output_type' => StoryOutput::TYPE_ACTIVITY_BOOK_PDF],
            [
                'status'   => 'planned',
                'metadata' => [
                    'planned_activities' => ['maze', 'word_search', 'matching_game', 'spot_the_difference', 'trace_child_name'],
                    'architecture_note'  => 'Reserved output record for future GenerateActivityBookJob.',
                ],
            ]
        );
    }

    // =========================================================================
    // Coloring Book — Fal.ai Line Art Generation
    // =========================================================================

    private function createLineArtPageViaFal(string $tmpDir, StoryAsset $asset, FalAiService $falAi, string $caption): string
    {
        try {
            // Generate a new line art image directly from fal.ai instead of converting existing image
            $story = $asset->story;
            $sceneNumber = $asset->scene_number;

            // Build the scene-specific prompt
            $scene = collect($story->scenes ?? [])->firstWhere('scene_number', $sceneNumber);
            $scenePrompt = $scene['text'] ?? $scene['description'] ?? $caption;

            // Get the child's photo if available for character consistency
            $photoUrl = $story->child_photo_url ?? null;

            // Generate line art image specifically for coloring book
            Log::info("Generating Fal.ai line art for scene {$sceneNumber}");
            $lineArtUrl = $falAi->generateLineArtImage($scenePrompt, $photoUrl);
            Log::info("Fal.ai line art generated for scene {$sceneNumber}: {$lineArtUrl}");

            // Download the line art image
            $response = \Illuminate\Support\Facades\Http::timeout(120)->get($lineArtUrl);
            if (!$response->successful()) {
                throw new \RuntimeException("Failed to download Fal.ai line art result for scene {$sceneNumber}");
            }

            // Save the raw Fal.ai image for later B&W conversion
            $path = "{$tmpDir}/coloring_fal_raw_{$sceneNumber}.jpg";
            file_put_contents($path, $response->body());
            return $path;
        } catch (\Throwable $e) {
            Log::error("Fal.ai line art generation failed for scene {$asset->scene_number}", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            // Don't fall back to GD - fail the whole coloring book generation
            throw new \RuntimeException("Line art generation failed for scene {$asset->scene_number}: " . $e->getMessage());
        }
    }

    /**
     * Converts any source image (photo, illustration, or an AI img2img
     * result) into genuine pure-black-and-white coloring-book line art:
     * no gray tones, no shading, bold thickened outlines.
     *
     * This runs unconditionally — even on Fal.ai output — because a
     * diffusion model's "line art" still contains anti-aliased grays at
     * full resolution; only an explicit hard threshold guarantees the
     * "pure black and white only" requirement actually holds.
     */
    private function convertToPureLineArt(\GdImage $source, int $workingWidth = 800): \GdImage
    {
        // Pure GD implementation - no Intervention Image to avoid API issues
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);

        if ($sourceWidth <= 0 || $sourceHeight <= 0) {
            throw new \RuntimeException("Invalid image dimensions ({$sourceWidth}x{$sourceHeight}) — cannot convert to line art.");
        }

        // Create working canvas at smaller resolution for performance
        $scale = $workingWidth / $sourceWidth;
        $workingHeight = (int)($sourceHeight * $scale);

        $working = imagecreatetruecolor($workingWidth, $workingHeight);
        imagecopyresampled($working, $source, 0, 0, 0, 0, $workingWidth, $workingHeight, $sourceWidth, $sourceHeight);

        // Convert to grayscale using proper luminance formula
        $width = imagesx($working);
        $height = imagesy($working);

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                $color = imagecolorat($working, $x, $y);
                $r = ($color >> 16) & 0xFF;
                $g = ($color >> 8) & 0xFF;
                $b = $color & 0xFF;

                // Proper luminance formula (NTSC standard)
                $luminance = (0.299 * $r) + (0.587 * $g) + (0.114 * $b);

                // Hard threshold: pure black or white
                $gray = $luminance > 128 ? 255 : 0;

                imagesetpixel($working, $x, $y, ($gray << 16) | ($gray << 8) | $gray);
            }
        }

        // Optional: Dilate to make lines thicker
        $this->dilateImage($working);

        return $working;
    }

    /**
     * Dilate image to make lines thicker
     */
    private function dilateImage(\GdImage $image): void
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $temp = imagecreatetruecolor($width, $height);

        for ($y = 1; $y < $height - 1; $y++) {
            for ($x = 1; $x < $width - 1; $x++) {
                $neighbors = 0;
                for ($dy = -1; $dy <= 1; $dy++) {
                    for ($dx = -1; $dx <= 1; $dx++) {
                        $color = imagecolorat($image, $x + $dx, $y + $dy);
                        $gray = ($color >> 8) & 0xFF;
                        if ($gray < 128) $neighbors++;
                    }
                }

                if ($neighbors >= 5) {
                    imagesetpixel($temp, $x, $y, 0);
                } else {
                    imagesetpixel($temp, $x, $y, 0xFFFFFF);
                }
            }
        }

        imagecopy($image, $temp, 0, 0, 0, 0, $width, $height);
        imagedestroy($temp);
    }

    // =========================================================================
    // Image Resolution Helpers
    // =========================================================================

    private function resolveLocalPath(string $url): ?string
    {
        $baseUrl = rtrim(Storage::disk($this->disk)->url(''), '/');
        if (str_starts_with($url, $baseUrl)) {
            $relative = ltrim(substr($url, strlen($baseUrl)), '/');
            return Storage::disk($this->disk)->path($relative);
        }
        if (!str_starts_with($url, 'http')) {
            return Storage::disk($this->disk)->path(ltrim($url, '/'));
        }
        return null;
    }

    // =========================================================================
    // Shared Output Helpers
    // =========================================================================

    private function markGenerating(Story $story, string $type): StoryOutput
    {
        return StoryOutput::updateOrCreate(
            ['story_id' => $story->id, 'output_type' => $type],
            ['status' => 'generating', 'error_message' => null]
        );
    }

    private function markCompleted(StoryOutput $output, string $path, array $metadata): StoryOutput
    {
        $output->update([
            'status'        => 'completed',
            'storage_path'  => $path,
            'url'           => Storage::disk($this->disk)->url($path),
            'metadata'      => $metadata,
            'error_message' => null,
        ]);
        return $output->fresh();
    }

    private function markFailed(StoryOutput $output, \Throwable $e): StoryOutput
    {
        Log::error('Story product generation failed', ['output_id' => $output->id, 'error' => $e->getMessage()]);
        $output->update(['status' => 'failed', 'error_message' => mb_substr($e->getMessage(), 0, 500)]);
        return $output->fresh();
    }

    private function cleanupDirectory(string $dir): void
    {
        if (!is_dir($dir)) return;
        foreach (glob($dir . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($dir);
    }
}
