<?php

namespace App\Services;

use App\Models\Story;
use App\Models\StorybookPage;
use Illuminate\Support\Facades\Log;

class StorybookGenerationService
{
    private GeminiService $gemini;

    public function __construct(GeminiService $gemini)
    {
        $this->gemini = $gemini;
    }

    /**
     * Generate storybook page structure from story content
     */
    public function generateStorybook(Story $story): array
    {
        Log::info("SERVICE START: StorybookGenerationService::generateStorybook()", [
            'story_id' => $story->id,
            'language' => $story->language,
        ]);

        Log::info("SERVICE STEP 1 START: GeminiService::generateStorybookPages() call", ['story_id' => $story->id]);

        // Generate page structure using Gemini
        $pagesData = $this->gemini->generateStorybookPages([
            'title' => $story->title,
            'story_text' => $story->content,
            'scenes' => $story->scenes ?? [],
            'child_name' => $story->child_name,
            'theme' => $story->theme,
            'language' => $story->language,
            'page_count' => 16,
        ]);

        Log::info("SERVICE STEP 1 COMPLETE: GeminiService::generateStorybookPages() returned", [
            'story_id' => $story->id,
            'pages_count' => count($pagesData['pages'] ?? [])
        ]);

        Log::info("SERVICE STEP 2 START: Delete existing storybook pages", ['story_id' => $story->id]);

        // Clear existing pages for this story
        StorybookPage::where('story_id', $story->id)->delete();

        Log::info("SERVICE STEP 2 COMPLETE: Existing pages deleted", ['story_id' => $story->id]);

        Log::info("SERVICE STEP 3 START: Create StorybookPage records", ['story_id' => $story->id]);

        // Create StorybookPage records
        $pages = [];
        foreach ($pagesData['pages'] as $index => $pageData) {
            $promptLength = strlen($pageData['illustration_prompt'] ?? '');
            $titleLength = strlen($pageData['title'] ?? '');
            $contentLength = strlen($pageData['content'] ?? '');
            $dialogueLength = strlen($pageData['dialogue'] ?? '');

            Log::info("SERVICE STEP 3.{$index} Creating page", [
                'story_id' => $story->id,
                'page_number' => $index + 1,
                'prompt_length' => $promptLength,
                'title_length' => $titleLength,
                'content_length' => $contentLength,
                'dialogue_length' => $dialogueLength
            ]);

            $page = StorybookPage::create([
                'story_id' => $story->id,
                'page_number' => $index + 1,
                'page_type' => $pageData['page_type'] ?? 'story',
                'status' => 'planned',
                'title' => $pageData['title'] ?? null,
                'content' => $pageData['content'] ?? null,
                'dialogue' => $pageData['dialogue'] ?? null,
                'illustration_prompt' => $pageData['illustration_prompt'] ?? null,
                'illustration_url' => null,
                'background_url' => null,
                'decorative_elements' => null,
                'layout_type' => $pageData['layout_type'] ?? 'split',
                'text_position' => $pageData['text_position'] ?? 'bottom',
                'color_scheme' => $pageData['color_scheme'] ?? 'bright_primary',
                'metadata' => [
                    'generated_at' => now()->toISOString(),
                    'scene_number' => $pageData['scene_number'] ?? null,
                ],
            ]);
            $pages[] = $page;
        }

        Log::info("SERVICE STEP 3 COMPLETE: StorybookPage records created", [
            'story_id' => $story->id,
            'page_count' => count($pages),
        ]);

        Log::info("SERVICE COMPLETE: StorybookGenerationService::generateStorybook() returned", [
            'story_id' => $story->id,
            'page_count' => count($pages),
        ]);

        return $pages;
    }

    /**
     * Update storybook data JSON on story model
     */
    public function updateStorybookData(Story $story, array $pages): void
    {
        $storybookData = [
            'title' => $story->title,
            'child_name' => $story->child_name,
            'language' => $story->language,
            'rtl' => ($story->language ?? 'en') === 'ar',
            'page_count' => count($pages),
            'pages' => array_map(function ($page) {
                return [
                    'page_number' => $page->page_number,
                    'page_type' => $page->page_type,
                    'title' => $page->title,
                    'content' => $page->content,
                    'dialogue' => $page->dialogue,
                    'layout_type' => $page->layout_type,
                    'text_position' => $page->text_position,
                    'color_scheme' => $page->color_scheme,
                ];
            }, $pages),
        ];

        $story->update(['storybook_data' => $storybookData]);
    }
}
