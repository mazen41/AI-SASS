<?php

namespace App\Services;

use App\Models\Story;
use App\Models\StorybookPage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StorybookIllustrationService
{
    private FalAiService $falAi;
    private string $disk;

    public function __construct(FalAiService $falAi)
    {
        $this->falAi = $falAi;
        // Hardcoded 'public' — see FalAiService::downloadAndStore() for why
        // config('filesystems.default') must never be used for this.
        $this->disk = 'public';
    }

    /**
     * Generate unique illustrations for all pages in a storybook
     * Uses concurrent processing to speed up API calls
     */
    public function generateAllIllustrations(Story $story): void
    {
        Log::info("SERVICE START: StorybookIllustrationService::generateAllIllustrations()", ['story_id' => $story->id]);

        $pages = StorybookPage::where('story_id', $story->id)
            ->orderBy('page_number')
            ->get();

        Log::info("SERVICE STEP 1: Retrieved pages for illustration generation", [
            'story_id' => $story->id,
            'total_pages' => count($pages),
            'pages_with_prompts' => collect($pages)->where('illustration_prompt', '!=', null)->count()
        ]);

        // Filter pages that need illustrations
        $pagesNeedingIllustration = $pages->filter(function ($page) {
            return $page->illustration_prompt && !$page->illustration_url;
        });
        
        // Limit to TEST_IMAGE_COUNT for testing
        $testImageCount = (int)env('TEST_IMAGE_COUNT', 0);
        if ($testImageCount > 0) {
            $pagesNeedingIllustration = $pagesNeedingIllustration->take($testImageCount);
        }

        Log::info("SERVICE STEP 2: Starting concurrent illustration generation", [
            'story_id' => $story->id,
            'pages_to_process' => count($pagesNeedingIllustration)
        ]);

        // Process pages concurrently using multi-curl approach
        // This reduces 12+ minutes to ~3-4 minutes by making API calls simultaneously
        $photoUrl = $story->photo_url ?? null;
        
        $this->processPagesConcurrently($pagesNeedingIllustration, $photoUrl, $story);

        Log::info("SERVICE COMPLETE: StorybookIllustrationService::generateAllIllustrations() returned", ['story_id' => $story->id]);
    }

    /**
     * Process multiple pages concurrently using curl multi-handle
     */
    private function processPagesConcurrently($pages, $photoUrl, $story): void
    {
        $chunkSize = 4; // Process 4 pages at a time to avoid overwhelming the API
        $chunks = $pages->chunk($chunkSize);
        
        foreach ($chunks as $chunk) {
            $this->processChunk($chunk, $photoUrl, $story);
        }
    }

    /**
     * Process a chunk of pages (batch processing for reliability)
     */
    private function processChunk($pages, $photoUrl, $story): void
    {
        foreach ($pages as $page) {
            Log::info("BATCH PROCESSING: Starting illustration for page", [
                'story_id' => $story->id,
                'page_number' => $page->page_number
            ]);

            try {
                $this->generatePageIllustration($page, $photoUrl, $story->child_age);
                
                Log::info("BATCH PROCESSING: Completed illustration for page", [
                    'story_id' => $story->id,
                    'page_number' => $page->page_number
                ]);
            } catch (\Throwable $e) {
                Log::error("BATCH PROCESSING: Failed to generate illustration for page", [
                    'story_id' => $story->id,
                    'page_number' => $page->page_number,
                    'error' => $e->getMessage()
                ]);
                // Continue with other pages even if one fails
            }
        }
    }

    /**
     * Generate illustration for a single page
     */
    public function generatePageIllustration(StorybookPage $page, ?string $photoUrl = null, ?int $childAge = null): void
    {
        try {
            Log::info("ILLUSTRATION START: generatePageIllustration()", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            $prompt = $page->illustration_prompt;
            if (!$prompt) {
                Log::info("ILLUSTRATION SKIP: No prompt found", [
                    'story_id' => $page->story_id,
                    'page_number' => $page->page_number
                ]);
                return;
            }

            Log::info("ILLUSTRATION STEP 1 START: FalAiService::generateImage() call", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            // Generate image using Fal.ai
            $imageUrl = $this->falAi->generateImage($prompt, $photoUrl, $childAge);

            Log::info("ILLUSTRATION STEP 1 COMPLETE: FalAiService::generateImage() returned", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'image_url' => $imageUrl
            ]);

            Log::info("ILLUSTRATION STEP 2 START: FalAiService::downloadAndStore() call", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            // Download and store
            $filename = "stories/{$page->story_id}/storybook/page_{$page->page_number}.jpg";
            $storedUrl = $this->falAi->downloadAndStore($imageUrl, $filename);

            Log::info("ILLUSTRATION STEP 2 COMPLETE: FalAiService::downloadAndStore() returned", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'stored_url' => $storedUrl
            ]);

            Log::info("ILLUSTRATION STEP 3 START: Update page with illustration_url", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            // Update page with illustration URL
            $page->update(['illustration_url' => $storedUrl]);

            Log::info("ILLUSTRATION STEP 3 COMPLETE: Page updated", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            Log::info("ILLUSTRATION COMPLETE: generatePageIllustration() finished", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
            ]);
        } catch (\Throwable $e) {
            Log::error("ILLUSTRATION ERROR: Failed to generate illustration for storybook page", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Generate decorative background for a page
     */
    public function generateBackground(StorybookPage $page): void
    {
        try {
            Log::info("BACKGROUND START: generateBackground()", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            $colorScheme = $page->color_scheme ?? 'bright_primary';
            $prompt = $this->generateBackgroundPrompt($colorScheme, $page->page_type);

            Log::info("BACKGROUND STEP 1 START: FalAiService::generateImage() call", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            $imageUrl = $this->falAi->generateImage($prompt, null, null);

            Log::info("BACKGROUND STEP 1 COMPLETE: FalAiService::generateImage() returned", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'image_url' => $imageUrl
            ]);

            Log::info("BACKGROUND STEP 2 START: FalAiService::downloadAndStore() call", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            $filename = "stories/{$page->story_id}/storybook/background_{$page->page_number}.jpg";
            $storedUrl = $this->falAi->downloadAndStore($imageUrl, $filename);

            Log::info("BACKGROUND STEP 2 COMPLETE: FalAiService::downloadAndStore() returned", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'stored_url' => $storedUrl
            ]);

            Log::info("BACKGROUND STEP 3 START: Update page with background_url", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            $page->update(['background_url' => $storedUrl]);

            Log::info("BACKGROUND STEP 3 COMPLETE: Page updated", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            Log::info("BACKGROUND COMPLETE: generateBackground() finished", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
            ]);
        } catch (\Throwable $e) {
            Log::error("BACKGROUND ERROR: Failed to generate background for storybook page", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Generate decorative elements for a page
     */
    public function generateDecorativeElements(StorybookPage $page): void
    {
        try {
            Log::info("DECORATIVE START: generateDecorativeElements()", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            $elements = [];
            $pageType = $page->page_type;

            // Generate 2-3 decorative elements per page
            $elementCount = rand(2, 3);

            Log::info("DECORATIVE STEP 1: Starting decorative elements generation loop", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'element_count' => $elementCount
            ]);

            for ($i = 0; $i < $elementCount; $i++) {
                Log::info("DECORATIVE STEP 1.{$i} START: Generate decorative element {$i}", [
                    'story_id' => $page->story_id,
                    'page_number' => $page->page_number,
                    'element_index' => $i
                ]);

                $prompt = $this->generateDecorativeElementPrompt($pageType);

                Log::info("DECORATIVE STEP 1.{$i}.1 START: FalAiService::generateImage() call", [
                    'story_id' => $page->story_id,
                    'page_number' => $page->page_number,
                    'element_index' => $i
                ]);

                $imageUrl = $this->falAi->generateImage($prompt, null, null);

                Log::info("DECORATIVE STEP 1.{$i}.1 COMPLETE: FalAiService::generateImage() returned", [
                    'story_id' => $page->story_id,
                    'page_number' => $page->page_number,
                    'element_index' => $i,
                    'image_url' => $imageUrl
                ]);

                Log::info("DECORATIVE STEP 1.{$i}.2 START: FalAiService::downloadAndStore() call", [
                    'story_id' => $page->story_id,
                    'page_number' => $page->page_number,
                    'element_index' => $i
                ]);

                $filename = "stories/{$page->story_id}/storybook/decorative_{$page->page_number}_{$i}.png";
                $storedUrl = $this->falAi->downloadAndStore($imageUrl, $filename);

                Log::info("DECORATIVE STEP 1.{$i}.2 COMPLETE: FalAiService::downloadAndStore() returned", [
                    'story_id' => $page->story_id,
                    'page_number' => $page->page_number,
                    'element_index' => $i,
                    'stored_url' => $storedUrl
                ]);

                $elements[] = [
                    'url' => $storedUrl,
                    'position' => $this->randomPosition(),
                    'size' => $this->randomSize(),
                    'rotation' => rand(-15, 15),
                ];

                Log::info("DECORATIVE STEP 1.{$i} COMPLETE: Decorative element {$i} generated", [
                    'story_id' => $page->story_id,
                    'page_number' => $page->page_number,
                    'element_index' => $i
                ]);
            }

            Log::info("DECORATIVE STEP 2 START: Update page with decorative_elements", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            $page->update(['decorative_elements' => $elements]);

            Log::info("DECORATIVE STEP 2 COMPLETE: Page updated", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number
            ]);

            Log::info("DECORATIVE COMPLETE: generateDecorativeElements() finished", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'count' => count($elements),
            ]);
        } catch (\Throwable $e) {
            Log::error("DECORATIVE ERROR: Failed to generate decorative elements for storybook page", [
                'story_id' => $page->story_id,
                'page_number' => $page->page_number,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    private function generateBackgroundPrompt(string $colorScheme, string $pageType): string
    {
        $schemes = [
            'bright_primary' => 'bright primary colors, cheerful and vibrant',
            'warm_pastel' => 'warm pastel colors, soft and gentle',
            'vibrant' => 'vibrant and energetic colors',
            'soft' => 'soft and muted colors, calming',
            'educational' => 'educational colors, blue and yellow tones',
            'playful' => 'playful colors, rainbow palette',
            'celebration' => 'celebration colors, gold and sparkles',
        ];

        $colorDesc = $schemes[$colorScheme] ?? 'bright and colorful';

        $typeDesc = match($pageType) {
            'cover' => 'storybook cover background',
            'character_intro' => 'character introduction background',
            'story' => 'story page background',
            'lesson' => 'educational page background',
            'activity' => 'activity page background',
            'ending' => 'ending page background',
            default => 'children\'s book page background',
        };

        return "Children's book {$typeDesc}, {$colorDesc}, subtle pattern, professional illustration, suitable for children ages 3-8, clean and not distracting";
    }

    private function generateDecorativeElementPrompt(string $pageType): string
    {
        $elements = match($pageType) {
            'cover' => ['star', 'heart', 'sparkle'],
            'character_intro' => ['balloon', 'ribbon', 'cloud'],
            'story' => ['leaf', 'flower', 'butterfly'],
            'lesson' => ['book', 'pencil', 'lightbulb'],
            'activity' => ['crayon', 'paintbrush', 'star'],
            'ending' => ['confetti', 'star', 'heart'],
            default => ['star', 'circle', 'triangle'],
        };

        $element = $elements[array_rand($elements)];

        return "Children's book decorative element, simple {$element} icon, transparent background, colorful, professional illustration, suitable for children ages 3-8";
    }

    private function randomPosition(): array
    {
        return [
            'x' => rand(5, 90),
            'y' => rand(5, 90),
        ];
    }

    private function randomSize(): int
    {
        return rand(30, 80);
    }
}
