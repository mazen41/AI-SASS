<?php

namespace App\Services;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\StoryOutput;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StoryProductService
{
    private int $pageWidth = 1240;
    private int $pageHeight = 1754;
    private string $disk;

    public function __construct()
    {
        $this->disk = config('filesystems.default', 'public');
    }

    public function generateStoryBook(Story $story): StoryOutput
    {
        $output = $this->markGenerating($story, StoryOutput::TYPE_STORY_BOOK_PDF);
        $tmpDir = storage_path('app/tmp/story_book_' . $story->id . '_' . uniqid());
        @mkdir($tmpDir, 0755, true);

        try {
            $story->loadMissing('assets');
            $scenes = collect($story->scenes ?? [])->keyBy('scene_number');
            $images = $story->imageAssets()->get()->keyBy('scene_number');
            $isRtl = ($story->language ?? 'en') === 'ar';
            $pages = [];

            $coverImage = $images->first();
            $pages[] = $this->createStoryBookPage(
                $tmpDir,
                'cover',
                $story->title,
                $story->child_name ? (($isRtl ? 'بطولة ' : 'Starring ') . $story->child_name) : '',
                $coverImage?->url,
                $isRtl,
                true
            );

            foreach ($scenes->sortKeys()->take(6) as $sceneNumber => $scene) {
                $asset = $images->get($sceneNumber);
                $pages[] = $this->createStoryBookPage(
                    $tmpDir,
                    'scene_' . $sceneNumber,
                    ($isRtl ? 'الصفحة ' : 'Page ') . $sceneNumber,
                    $scene['text'] ?? $scene['description'] ?? '',
                    $asset?->url,
                    $isRtl,
                    false
                );
            }

            $pages[] = $this->createTextOnlyPage(
                $tmpDir,
                'ending',
                $isRtl ? 'النهاية' : 'The End',
                $isRtl
                    ? 'أحسنت! احتفظ بهذه القصة وشاركها مع عائلتك.'
                    : 'Great job! Keep this story and share it with your family.',
                $isRtl
            );

            $pdfBytes = $this->buildImagePdf($pages);
            $path = "stories/{$story->id}/books/story_book.pdf";
            Storage::disk($this->disk)->put($path, $pdfBytes, ['visibility' => 'public']);

            return $this->markCompleted($output, $path, [
                'page_count' => count($pages),
                'format' => 'A4 portrait PDF',
                'viewer' => 'web_story_book',
                'rtl' => $isRtl,
            ]);
        } catch (\Throwable $e) {
            return $this->markFailed($output, $e);
        } finally {
            $this->cleanupDirectory($tmpDir);
        }
    }

    public function generateColoringBook(Story $story): StoryOutput
    {
        $output = $this->markGenerating($story, StoryOutput::TYPE_COLORING_BOOK_PDF);
        $tmpDir = storage_path('app/tmp/coloring_book_' . $story->id . '_' . uniqid());
        @mkdir($tmpDir, 0755, true);

        try {
            $images = $story->imageAssets()->get()->sortBy('scene_number');
            if ($images->isEmpty()) {
                throw new \RuntimeException('No scene images are available for coloring book generation.');
            }

            $pages = [];
            foreach ($images->take(6) as $asset) {
                $lineArtPath = $this->createLineArtPage($tmpDir, $asset);
                StoryAsset::updateOrCreate(
                    [
                        'story_id' => $story->id,
                        'scene_number' => $asset->scene_number,
                        'asset_type' => 'coloring_page',
                    ],
                    [
                        'url' => Storage::disk($this->disk)->url($this->storeTmpImage($lineArtPath, "stories/{$story->id}/coloring/scene_{$asset->scene_number}.jpg")),
                        'prompt' => 'Black and white child-safe coloring-book line art transformed from scene image.',
                    ]
                );
                $pages[] = $lineArtPath;
            }

            $pdfBytes = $this->buildImagePdf($pages);
            $path = "stories/{$story->id}/books/coloring_book.pdf";
            Storage::disk($this->disk)->put($path, $pdfBytes, ['visibility' => 'public']);

            return $this->markCompleted($output, $path, [
                'page_count' => count($pages),
                'format' => 'print-ready A4 portrait PDF',
                'source' => 'gd_line_art_transform',
                'child_safe' => true,
            ]);
        } catch (\Throwable $e) {
            return $this->markFailed($output, $e);
        } finally {
            $this->cleanupDirectory($tmpDir);
        }
    }

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
                'status' => 'planned',
                'metadata' => [
                    'planned_activities' => ['maze', 'word_search', 'matching_game', 'spot_the_difference', 'trace_child_name'],
                    'architecture_note' => 'Reserved output record for future activity-book generation jobs.',
                ],
            ]
        );
    }

    private function createStoryBookPage(string $tmpDir, string $name, string $title, string $body, ?string $imageUrl, bool $rtl, bool $cover): string
    {
        $canvas = $this->blankPage([255, 252, 246]);
        $font = $this->fontPath();
        $dark = imagecolorallocate($canvas, 45, 35, 64);
        $muted = imagecolorallocate($canvas, 94, 83, 114);
        $accent = imagecolorallocate($canvas, 105, 95, 255);

        imagefilledrectangle($canvas, 0, 0, $this->pageWidth, 18, $accent);
        $this->drawText($canvas, $title, $font, $cover ? 54 : 34, 90, $cover ? 120 : 80, $dark, $rtl, $this->pageWidth - 180);

        if ($imageUrl) {
            $source = $this->resolveImage($imageUrl);
            if ($source) {
                $this->copyImageIntoBox($canvas, $source, 90, $cover ? 260 : 155, $this->pageWidth - 180, $cover ? 800 : 820);
                imagedestroy($source);
            }
        }

        $bodyY = $cover ? 1120 : 1050;
        $this->drawWrappedText($canvas, $body, $font, $cover ? 30 : 28, 110, $bodyY, $muted, $rtl, $this->pageWidth - 220, 1.45);

        $path = "{$tmpDir}/{$name}.jpg";
        imagejpeg($canvas, $path, 92);
        imagedestroy($canvas);
        return $path;
    }

    private function createTextOnlyPage(string $tmpDir, string $name, string $title, string $body, bool $rtl): string
    {
        $canvas = $this->blankPage([247, 250, 255]);
        $font = $this->fontPath();
        $dark = imagecolorallocate($canvas, 45, 35, 64);
        $muted = imagecolorallocate($canvas, 94, 83, 114);
        $accent = imagecolorallocate($canvas, 255, 118, 164);
        imagefilledellipse($canvas, (int)($this->pageWidth / 2), 520, 460, 460, $accent);
        $this->drawText($canvas, $title, $font, 64, 120, 500, $dark, $rtl, $this->pageWidth - 240);
        $this->drawWrappedText($canvas, $body, $font, 32, 160, 720, $muted, $rtl, $this->pageWidth - 320, 1.6);
        $path = "{$tmpDir}/{$name}.jpg";
        imagejpeg($canvas, $path, 92);
        imagedestroy($canvas);
        return $path;
    }

    private function createLineArtPage(string $tmpDir, StoryAsset $asset): string
    {
        $source = $this->resolveImage($asset->url);
        if (!$source) {
            throw new \RuntimeException("Unable to read scene image {$asset->scene_number} for coloring book.");
        }

        $page = imagecreatetruecolor($this->pageWidth, $this->pageHeight);
        $white = imagecolorallocate($page, 255, 255, 255);
        $black = imagecolorallocate($page, 30, 30, 30);
        imagefill($page, 0, 0, $white);

        imagefilter($source, IMG_FILTER_GRAYSCALE);
        imagefilter($source, IMG_FILTER_EDGEDETECT);
        imagefilter($source, IMG_FILTER_NEGATE);
        imagefilter($source, IMG_FILTER_CONTRAST, -45);
        imagefilter($source, IMG_FILTER_BRIGHTNESS, 18);

        $this->copyImageIntoBox($page, $source, 110, 185, $this->pageWidth - 220, 1120, true);
        $font = $this->fontPath();
        $this->drawText($page, 'Coloring Page ' . $asset->scene_number, $font, 34, 110, 95, $black, false, $this->pageWidth - 220);
        $this->drawText($page, 'Use your favorite colors!', $font, 24, 110, 142, $black, false, $this->pageWidth - 220);

        $path = "{$tmpDir}/coloring_scene_{$asset->scene_number}.jpg";
        imagejpeg($page, $path, 95);
        imagedestroy($source);
        imagedestroy($page);
        return $path;
    }

    private function blankPage(array $rgb): \GdImage
    {
        $canvas = imagecreatetruecolor($this->pageWidth, $this->pageHeight);
        $bg = imagecolorallocate($canvas, $rgb[0], $rgb[1], $rgb[2]);
        imagefill($canvas, 0, 0, $bg);
        return $canvas;
    }

    private function copyImageIntoBox(\GdImage $canvas, \GdImage $source, int $x, int $y, int $boxW, int $boxH, bool $contain = false): void
    {
        $srcW = imagesx($source);
        $srcH = imagesy($source);
        $scale = $contain ? min($boxW / $srcW, $boxH / $srcH) : max($boxW / $srcW, $boxH / $srcH);
        $newW = (int) round($srcW * $scale);
        $newH = (int) round($srcH * $scale);
        $dstX = $x + (int) round(($boxW - $newW) / 2);
        $dstY = $y + (int) round(($boxH - $newH) / 2);
        imagecopyresampled($canvas, $source, $dstX, $dstY, 0, 0, $newW, $newH, $srcW, $srcH);
    }

    private function drawWrappedText(\GdImage $canvas, string $text, string $font, int $size, int $x, int $y, int $color, bool $rtl, int $maxWidth, float $lineHeight): void
    {
        $words = preg_split('/\s+/u', trim($text)) ?: [];
        $lines = [];
        $line = '';
        foreach ($words as $word) {
            $test = trim($line . ' ' . $word);
            $box = imagettfbbox($size, 0, $font, $test);
            if ($line !== '' && ($box[2] - $box[0]) > $maxWidth) {
                $lines[] = $line;
                $line = $word;
            } else {
                $line = $test;
            }
        }
        if ($line !== '') $lines[] = $line;

        $currentY = $y;
        foreach ($lines as $lineText) {
            $this->drawText($canvas, $lineText, $font, $size, $x, $currentY, $color, $rtl, $maxWidth);
            $currentY += (int) round($size * $lineHeight);
        }
    }

    private function drawText(\GdImage $canvas, string $text, string $font, int $size, int $x, int $baselineY, int $color, bool $rtl, int $maxWidth): void
    {
        $display = $rtl ? $this->prepareRtlText($text) : $text;
        $box = imagettfbbox($size, 0, $font, $display);
        $width = $box ? ($box[2] - $box[0]) : 0;
        $drawX = $rtl ? ($x + $maxWidth - $width) : $x;
        imagettftext($canvas, $size, 0, $drawX, $baselineY, $color, $font, $display);
    }

    private function prepareRtlText(string $text): string
    {
        $parts = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
        return $parts ? implode('', array_reverse($parts)) : $text;
    }

    private function resolveImage(string $url): ?\GdImage
    {
        $path = $this->resolveLocalPath($url);
        $bytes = null;
        if ($path && file_exists($path)) {
            $bytes = file_get_contents($path);
        } elseif (filter_var($url, FILTER_VALIDATE_URL)) {
            $bytes = @file_get_contents($url);
        }

        if (!$bytes) return null;
        $image = @imagecreatefromstring($bytes);
        return $image ?: null;
    }

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

    private function storeTmpImage(string $localPath, string $storagePath): string
    {
        Storage::disk($this->disk)->put($storagePath, file_get_contents($localPath), ['visibility' => 'public']);
        return $storagePath;
    }

    /**
     * Build a standards-compliant PDF where each page is a full-page JPEG image.
     */
    private function buildImagePdf(array $jpegPaths): string
    {
        $objects = [];
        $pageIds = [];
        $imageIds = [];
        $contentIds = [];
        $nextId = 1;
        $catalogId = $nextId++;
        $pagesId = $nextId++;

        foreach ($jpegPaths as $path) {
            $pageIds[] = $nextId++;
            $imageIds[] = $nextId++;
            $contentIds[] = $nextId++;
        }

        $objects[$catalogId] = "<< /Type /Catalog /Pages {$pagesId} 0 R >>";
        $kids = implode(' ', array_map(fn ($id) => "{$id} 0 R", $pageIds));
        $objects[$pagesId] = "<< /Type /Pages /Kids [{$kids}] /Count " . count($pageIds) . " >>";

        foreach ($jpegPaths as $index => $path) {
            [$imgW, $imgH] = getimagesize($path);
            $imageData = file_get_contents($path);
            $imageId = $imageIds[$index];
            $contentId = $contentIds[$index];
            $pageId = $pageIds[$index];
            $name = 'Im' . ($index + 1);
            $objects[$imageId] = "<< /Type /XObject /Subtype /Image /Width {$imgW} /Height {$imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($imageData) . " >>\nstream\n" . $imageData . "\nendstream";
            $content = "q\n595 0 0 842 0 0 cm\n/{$name} Do\nQ";
            $objects[$contentId] = "<< /Length " . strlen($content) . " >>\nstream\n{$content}\nendstream";
            $objects[$pageId] = "<< /Type /Page /Parent {$pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /{$name} {$imageId} 0 R >> >> /Contents {$contentId} 0 R >>";
        }

        ksort($objects);
        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [0];
        foreach ($objects as $id => $body) {
            $offsets[$id] = strlen($pdf);
            $pdf .= "{$id} 0 obj\n{$body}\nendobj\n";
        }
        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }
        $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root {$catalogId} 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";
        return $pdf;
    }

    private function fontPath(): string
    {
        $candidates = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
        ];
        foreach ($candidates as $candidate) {
            if (file_exists($candidate)) return $candidate;
        }
        throw new \RuntimeException('No TrueType font found for story product rendering.');
    }

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
            'status' => 'completed',
            'storage_path' => $path,
            'url' => Storage::disk($this->disk)->url($path),
            'metadata' => $metadata,
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
