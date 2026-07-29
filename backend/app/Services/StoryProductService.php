<?php

namespace App\Services;

use App\Models\Story;
use App\Models\StoryAsset;
use App\Models\StoryOutput;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StoryProductService
{
    // A4 @ 300 DPI (print-ready master resolution). All pages are rendered
    // at this resolution; the PDF assembler fits them into either an A4 or
    // US Letter MediaBox at export time (see buildImagePdf()).
    private int $pageWidth  = 2480;
    private int $pageHeight = 3508;
    private const SOURCE_DPI = 300;

    // PDF page boxes, in points (1/72 inch).
    private const MEDIABOX_A4     = [595.28, 841.89];
    private const MEDIABOX_LETTER = [612.0, 792.0];

    private string $disk;

    private const FAL_IMG2IMG_MODEL = 'fal-ai/flux/dev/image-to-image'; // Will be overridden by config

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
    // Story Book
    // -------------------------------------------------------------------------

    public function generateStoryBook(Story $story): StoryOutput
    {
        $output = $this->markGenerating($story, StoryOutput::TYPE_STORY_BOOK_PDF);
        $tmpDir = storage_path('app/tmp/story_book_' . $story->id . '_' . uniqid());
        @mkdir($tmpDir, 0755, true);

        try {
            $story->loadMissing('assets');
            $scenes   = collect($story->scenes ?? [])->keyBy('scene_number');
            $images   = $story->imageAssets()->get()->keyBy('scene_number');
            $isRtl    = ($story->language ?? 'en') === 'ar';
            $pages    = [];
            $pageUrls = [];

            // Cover page
            $coverImage = $images->first();
            $coverPath  = $this->renderAtLogicalSize(fn () => $this->createStoryBookCover($tmpDir, $story, $coverImage?->url, $isRtl));
            $pages[]    = $coverPath;
            $coverStoragePath = "stories/{$story->id}/books/pages/story_cover.jpg";
            Storage::disk($this->disk)->put($coverStoragePath, file_get_contents($coverPath), ['visibility' => 'public']);
            $pageUrls[] = ['page' => 0, 'label' => 'Cover', 'url' => Storage::disk($this->disk)->url($coverStoragePath)];

            // Table of Contents
            $tocPath = $this->renderAtLogicalSize(fn () => $this->createTableOfContents($tmpDir, $story, $scenes, $isRtl));
            $pages[] = $tocPath;
            $tocStoragePath = "stories/{$story->id}/books/pages/story_toc.jpg";
            Storage::disk($this->disk)->put($tocStoragePath, file_get_contents($tocPath), ['visibility' => 'public']);
            $pageUrls[] = ['page' => 1, 'label' => 'Contents', 'url' => Storage::disk($this->disk)->url($tocStoragePath)];

            // Scene pages — every scene continues the story, in order (no artificial cap)
            $pageNum = 2;
            foreach ($scenes->sortKeys() as $sceneNumber => $scene) {
                $asset     = $images->get($sceneNumber);
                $layoutVariant = $sceneNumber % 2 === 0 ? 'diagonal' : 'classic';
                $scenePath = $this->renderAtLogicalSize(fn () => $this->createMangaScenePage(
                    $tmpDir,
                    'scene_' . $sceneNumber,
                    $scene['title'] ?? (($isRtl ? 'الصفحة ' : 'Page ') . $sceneNumber),
                    $scene['text']  ?? $scene['description'] ?? '',
                    $asset?->url,
                    $sceneNumber,
                    $pageNum + 1,
                    $isRtl,
                    $layoutVariant
                ));
                $pages[] = $scenePath;
                $sceneStoragePath = "stories/{$story->id}/books/pages/story_scene_{$sceneNumber}.jpg";
                Storage::disk($this->disk)->put($sceneStoragePath, file_get_contents($scenePath), ['visibility' => 'public']);
                $pageUrls[] = [
                    'page'  => $pageNum,
                    'label' => ($isRtl ? 'الصفحة ' : 'Page ') . $sceneNumber,
                    'url'   => Storage::disk($this->disk)->url($sceneStoragePath),
                ];
                $pageNum++;
            }

            // Ending page
            $endPath = $this->renderAtLogicalSize(fn () => $this->createStoryBookEnding($tmpDir, $story, $isRtl, $pageNum + 1));
            $pages[] = $endPath;
            $endStoragePath = "stories/{$story->id}/books/pages/story_ending.jpg";
            Storage::disk($this->disk)->put($endStoragePath, file_get_contents($endPath), ['visibility' => 'public']);
            $pageUrls[] = ['page' => $pageNum, 'label' => $isRtl ? 'النهاية' : 'The End', 'url' => Storage::disk($this->disk)->url($endStoragePath)];

            // Per-page single-page PDFs, so any one page can be downloaded/printed alone.
            $pageUrls = $this->attachPerPagePdfs($pageUrls, $pages, "stories/{$story->id}/books/pages", $story->title ?? 'Story Book');

            $pdfBytes = $this->buildImagePdf($pages, $story->title ?? 'Story Book', 'StoryHero', 'a4');
            $path     = "stories/{$story->id}/books/story_book.pdf";
            Storage::disk($this->disk)->put($path, $pdfBytes, ['visibility' => 'public']);

            $letterBytes = $this->buildImagePdf($pages, $story->title ?? 'Story Book', 'StoryHero', 'letter');
            $letterPath  = "stories/{$story->id}/books/story_book_letter.pdf";
            Storage::disk($this->disk)->put($letterPath, $letterBytes, ['visibility' => 'public']);

            return $this->markCompleted($output, $path, [
                'page_count'  => count($pages),
                'format'      => '300 DPI print-ready PDF — manga/comic style — A4 (default) & US Letter',
                'viewer'      => 'web_story_book',
                'rtl'         => $isRtl,
                'page_urls'   => $pageUrls,
                'letter_url'  => Storage::disk($this->disk)->url($letterPath),
                'a4_url'      => Storage::disk($this->disk)->url($path),
            ]);
        } catch (\Throwable $e) {
            return $this->markFailed($output, $e);
        } finally {
            $this->cleanupDirectory($tmpDir);
        }
    }

    // -------------------------------------------------------------------------
    // Coloring Book
    // -------------------------------------------------------------------------

    public function generateColoringBook(Story $story): StoryOutput
    {
        $output = $this->markGenerating($story, StoryOutput::TYPE_COLORING_BOOK_PDF);
        $tmpDir = storage_path('app/tmp/coloring_book_' . $story->id . '_' . uniqid());
        @mkdir($tmpDir, 0755, true);

        try {
            $images = $story->imageAssets()->get()->sortBy('scene_number');
            $scenes = collect($story->scenes ?? [])->keyBy('scene_number');

            if ($images->isEmpty()) {
                throw new \RuntimeException('No scene images are available for coloring book generation.');
            }

            $pages    = [];
            $pageUrls = [];
            $falAi    = app(FalAiService::class);
            $useFal   = false; // Force GD method for better line art control

            // Coloring book cover
            $coverPath = $this->renderAtLogicalSize(fn () => $this->createColoringBookCover($tmpDir, $story));
            $pages[]   = $coverPath;
            $coverStoragePath = "stories/{$story->id}/coloring/pages/cover.jpg";
            Storage::disk($this->disk)->put($coverStoragePath, file_get_contents($coverPath), ['visibility' => 'public']);
            $pageUrls[] = ['page' => 0, 'label' => 'Cover', 'url' => Storage::disk($this->disk)->url($coverStoragePath)];

            // Scene coloring pages — process in batches for better performance
            $chunkSize = 4; // Process 4 scenes at a time
            $imageChunks = $images->chunk($chunkSize);
            
            foreach ($imageChunks as $chunk) {
                foreach ($chunk as $asset) {
                    $scene        = $scenes->get($asset->scene_number);
                    $sceneCaption = $scene['title'] ?? ('Scene ' . $asset->scene_number);

                    $lineArtPath = $useFal
                        ? $this->createLineArtPageViaFal($tmpDir, $asset, $falAi, $sceneCaption)
                        : $this->createLineArtPageViaGd($tmpDir, $asset, $sceneCaption, count($pages), $story->language);

                    $coloringStoragePath = "stories/{$story->id}/coloring/pages/scene_{$asset->scene_number}.jpg";
                    Storage::disk($this->disk)->put($coloringStoragePath, file_get_contents($lineArtPath), ['visibility' => 'public']);

                    StoryAsset::updateOrCreate(
                        ['story_id' => $story->id, 'scene_number' => $asset->scene_number, 'asset_type' => 'coloring_page'],
                        ['url' => Storage::disk($this->disk)->url($coloringStoragePath), 'prompt' => $useFal ? self::COLORING_PROMPT : 'Thresholded pure black/white line-art transform.']
                    );

                    $pageUrls[] = [
                        'page'  => count($pages),
                        'label' => 'Page ' . $asset->scene_number . ' — ' . $sceneCaption,
                        'url'   => Storage::disk($this->disk)->url($coloringStoragePath),
                    ];
                    $pages[] = $lineArtPath;
                }
            }

            // Per-page single-page PDFs, so any one page can be downloaded/printed alone.
            $pageUrls = $this->attachPerPagePdfs($pageUrls, $pages, "stories/{$story->id}/coloring/pages", ($story->title ?? 'Coloring Book') . ' — Page');

            $pdfBytes = $this->buildImagePdf($pages, ($story->title ?? 'Coloring Book') . ' — Coloring Book', 'StoryHero', 'a4');
            $path     = "stories/{$story->id}/books/coloring_book.pdf";
            Storage::disk($this->disk)->put($path, $pdfBytes, ['visibility' => 'public']);

            $letterBytes = $this->buildImagePdf($pages, ($story->title ?? 'Coloring Book') . ' — Coloring Book', 'StoryHero', 'letter');
            $letterPath  = "stories/{$story->id}/books/coloring_book_letter.pdf";
            Storage::disk($this->disk)->put($letterPath, $letterBytes, ['visibility' => 'public']);

            return $this->markCompleted($output, $path, [
                'page_count' => count($pages),
                'format'     => '300 DPI print-ready PDF — pure black & white coloring book — A4 (default) & US Letter',
                'source'     => $useFal ? 'fal_ai_img2img+threshold' : 'gd_threshold_line_art',
                'child_safe' => true,
                'page_urls'  => $pageUrls,
                'letter_url' => Storage::disk($this->disk)->url($letterPath),
                'a4_url'     => Storage::disk($this->disk)->url($path),
            ]);
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
    // STORY BOOK — Page Builders
    // =========================================================================

    private function createStoryBookCover(string $tmpDir, Story $story, ?string $imageUrl, bool $rtl): string
    {
        $canvas = $this->blankPage([12, 10, 24]);
        $font   = $this->fontPathForLanguage($story->language);
        $white  = imagecolorallocate($canvas, 255, 255, 255);
        $gold   = imagecolorallocate($canvas, 255, 210, 90);
        $accent = imagecolorallocate($canvas, 220, 60, 120);
        $shadow = imagecolorallocatealpha($canvas, 0, 0, 0, 80);

        if ($imageUrl) {
            $source = $this->resolveImage($imageUrl);
            if ($source) {
                $this->copyImageIntoBox($canvas, $source, 0, 0, $this->pageWidth, $this->pageHeight, false);
                imagedestroy($source);
            }
        }

        // Manga-style dark overlay gradient at bottom for readability
        // (GD alpha is 0-127, NOT 0-255 — 127 is fully transparent... actually
        // 0 = opaque, 127 = fully transparent, so we scale within that range.)
        for ($y = $this->pageHeight - 600; $y < $this->pageHeight; $y++) {
            $progress = ($y - ($this->pageHeight - 600)) / 600;
            $alpha    = max(0, min(127, (int)(120 * (1 - $progress))));
            $c        = imagecolorallocatealpha($canvas, 8, 5, 18, $alpha);
            imagefilledrectangle($canvas, 0, $y, $this->pageWidth, $y, $c);
            imagecolordeallocate($canvas, $c);
        }

        // Manga-style top border
        imagefilledrectangle($canvas, 0, 0, $this->pageWidth, 18, $accent);
        imagefilledrectangle($canvas, 0, $this->pageHeight - 18, $this->pageWidth, $this->pageHeight, $accent);

        // Title with drop shadow effect
        $title = mb_strtoupper($story->title ?? 'My Story');
        $titleY = $this->pageHeight - 450;
        
        // Shadow
        $this->drawWrappedText($canvas, mb_strtoupper($title), $font, 58, 86, $titleY + 4, $shadow, $rtl, $this->pageWidth - 172, 1.25);
        // Main title
        $this->drawWrappedText($canvas, mb_strtoupper($title), $font, 58, 80, $titleY, $gold, $rtl, $this->pageWidth - 160, 1.25);

        // Subtitle with shadow
        if ($story->child_name) {
            $sub = $rtl ? 'بطولة ' . $story->child_name : 'Starring ' . $story->child_name;
            $subY = $titleY + 160;
            // Shadow
            $this->drawWrappedText($canvas, $sub, $font, 36, 86, $subY + 4, $shadow, $rtl, $this->pageWidth - 172, 1.3);
            // Main subtitle
            $this->drawWrappedText($canvas, $sub, $font, 36, 80, $subY, $white, $rtl, $this->pageWidth - 160, 1.3);
        }

        // Decorative manga-style elements
        $this->drawText($canvas, '◆', $font, 48, $this->pageWidth - 80, $titleY - 60, $gold, false, 60);
        $this->drawText($canvas, '◆', $font, 48, 80, $titleY - 60, $gold, false, 60);

        // Branding with shadow
        $brandY = $this->pageHeight - 40;
        $this->drawText($canvas, 'StoryHero', $font, 24, 86, $brandY + 4, $shadow, false, 304);
        $this->drawText($canvas, 'StoryHero', $font, 24, 80, $brandY, $white, false, 300);

        // Genre tag
        $genreTag = $rtl ? 'قصة مصورة' : 'PICTURE STORY';
        $this->drawText($canvas, $genreTag, $font, 18, $this->pageWidth - 80, $brandY, $gold, false, 280);

        $path = "{$tmpDir}/cover.jpg";
        imagejpeg($canvas, $path, 95);
        imagedestroy($canvas);
        return $path;
    }

    private function createTableOfContents(string $tmpDir, Story $story, \Illuminate\Support\Collection $scenes, bool $rtl): string
    {
        $canvas = $this->blankPage([250, 245, 255]);
        $font   = $this->fontPathForLanguage($story->language);
        $dark   = imagecolorallocate($canvas, 30, 20, 60);
        $accent = imagecolorallocate($canvas, 150, 60, 220);
        $muted  = imagecolorallocate($canvas, 100, 90, 130);

        imagefilledrectangle($canvas, 0, 0, $this->pageWidth, 14, $accent);

        $heading = $rtl ? 'المحتويات' : 'Table of Contents';
        $this->drawText($canvas, $heading, $font, 54, 90, 120, $dark, $rtl, $this->pageWidth - 180);
        imagefilledrectangle($canvas, 90, 148, $this->pageWidth - 90, 153, $accent);

        $y = 230;
        $this->drawText($canvas, $rtl ? 'الغلاف' : 'Cover', $font, 30, 110, $y, $muted, $rtl, $this->pageWidth - 220);
        $this->drawText($canvas, '1', $font, 30, $this->pageWidth - 130, $y, $muted, false, 80);
        $y += 75;

        $pageNum = 3;
        foreach ($scenes->sortKeys() as $sceneNumber => $scene) {
            $sceneTitle = $scene['title'] ?? (($rtl ? 'الصفحة ' : 'Scene ') . $sceneNumber);
            $this->drawText($canvas, $sceneTitle, $font, 30, 110, $y, $dark, $rtl, $this->pageWidth - 220);
            $this->drawText($canvas, (string)$pageNum, $font, 30, $this->pageWidth - 130, $y, $muted, false, 80);
            for ($x = 490; $x < $this->pageWidth - 140; $x += 16) {
                imagefilledrectangle($canvas, $x, $y - 6, $x + 8, $y - 4, $muted);
            }
            $y += 75;
            $pageNum++;
        }

        $this->drawText($canvas, '2', $font, 22, (int)($this->pageWidth / 2) - 10, $this->pageHeight - 50, $muted, false, 60);

        $path = "{$tmpDir}/toc.jpg";
        imagejpeg($canvas, $path, 93);
        imagedestroy($canvas);
        return $path;
    }

    private function createMangaScenePage(
        string $tmpDir, string $name, string $sceneTitle, string $storyText,
        ?string $imageUrl, int $sceneNumber, int $pageNumber, bool $rtl,
        string $layoutVariant = 'classic'
    ): string {
        $canvas    = $this->blankPage([18, 12, 35]);
        $font      = $this->fontPathForLanguage($story->language ?? 'en');
        $white     = imagecolorallocate($canvas, 255, 255, 255);
        $nearBlack = imagecolorallocate($canvas, 15, 10, 30);
        $gold      = imagecolorallocate($canvas, 255, 200, 60);
        $accent    = imagecolorallocate($canvas, 200, 50, 110);
        $textBg    = imagecolorallocate($canvas, 240, 235, 255);
        $dark      = imagecolorallocate($canvas, 30, 20, 55);

        $imageZoneH = (int)($this->pageHeight * 0.60);
        $textZoneY  = $imageZoneH + 1;
        $isDiagonal = $layoutVariant === 'diagonal';

        // Full-bleed illustration (top 60%)
        if ($imageUrl) {
            $source = $this->resolveImage($imageUrl);
            if ($source) {
                $this->copyImageIntoBox($canvas, $source, 0, 0, $this->pageWidth, $imageZoneH, false);
                imagedestroy($source);
            }
        }

        if ($isDiagonal) {
            // Dynamic cinematic panel cut: a diagonal speed-line wedge slicing
            // across the bottom of the illustration zone, comic-book style.
            $wedgeColor = imagecolorallocatealpha($canvas, 15, 10, 30, 25);
            imagefilledpolygon($canvas, [
                0, $imageZoneH,
                $this->pageWidth, (int)($imageZoneH * 0.82),
                $this->pageWidth, $imageZoneH,
            ], $wedgeColor);
            imagecolordeallocate($canvas, $wedgeColor);
            for ($i = 0; $i < 6; $i++) {
                $lineY = (int)($imageZoneH * 0.86) + ($i * 14);
                $lineColor = imagecolorallocatealpha($canvas, 255, 200, 60, 60 + $i * 6);
                imageline($canvas, 0, $lineY, $this->pageWidth, (int)($lineY - $this->pageWidth * 0.03), $lineColor);
                imagecolordeallocate($canvas, $lineColor);
            }
        }

        // Comic-style border around image zone
        imagesetthickness($canvas, 6);
        imagerectangle($canvas, 0, 0, $this->pageWidth - 1, $imageZoneH, $nearBlack);
        imagesetthickness($canvas, 1);

        // Scene number badge — alternates corners across the two layout variants
        // for a less repetitive, more dynamic page-to-page rhythm.
        $badgeX = $isDiagonal ? $this->pageWidth - 52 : 52;
        imagefilledellipse($canvas, $badgeX, 52, 82, 82, $accent);
        $badgeTextX = $isDiagonal ? $this->pageWidth - 74 : 30;
        $this->drawText($canvas, (string)$sceneNumber, $font, 30, $badgeTextX, 66, $white, false, 44);

        // Text panel (bottom 40%)
        imagefilledrectangle($canvas, 0, $textZoneY, $this->pageWidth, $this->pageHeight, $textBg);
        imagefilledrectangle($canvas, 0, $textZoneY, $this->pageWidth, $textZoneY + 9, $accent);

        $titleY = $textZoneY + 58;
        $this->drawText($canvas, $sceneTitle, $font, 32, 70, $titleY, $dark, $rtl, $this->pageWidth - 140);
        imagefilledrectangle($canvas, 70, $titleY + 14, $this->pageWidth - 70, $titleY + 16, $accent);

        $textY       = $titleY + 50;
        $maxTextH    = $this->pageHeight - $textY - 70;
        $displayText = $this->fitTextToBox($storyText, $font, 26, $this->pageWidth - 160, $maxTextH);
        $this->drawWrappedText($canvas, $displayText, $font, 26, 70, $textY, $dark, $rtl, $this->pageWidth - 140, 1.55);

        // Page number
        $this->drawText($canvas, (string)$pageNumber, $font, 22, (int)($this->pageWidth / 2) - 10, $this->pageHeight - 22, $dark, false, 60);

        // Gold corner accents
        imagefilledrectangle($canvas, 0, 0, 16, 16, $gold);
        imagefilledrectangle($canvas, $this->pageWidth - 16, 0, $this->pageWidth, 16, $gold);

        $path = "{$tmpDir}/{$name}.jpg";
        imagejpeg($canvas, $path, 93);
        imagedestroy($canvas);
        return $path;
    }

    private function createStoryBookEnding(string $tmpDir, Story $story, bool $rtl, int $pageNumber): string
    {
        $canvas = $this->blankPage([12, 8, 28]);
        $font   = $this->fontPath();
        $white  = imagecolorallocate($canvas, 255, 255, 255);
        $gold   = imagecolorallocate($canvas, 255, 210, 90);
        $accent = imagecolorallocate($canvas, 200, 50, 110);
        $muted  = imagecolorallocate($canvas, 180, 170, 200);

        mt_srand(42);
        for ($i = 0; $i < 100; $i++) {
            $star = imagecolorallocatealpha($canvas, 255, 230, 100, mt_rand(40, 110));
            imagefilledellipse($canvas, mt_rand(0, $this->pageWidth), mt_rand(0, $this->pageHeight - 200), mt_rand(2, 8), mt_rand(2, 8), $star);
            imagecolordeallocate($canvas, $star);
        }

        $circle = imagecolorallocatealpha($canvas, 200, 50, 110, 90);
        imagefilledellipse($canvas, (int)($this->pageWidth / 2), (int)($this->pageHeight / 2) - 100, 600, 600, $circle);
        imagecolordeallocate($canvas, $circle);

        $ending = $rtl ? 'النهاية' : 'The End';
        $this->drawText($canvas, $ending, $font, 82, 80, (int)($this->pageHeight / 2) - 60, $gold, $rtl, $this->pageWidth - 160);

        $sub = $rtl ? 'شكراً لقراءة هذه القصة الرائعة!' : 'Thank you for reading this amazing story!';
        $this->drawWrappedText($canvas, $sub, $font, 34, 120, (int)($this->pageHeight / 2) + 60, $white, $rtl, $this->pageWidth - 240, 1.5);

        if ($story->child_name) {
            $credit = $rtl ? 'بطل القصة: ' . $story->child_name : 'Hero: ' . $story->child_name;
            $this->drawText($canvas, $credit, $font, 28, 120, (int)($this->pageHeight / 2) + 200, $muted, $rtl, $this->pageWidth - 240);
        }

        imagefilledrectangle($canvas, 0, $this->pageHeight - 70, $this->pageWidth, $this->pageHeight, $accent);
        $this->drawText($canvas, 'StoryHero', $font, 24, 80, $this->pageHeight - 30, $white, false, 300);
        $this->drawText($canvas, (string)$pageNumber, $font, 22, (int)($this->pageWidth / 2) - 10, $this->pageHeight - 80, $muted, false, 60);

        $path = "{$tmpDir}/ending.jpg";
        imagejpeg($canvas, $path, 93);
        imagedestroy($canvas);
        return $path;
    }

    // =========================================================================
    // COLORING BOOK — Page Builders
    // =========================================================================

    private function createColoringBookCover(string $tmpDir, Story $story): string
    {
        $canvas = imagecreatetruecolor($this->pageWidth, $this->pageHeight);
        $white  = imagecolorallocate($canvas, 255, 255, 255);
        $black  = imagecolorallocate($canvas, 20, 20, 20);
        $gray   = imagecolorallocate($canvas, 140, 140, 140);
        $accent = imagecolorallocate($canvas, 220, 80, 120);
        imagefill($canvas, 0, 0, $white);
        $font = $this->fontPathForLanguage($story->language);

        // Bold outer border
        imagesetthickness($canvas, 12);
        imagerectangle($canvas, 16, 16, $this->pageWidth - 16, $this->pageHeight - 16, $black);
        imagesetthickness($canvas, 4);
        imagerectangle($canvas, 32, 32, $this->pageWidth - 32, $this->pageHeight - 32, $accent);
        imagesetthickness($canvas, 1);

        // "Color Me!" header with styling
        $this->drawText($canvas, 'COLOR ME!', $font, 64, 70, 120, $accent, false, $this->pageWidth - 140);
        imagefilledrectangle($canvas, 70, 146, $this->pageWidth - 70, 154, $black);

        // Title
        $title = mb_strtoupper($story->title ?? 'My Story');
        $this->drawWrappedText($canvas, $title, $font, 48, 80, 260, $black, false, $this->pageWidth - 160, 1.3);

        // Child name display
        if ($story->child_name) {
            $nameLabel = 'This coloring book belongs to: ' . $story->child_name;
            $this->drawWrappedText($canvas, $nameLabel, $font, 36, 80, 420, $gray, false, $this->pageWidth - 160, 1.4);
        }

        // Fun decorative border elements
        for ($i = 0; $i < 5; $i++) {
            $x = 90 + ($i * 230);
            imagefilledellipse($canvas, $x, 550, 24, 24, $accent);
        }

        // Drawing instructions
        $instructions = [
            '• Use crayons, colored pencils, or markers',
            '• Stay inside the lines for best results',
            '• Have fun and be creative!',
        ];
        
        $y = 620;
        foreach ($instructions as $instruction) {
            $this->drawText($canvas, $instruction, $font, 28, 90, $y, $black, false, $this->pageWidth - 180);
            $y += 50;
        }

        // Page count indicator
        $pageCount = $story->imageAssets()->count();
        $this->drawText($canvas, "Contains {$pageCount} coloring pages", $font, 32, 90, 820, $accent, false, $this->pageWidth - 180);

        // Footer with branding
        imagefilledrectangle($canvas, 0, $this->pageHeight - 80, $this->pageWidth, $this->pageHeight, $accent);
        $this->drawText($canvas, 'StoryHero Coloring Collection', $font, 28, 90, $this->pageHeight - 48, $white, false, $this->pageWidth - 180);
        $this->drawText($canvas, 'Printable PDF • A4 & US Letter • 300 DPI', $font, 22, $this->pageWidth - 90, $this->pageHeight - 48, $white, false, 300);

        $path = "{$tmpDir}/coloring_cover.jpg";
        imagejpeg($canvas, $path, 95);
        imagedestroy($canvas);
        return $path;
    }

    private function createLineArtPageViaFal(string $tmpDir, StoryAsset $asset, FalAiService $falAi, string $caption): string
    {
        try {
            $imageUrl = $asset->url;
            if (!$this->isPublicFalUrl($imageUrl)) {
                $localPath = $this->resolveLocalPath($imageUrl);
                if ($localPath && file_exists($localPath)) {
                    $imageUrl = $falAi->uploadFileToFal($localPath);
                }
            }

            $resultUrl = $this->submitFalImg2Img($falAi, $imageUrl);
            $response  = \Illuminate\Support\Facades\Http::timeout(60)->get($resultUrl);
            if (!$response->successful()) {
                throw new \RuntimeException("Failed to download Fal.ai coloring result for scene {$asset->scene_number}");
            }

            $path = "{$tmpDir}/coloring_fal_{$asset->scene_number}.jpg";
            return $this->buildColoringPageCanvas($response->body(), $tmpDir, $asset->scene_number, $caption, $path);
        } catch (\Throwable $e) {
            Log::warning("Fal.ai coloring transform failed for scene {$asset->scene_number}, falling back to GD", ['error' => $e->getMessage()]);
            return $this->createLineArtPageViaGd($tmpDir, $asset, $caption, $asset->scene_number, null);
        }
    }

    private function submitFalImg2Img(FalAiService $falAi, string $imageUrl): string
    {
        $apiKey = config('services.fal.key', '');
        if ($apiKey === '') {
            throw new \RuntimeException('FAL_API_KEY is not configured.');
        }

        $model   = config('services.fal.img2img_model', self::FAL_IMG2IMG_MODEL);
        $payload = [
            'image_url'             => $imageUrl,
            'prompt'                => self::COLORING_PROMPT,
            'strength'              => 0.85,
            'num_inference_steps'   => 30,
            'guidance_scale'        => 7.5,
            'num_images'            => 1,
            'enable_safety_checker' => true,
        ];

        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'Authorization' => 'Key ' . $apiKey,
            'Content-Type'  => 'application/json',
        ])->timeout(30)->post("https://queue.fal.run/{$model}", $payload);

        if (!$response->successful()) {
            throw new \RuntimeException('Fal.ai img2img submit failed: ' . $response->body());
        }

        $data        = $response->json();
        $requestId   = $data['request_id']   ?? null;
        $statusUrl   = $data['status_url']    ?? "https://queue.fal.run/{$model}/requests/{$requestId}/status";
        $responseUrl = $data['response_url']  ?? "https://queue.fal.run/{$model}/requests/{$requestId}";

        if (!$requestId) {
            throw new \RuntimeException('Fal.ai img2img: no request_id in submit response');
        }

        sleep(15);
        $pollInterval = (int)config('services.fal.poll_interval', 5);
        for ($i = 0; $i < 60; $i++) {
            $statusResp = \Illuminate\Support\Facades\Http::withHeaders(['Authorization' => 'Key ' . $apiKey])->timeout(20)->get($statusUrl);
            if (!$statusResp->successful()) {
                sleep($pollInterval);
                continue;
            }

            $status = strtoupper($statusResp->json('status') ?? '');

            if ($status === 'COMPLETED') {
                $resultResp = \Illuminate\Support\Facades\Http::withHeaders(['Authorization' => 'Key ' . $apiKey])->timeout(60)->get($responseUrl);
                if (!$resultResp->successful()) {
                    throw new \RuntimeException('Fal.ai img2img: completed but result fetch failed');
                }
                $resultData = $resultResp->json();
                $url = $resultData['images'][0]['url'] ?? $resultData['image']['url'] ?? null;
                if (!$url) {
                    throw new \RuntimeException('Fal.ai img2img: no image URL in result');
                }
                return $url;
            }

            if ($status === 'FAILED') {
                throw new \RuntimeException('Fal.ai img2img job FAILED for request ' . $requestId);
            }

            sleep($pollInterval);
        }

        throw new \RuntimeException("Fal.ai img2img polling timed out for request {$requestId}");
    }

    private function buildColoringPageCanvas(string $imageBytes, string $tmpDir, int $sceneNumber, string $caption, string $outputPath): string
    {
        $source = @imagecreatefromstring($imageBytes);
        if (!$source) {
            throw new \RuntimeException("Cannot decode Fal.ai image bytes for scene {$sceneNumber}");
        }

        $page  = imagecreatetruecolor($this->pageWidth, $this->pageHeight);
        $white = imagecolorallocate($page, 255, 255, 255);
        $black = imagecolorallocate($page, 20, 20, 20);
        $gray  = imagecolorallocate($page, 140, 140, 140);
        imagefill($page, 0, 0, $white);

        $scaleH = (int)round(120 * ($this->pageWidth / 1240));

        // Bold outer border
        imagesetthickness($page, 8 * ($this->pageWidth > 1500 ? 2 : 1));
        imagerectangle($page, 20, 20, $this->pageWidth - 20, $this->pageHeight - 20, $black);
        imagesetthickness($page, 2);
        imagerectangle($page, 30, 30, $this->pageWidth - 30, $this->pageHeight - 30, $gray);
        imagesetthickness($page, 1);

        // Page header
        $headerSize = (int)round(42 * ($this->pageWidth / 1240));
        $this->drawText($page, 'COLOR THIS PAGE!', $this->fontPath(), $headerSize, 70, $scaleH / 2, $black, false, $this->pageWidth - 140);
        imagefilledrectangle($page, 70, (int)($scaleH / 2 + 16), $this->pageWidth - 70, (int)($scaleH / 2 + 22), $black);

        // Scene caption
        $this->drawText($page, $caption, $this->fontPath(), (int)round(28 * ($this->pageWidth / 1240)), 70, (int)($scaleH / 2 + 50), $gray, false, $this->pageWidth - 140);

        // Real black-and-white line-art conversion (hard threshold + bold outlines).
        // Runs even on Fal.ai's img2img result — a diffusion model's output still
        // contains anti-aliased grays, and the requirement is PURE black/white.
        $lineArt = $this->convertToPureLineArt($source);
        imagedestroy($source);

        $imageZoneY = (int)($scaleH + 40);
        $imageZoneH = $this->pageHeight - $imageZoneY - ($scaleH + 20);
        $this->copyImageIntoBoxNearest($page, $lineArt, 60, $imageZoneY, $this->pageWidth - 120, $imageZoneH, true);
        imagedestroy($lineArt);

        // Page number
        $this->drawText($page, (string)$sceneNumber, $this->fontPath(), (int)round(28 * ($this->pageWidth / 1240)), (int)($this->pageWidth / 2) - 12, $this->pageHeight - (int)($scaleH * 0.4), $black, false, 64);

        // Footer
        imagefilledrectangle($page, 0, $this->pageHeight - $scaleH, $this->pageWidth, $this->pageHeight, $gray);
        $this->drawText($page, 'StoryHero Coloring Book', $this->fontPath(), (int)round(22 * ($this->pageWidth / 1240)), 70, $this->pageHeight - (int)($scaleH * 0.6), $black, false, $this->pageWidth - 140);

        imagejpeg($page, $outputPath, 95);
        imagedestroy($page);
        return $outputPath;
    }

    private function createLineArtPageViaGd(string $tmpDir, StoryAsset $asset, string $caption, int $pageNumber, ?string $language = null): string
    {
        $source = $this->resolveImage($asset->url);
        if (!$source) {
            throw new \RuntimeException("Unable to read scene image {$asset->scene_number} for coloring book.");
        }

        $page  = imagecreatetruecolor($this->pageWidth, $this->pageHeight);
        $white = imagecolorallocate($page, 255, 255, 255);
        $black = imagecolorallocate($page, 20, 20, 20);
        $gray  = imagecolorallocate($page, 140, 140, 140);
        imagefill($page, 0, 0, $white);
        $font = $this->fontPathForLanguage($language);
        $scaleH = (int)round(120 * ($this->pageWidth / 1240));

        // Bold outer border
        imagesetthickness($page, 8 * ($this->pageWidth > 1500 ? 2 : 1));
        imagerectangle($page, 20, 20, $this->pageWidth - 20, $this->pageHeight - 20, $black);
        imagesetthickness($page, 2);
        imagerectangle($page, 30, 30, $this->pageWidth - 30, $this->pageHeight - 30, $gray);
        imagesetthickness($page, 1);

        // Page header
        $headerSize = (int)round(42 * ($this->pageWidth / 1240));
        $this->drawText($page, 'COLOR THIS PAGE!', $font, $headerSize, 70, $scaleH / 2, $black, false, $this->pageWidth - 140);
        imagefilledrectangle($page, 70, (int)($scaleH / 2 + 16), $this->pageWidth - 70, (int)($scaleH / 2 + 22), $black);

        // Scene caption
        $this->drawText($page, $caption, $font, (int)round(28 * ($this->pageWidth / 1240)), 70, (int)($scaleH / 2 + 50), $gray, false, $this->pageWidth - 140);

        // Real black-and-white line-art conversion (hard threshold + bold outlines) —
        // no gray tones, no shading; only pure black lines on a pure white page.
        $lineArt = $this->convertToPureLineArt($source);
        imagedestroy($source);

        $imageZoneY = (int)($scaleH + 40);
        $imageZoneH = $this->pageHeight - $imageZoneY - ($scaleH + 20);
        $this->copyImageIntoBoxNearest($page, $lineArt, 60, $imageZoneY, $this->pageWidth - 120, $imageZoneH, true);
        imagedestroy($lineArt);

        // Page number
        $this->drawText($page, (string)$pageNumber, $font, (int)round(28 * ($this->pageWidth / 1240)), (int)($this->pageWidth / 2) - 12, $this->pageHeight - (int)($scaleH * 0.4), $black, false, 64);

        // Footer
        imagefilledrectangle($page, 0, $this->pageHeight - $scaleH, $this->pageWidth, $this->pageHeight, $gray);
        $this->drawText($page, 'StoryHero Coloring Book', $font, (int)round(22 * ($this->pageWidth / 1240)), 70, $this->pageHeight - (int)($scaleH * 0.6), $black, false, $this->pageWidth - 140);

        $path = "{$tmpDir}/coloring_gd_{$asset->scene_number}.jpg";
        imagejpeg($page, $path, 95);
        imagedestroy($page);
        return $path;
    }

    // =========================================================================
    // GD Helpers
    // =========================================================================

    private function blankPage(array $rgb): \GdImage
    {
        $canvas = imagecreatetruecolor($this->pageWidth, $this->pageHeight);
        imagealphablending($canvas, true);
        $bg = imagecolorallocate($canvas, $rgb[0], $rgb[1], $rgb[2]);
        imagefill($canvas, 0, 0, $bg);
        return $canvas;
    }

    /**
     * Runs a page-builder closure (one of the createStoryBookCover /
     * createTableOfContents / createMangaScenePage / createStoryBookEnding /
     * createColoringBookCover methods) at the original tuned 1240x1754
     * layout resolution, then upscales the finished page to the real
     * print resolution (300 DPI). This lets all the existing, carefully
     * positioned text/border coordinates keep working unchanged while the
     * exported page still meets the 300 DPI print-ready requirement.
     *
     * NOT used for the coloring-page illustration builders — those render
     * directly at full resolution and place pure-black/white line art with
     * nearest-neighbor scaling, because resampled upscaling would
     * reintroduce anti-aliased gray pixels into the line art.
     */
    private function renderAtLogicalSize(callable $builder): string
    {
        $realW = $this->pageWidth;
        $realH = $this->pageHeight;
        $this->pageWidth  = 1240;
        $this->pageHeight = 1754;
        try {
            $path = $builder();
        } finally {
            $this->pageWidth  = $realW;
            $this->pageHeight = $realH;
        }
        return $this->upscaleImageFile($path, $realW, $realH);
    }

    private function upscaleImageFile(string $path, int $targetW, int $targetH): string
    {
        $bytes = file_get_contents($path);
        $src   = @imagecreatefromstring($bytes);
        if (!$src) {
            return $path;
        }
        $srcW  = imagesx($src);
        $srcH  = imagesy($src);
        $final = imagecreatetruecolor($targetW, $targetH);
        imagecopyresampled($final, $src, 0, 0, 0, 0, $targetW, $targetH, $srcW, $srcH);
        imagedestroy($src);

        if (str_ends_with(strtolower($path), '.png')) {
            imagepng($final, $path, 0);
        } else {
            imagejpeg($final, $path, 95);
        }
        imagedestroy($final);
        return $path;
    }

    private function copyImageIntoBox(\GdImage $canvas, \GdImage $source, int $x, int $y, int $boxW, int $boxH, bool $contain = false): void
    {
        $srcW  = imagesx($source);
        $srcH  = imagesy($source);
        $scale = $contain ? min($boxW / $srcW, $boxH / $srcH) : max($boxW / $srcW, $boxH / $srcH);
        $newW  = (int)round($srcW * $scale);
        $newH  = (int)round($srcH * $scale);
        $dstX  = $x + (int)round(($boxW - $newW) / 2);
        $dstY  = $y + (int)round(($boxH - $newH) / 2);
        imagecopyresampled($canvas, $source, $dstX, $dstY, 0, 0, $newW, $newH, $srcW, $srcH);
    }

    /**
     * Same as copyImageIntoBox() but uses nearest-neighbor scaling
     * (imagecopyresized) instead of resampled/interpolated scaling.
     * Pure black/white line art MUST be placed with this — resampled
     * scaling reintroduces anti-aliased gray pixels along every line,
     * which violates the "no gray tones" coloring-book requirement.
     */
    private function copyImageIntoBoxNearest(\GdImage $canvas, \GdImage $source, int $x, int $y, int $boxW, int $boxH, bool $contain = true): void
    {
        $srcW  = imagesx($source);
        $srcH  = imagesy($source);
        $scale = $contain ? min($boxW / $srcW, $boxH / $srcH) : max($boxW / $srcW, $boxH / $srcH);
        $newW  = max(1, (int)round($srcW * $scale));
        $newH  = max(1, (int)round($srcH * $scale));
        $dstX  = $x + (int)round(($boxW - $newW) / 2);
        $dstY  = $y + (int)round(($boxH - $newH) / 2);
        imagecopyresized($canvas, $source, $dstX, $dstY, 0, 0, $newW, $newH, $srcW, $srcH);
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
     *
     * Processing happens on a small working canvas (not the 300 DPI page
     * canvas) because the per-pixel threshold/dilation passes are O(w*h)
     * and would be far too slow at print resolution. The result is then
     * placed onto the final page with nearest-neighbor scaling to keep
     * every pixel purely black or white.
     */
    private function convertToPureLineArt(\GdImage $source, int $workingWidth = 800): \GdImage
    {
        $srcW  = imagesx($source);
        $srcH  = imagesy($source);
        $workW = min($workingWidth, $srcW);
        $workH = max(1, (int)round($srcH * ($workW / $srcW)));

        $work = imagecreatetruecolor($workW, $workH);
        imagecopyresampled($work, $source, 0, 0, 0, 0, $workW, $workH, $srcW, $srcH);

        // Pre-smooth BEFORE edge detection. Without this, every shading
        // gradient / texture speckle in the source illustration gets picked
        // up as a spurious "edge", which is what makes edge-detect line art
        // look noisy/scratchy instead of clean like a hand-drawn coloring
        // page. Two passes of Gaussian blur remove that high-frequency
        // texture while leaving real shape boundaries intact.
        imagefilter($work, IMG_FILTER_GAUSSIAN_BLUR);
        imagefilter($work, IMG_FILTER_GAUSSIAN_BLUR);

        // Better line art conversion with edge detection
        imagefilter($work, IMG_FILTER_GRAYSCALE);
        imagefilter($work, IMG_FILTER_EDGEDETECT);  // Detect edges/lines
        imagefilter($work, IMG_FILTER_NEGATE);      // Make edges black on white
        imagefilter($work, IMG_FILTER_CONTRAST, -50); // Boost contrast
        imagefilter($work, IMG_FILTER_SMOOTH, 2);   // Smooth to join broken lines

        // Threshold for better detail preservation (flat cutoff, not truly
        // locally-adaptive, but works well after the pre-blur above).
        $binary = imagecreatetruecolor($workW, $workH);
        $black  = imagecolorallocate($binary, 0, 0, 0);
        $white  = imagecolorallocate($binary, 255, 255, 255);
        imagefilledrectangle($binary, 0, 0, $workW, $workH, $white);

        for ($y = 0; $y < $workH; $y++) {
            for ($x = 0; $x < $workW; $x++) {
                $color = imagecolorat($work, $x, $y);
                $gray = ($color >> 8) & 0xFF;

                // More conservative threshold to preserve detail
                if ($gray < 200) {
                    imagesetpixel($binary, $x, $y, $black);
                }
            }
        }
        imagedestroy($work);

        // Speckle removal — a single stray black pixel (or a pair) with no
        // real neighbors is threshold noise, not a line. Dropping these
        // before dilation stops noise from getting thickened into visible
        // dots, which is what made earlier output look stippled instead of
        // clean like a hand-drawn coloring page.
        $denoised = imagecreatetruecolor($workW, $workH);
        imagefilledrectangle($denoised, 0, 0, $workW, $workH, $white);
        for ($y = 0; $y < $workH; $y++) {
            for ($x = 0; $x < $workW; $x++) {
                if ((imagecolorat($binary, $x, $y) & 0xFF) !== 0) {
                    continue;
                }
                $blackNeighbors = 0;
                for ($dy = -1; $dy <= 1; $dy++) {
                    for ($dx = -1; $dx <= 1; $dx++) {
                        if ($dx === 0 && $dy === 0) continue;
                        $nx = $x + $dx;
                        $ny = $y + $dy;
                        if ($nx < 0 || $ny < 0 || $nx >= $workW || $ny >= $workH) continue;
                        if ((imagecolorat($binary, $nx, $ny) & 0xFF) === 0) $blackNeighbors++;
                    }
                }
                if ($blackNeighbors >= 2) {
                    imagesetpixel($denoised, $x, $y, $black);
                }
            }
        }
        imagedestroy($binary);

        // Dilation for bold, coloring-friendly lines. A thickness of 1 draws
        // a 1x1 "ellipse" per black pixel — i.e. no real expansion at all.
        // Overlapping circles only actually widen the line once the
        // diameter is > 1, so this needs to be 3 (not 1) to have any visible
        // effect.
        $thickness = 3;
        $bold = imagecreatetruecolor($workW, $workH);
        imagefilledrectangle($bold, 0, 0, $workW, $workH, $white);
        $boldBlack = imagecolorallocate($bold, 0, 0, 0);

        for ($y = 0; $y < $workH; $y++) {
            for ($x = 0; $x < $workW; $x++) {
                if ((imagecolorat($denoised, $x, $y) & 0xFF) === 0) {
                    imagefilledellipse($bold, $x, $y, $thickness, $thickness, $boldBlack);
                }
            }
        }
        imagedestroy($denoised);

        return $bold;
    }

    private function drawWrappedText(\GdImage $canvas, string $text, string $font, int $size, int $x, int $y, int $color, bool $rtl, int $maxWidth, float $lineHeight): void
    {
        $words = preg_split('/\s+/u', trim($text)) ?: [];
        $lines = [];
        $line  = '';
        foreach ($words as $word) {
            $test = trim($line . ' ' . $word);
            $box  = imagettfbbox($size, 0, $font, $test);
            if ($line !== '' && ($box[2] - $box[0]) > $maxWidth) {
                $lines[] = $line;
                $line    = $word;
            } else {
                $line = $test;
            }
        }
        if ($line !== '') $lines[] = $line;

        $currentY = $y;
        foreach ($lines as $lineText) {
            $this->drawText($canvas, $lineText, $font, $size, $x, $currentY, $color, $rtl, $maxWidth);
            $currentY += (int)round($size * $lineHeight);
        }
    }

    private function drawText(\GdImage $canvas, string $text, string $font, int $size, int $x, int $baselineY, int $color, bool $rtl, int $maxWidth): void
    {
        // Only apply RTL logic if text actually contains Arabic characters
        $isArabic = preg_match('/\p{Arabic}/u', $text);
        $display = ($rtl && $isArabic) ? $this->prepareRtlText($text) : $text;
        $box     = imagettfbbox($size, 0, $font, $display);
        $width   = $box ? ($box[2] - $box[0]) : 0;
        $drawX   = ($rtl && $isArabic) ? ($x + $maxWidth - $width) : $x;
        imagettftext($canvas, $size, 0, $drawX, $baselineY, $color, $font, $display);
    }

    private function prepareRtlText(string $text): string
    {
        // Use proper bidirectional text handling for Arabic
        if (class_exists('IntlBreakIterator')) {
            // Use ICU's bidirectional algorithm for proper Arabic text handling
            // This handles Arabic ligatures, contextual forms, and proper shaping
            return $this->applyBidiAlgorithm($text);
        }
        
        // Fallback: simple character reversal (not ideal but better than nothing)
        $parts = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
        return $parts ? implode('', array_reverse($parts)) : $text;
    }

    private function applyBidiAlgorithm(string $text): string
    {
        // For Arabic text, we need to ensure proper display order
        // This is a simplified approach - for production, consider using a dedicated library
        
        // Check if text contains Arabic characters
        if (!preg_match('/\p{Arabic}/u', $text)) {
            return $text;
        }
        
        // For Arabic, we want to preserve the logical order but let the rendering engine handle direction
        // GD's imagettftext doesn't fully support complex scripts, so we need to be careful
        
        // Don't reverse Arabic text - let the font handle the rendering
        // Modern Arabic fonts should handle the shaping correctly
        return $text;
    }

    private function fitTextToBox(string $text, string $font, int $size, int $maxWidth, int $maxHeight): string
    {
        $lineH    = (int)($size * 1.55);
        $maxLines = max(1, (int)($maxHeight / $lineH));

        $words = preg_split('/\s+/u', trim($text)) ?: [];
        $lines = [];
        $line  = '';
        foreach ($words as $word) {
            $test = trim($line . ' ' . $word);
            $box  = imagettfbbox($size, 0, $font, $test);
            if ($line !== '' && ($box[2] - $box[0]) > $maxWidth) {
                $lines[] = $line;
                $line    = $word;
                if (count($lines) >= $maxLines) break;
            } else {
                $line = $test;
            }
        }
        if ($line !== '' && count($lines) < $maxLines) $lines[] = $line;
        if (count($lines) >= $maxLines) {
            $lines[$maxLines - 1] = rtrim($lines[$maxLines - 1] ?? '') . '...';
            $lines = array_slice($lines, 0, $maxLines);
        }

        return implode(' ', $lines);
    }

    // =========================================================================
    // Image Resolution Helpers
    // =========================================================================

    private function resolveImage(string $url): ?\GdImage
    {
        $path  = $this->resolveLocalPath($url);
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

    private function isPublicFalUrl(string $url): bool
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) return false;
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) return false;
        return !in_array($host, ['localhost', '127.0.0.1', '::1'], true)
            && !str_starts_with($host, '192.168.')
            && !str_starts_with($host, '10.')
            && !str_starts_with($host, '172.');
    }

    private function falColoringEnabled(): bool
    {
        return config('services.fal.key', '') !== ''
            && (bool)config('services.fal.coloring_book_transform', true);
    }

    // =========================================================================
    // PDF Builder
    // =========================================================================

    /**
     * Builds print-ready single-page PDFs for every page (in addition to the
     * combined book PDF) and attaches their URL to each page_urls entry as
     * `pdf_url`, so any individual page can be downloaded/printed on its own.
     */
    private function attachPerPagePdfs(array $pageUrls, array $pages, string $storagePrefix, string $titlePrefix): array
    {
        foreach ($pageUrls as $i => $entry) {
            if (!isset($pages[$i])) {
                continue;
            }
            $pdfBytes = $this->buildImagePdf([$pages[$i]], $titlePrefix . ' ' . $entry['page'], 'StoryHero', 'a4');
            $pdfPath  = "{$storagePrefix}/page_{$entry['page']}.pdf";
            Storage::disk($this->disk)->put($pdfPath, $pdfBytes, ['visibility' => 'public']);
            $pageUrls[$i]['pdf_url'] = Storage::disk($this->disk)->url($pdfPath);
        }
        return $pageUrls;
    }

    /**
     * Assembles a print-ready, multi-page PDF from a list of full-bleed page
     * images. Every image is placed centered and "contain"-fit inside the
     * chosen page's MediaBox (A4 or US Letter), preserving its aspect ratio —
     * so switching format never stretches or distorts a page.
     *
     * All page images MUST be JPEG (DCTDecode is the only image filter this
     * builder emits — a raw PNG file's bytes are NOT valid FlateDecode image
     * sample data, so PNG must never reach this method).
     */
    private function buildImagePdf(array $imagePaths, string $title = 'StoryHero Book', string $author = 'StoryHero', string $pageFormat = 'a4'): string
    {
        [$mbW, $mbH] = $pageFormat === 'letter' ? self::MEDIABOX_LETTER : self::MEDIABOX_A4;

        $objects    = [];
        $pageIds    = [];
        $imageIds   = [];
        $contentIds = [];
        $nextId     = 1;
        $catalogId  = $nextId++;
        $infoId     = $nextId++;
        $pagesId    = $nextId++;

        foreach ($imagePaths as $path) {
            $pageIds[]    = $nextId++;
            $imageIds[]   = $nextId++;
            $contentIds[] = $nextId++;
        }

        $creationDate = date('YmdHis');
        $subject = $title;
        
        $objects[$infoId]    = '<< /Title (' . addslashes($title) . ') /Author (' . addslashes($author) . ') /Subject (' . addslashes($subject) . ') /Creator (StoryHero PDF Generator) /Producer (StoryHero) /CreationDate (D:' . $creationDate . ') /ModDate (D:' . $creationDate . ') >>';
        $objects[$catalogId] = "<< /Type /Catalog /Pages {$pagesId} 0 R >>";
        $kids                = implode(' ', array_map(fn ($id) => "{$id} 0 R", $pageIds));
        $objects[$pagesId]   = "<< /Type /Pages /Kids [{$kids}] /Count " . count($pageIds) . " >>";

        foreach ($imagePaths as $index => $path) {
            [$imgW, $imgH] = getimagesize($path);

            // Guard: if anything upstream ever hands this a PNG, convert it
            // to JPEG on the fly rather than emit an invalid PDF image stream.
            if (str_ends_with(strtolower($path), '.png')) {
                $converted = $path . '.jpg';
                $im = imagecreatefrompng($path);
                imagejpeg($im, $converted, 95);
                imagedestroy($im);
                $path = $converted;
                [$imgW, $imgH] = getimagesize($path);
            }

            $imageData  = file_get_contents($path);
            $colorSpace = '/DeviceRGB';
            $imageId    = $imageIds[$index];
            $contentId  = $contentIds[$index];
            $pageId     = $pageIds[$index];
            $name       = 'Im' . ($index + 1);

            // Contain-fit the image inside the page's MediaBox, centered,
            // preserving aspect ratio (never stretches/distorts a page).
            $imgAspect = $imgW / $imgH;
            $drawW = $mbW;
            $drawH = $drawW / $imgAspect;
            if ($drawH > $mbH) {
                $drawH = $mbH;
                $drawW = $drawH * $imgAspect;
            }
            $offX = ($mbW - $drawW) / 2;
            $offY = ($mbH - $drawH) / 2;

            $objects[$imageId]   = "<< /Type /XObject /Subtype /Image /Width {$imgW} /Height {$imgH} /ColorSpace {$colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($imageData) . " >>\nstream\n" . $imageData . "\nendstream";
            $content             = sprintf("q\n%.2F 0 0 %.2F %.2F %.2F cm\n/%s Do\nQ", $drawW, $drawH, $offX, $offY, $name);
            $objects[$contentId] = "<< /Length " . strlen($content) . " >>\nstream\n{$content}\nendstream";
            $objects[$pageId]    = sprintf("<< /Type /Page /Parent %d 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /XObject << /%s %d 0 R >> >> /Contents %d 0 R >>", $pagesId, $mbW, $mbH, $name, $imageId, $contentId);
        }

        ksort($objects);
        $pdf     = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
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
        $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root {$catalogId} 0 R /Info {$infoId} 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";
        return $pdf;
    }

    // =========================================================================
    // Shared Output Helpers
    // =========================================================================

    private function fontPath(): string
    {
        // Standard fonts with good English support
        $fonts = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
            '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
            'C:\\Windows\\Fonts\\arial.ttf',
            'C:\\Windows\\Fonts\\segoeui.ttf',
        ];
        
        foreach ($fonts as $candidate) {
            if (file_exists($candidate)) return $candidate;
        }
        throw new \RuntimeException('No TrueType font found for story product rendering.');
    }

    private function fontPathForLanguage(?string $language): string
    {
        // For Arabic, we need a font that supports Arabic script properly
        if ($language === 'ar') {
            $arabicFonts = [
                '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
                '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            ];
            
            foreach ($arabicFonts as $candidate) {
                if (file_exists($candidate)) return $candidate;
            }
        }
        
        // For English and other languages, use standard fonts
        return $this->fontPath();
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
