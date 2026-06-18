<?php

namespace App\Http\Controllers;

use App\Models\Story;
use App\Models\StorybookPage;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StorybookViewerController extends Controller
{
    public function show(Request $request, Story $story)
    {
        // Authentication check - return JSON 401 instead of redirecting to 'login'
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated. Please use a Bearer token to access this endpoint.'], 401);
        }

        // Authorization check
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized - You do not own this storybook'], 403);
        }

        // Check if storybook is generated
        if (!$story->storybook_data) {
            return response()->json(['message' => 'Storybook not yet generated'], 404);
        }

        // Load storybook pages
        $pages = StorybookPage::where('story_id', $story->id)
            ->orderBy('page_number')
            ->get();

        if ($pages->isEmpty()) {
            return response()->json(['message' => 'Storybook pages not found'], 404);
        }

        return response()->json([
            'story' => [
                'id' => $story->id,
                'title' => $story->title,
                'child_name' => $story->child_name,
                'language' => $story->language,
                'rtl' => ($story->language ?? 'en') === 'ar',
                'narration_url' => $story->narration_url,
                'storybook_data' => $story->storybook_data,
            ],
            'pages' => $pages->map(function ($page) {
                return [
                    'id' => $page->id,
                    'page_number' => $page->page_number,
                    'page_type' => $page->page_type,
                    'title' => $page->title,
                    'content' => $page->content,
                    'dialogue' => $page->dialogue,
                    'illustration_url' => $page->illustration_url,
                    'background_url' => $page->background_url,
                    'decorative_elements' => $page->decorative_elements,
                    'layout_type' => $page->layout_type,
                    'text_position' => $page->text_position,
                    'color_scheme' => $page->color_scheme,
                ];
            }),
        ]);
    }

    public function page(Request $request, Story $story, int $pageNumber)
    {
        // Authentication check
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated - Please login to access storybook'], 401);
        }

        // Authorization check
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized - You do not own this storybook'], 403);
        }

        $page = StorybookPage::where('story_id', $story->id)
            ->where('page_number', $pageNumber)
            ->first();

        if (!$page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        return response()->json([
            'page' => [
                'id' => $page->id,
                'page_number' => $page->page_number,
                'page_type' => $page->page_type,
                'title' => $page->title,
                'content' => $page->content,
                'dialogue' => $page->dialogue,
                'illustration_url' => $page->illustration_url,
                'background_url' => $page->background_url,
                'decorative_elements' => $page->decorative_elements,
                'layout_type' => $page->layout_type,
                'text_position' => $page->text_position,
                'color_scheme' => $page->color_scheme,
            ],
        ]);
    }
}
