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
        // IMPORTANT: scene images and every
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
                // Convert existing story book images to line art using Fal.ai
                // (nano-banana / nano-banana-pro image-edit models). Gemini's
                // plain chat models never returned image data, only text, so
                // this path always failed silently under GeminiService.
                $falAi = app(FalAiService::class);
                
                // Limit to TEST_IMAGE_COUNT for testing
                $imagesToProcess = $testImageCount > 0 ? $originalImages->take($testImageCount) : $originalImages;

                foreach ($imagesToProcess as $asset) {
                    $scene = $scenes->get($asset->scene_number);
                    
                    // Get the local path of the story book image
                    $localPath = $this->resolveLocalPath($asset->url);
                    if (!$localPath || !file_exists($localPath)) {
                        Log::warning("Story book image not found locally for line art conversion", ['url' => $asset->url]);
                        continue;
                    }

                    try {
                        // Convert to line art using Fal.ai
                        Log::info("Converting story book image to line art using Fal.ai", ['scene_number' => $asset->scene_number]);
                        $lineArtDataUri = $falAi->convertToLineArt($localPath);
                        
                        // Extract base64 data from data URI
                        if (preg_match('/^data:image\/(\w+);base64,(.+)$/', $lineArtDataUri, $matches)) {
                            $imageData = base64_decode($matches[2]);
                            
                            // Save line art image to temp file
                            $lineArtPath = "{$tmpDir}/bw_lineart_{$asset->scene_number}.jpg";
                            file_put_contents($lineArtPath, $imageData);
                            
                            // Store the line art as the coloring page asset
                            $coloringStoragePath = "stories/{$story->id}/coloring/pages/scene_{$asset->scene_number}.jpg";
                            Storage::disk($this->disk)->put($coloringStoragePath, file_get_contents($lineArtPath), ['visibility' => 'public']);

                            StoryAsset::updateOrCreate(
                                ['story_id' => $story->id, 'scene_number' => $asset->scene_number, 'asset_type' => 'coloring_page'],
                                ['url' => Storage::disk($this->disk)->url($coloringStoragePath), 'prompt' => 'Fal.ai (nano-banana) line art conversion']
                            );

                            // Clean up temp file
                            if (file_exists($lineArtPath)) unlink($lineArtPath);
                            
                            Log::info("Line art conversion completed for scene", ['scene_number' => $asset->scene_number]);
                        } else {
                            throw new \RuntimeException("Invalid data URI format from Fal.ai");
                        }
                    } catch (\Throwable $e) {
                        Log::error("Failed to convert image to line art using Fal.ai", [
                            'scene_number' => $asset->scene_number,
                            'error' => $e->getMessage()
                        ]);
                        // Continue with other images even if one fails
                        continue;
                    }
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
    // Coloring Book — Gemini Line Art Conversion
    // =========================================================================

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
