<?php

namespace App\Http\Controllers;

use App\Models\Story;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StoryController extends Controller
{
    /**
     * List user's stories
     */
    public function index(Request $request)
    {
        $stories = $request->user()->stories()
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($stories);
    }

    /**
     * Get a single story
     */
    public function show(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['story' => $story->load('user')]);
    }

    /**
     * Create a new story (upload photo + choose theme)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'theme'       => 'required|string|in:adventure,space,jungle,fantasy,ocean,dinosaur,superhero,princess,pirate',
            'child_name'  => 'nullable|string|max:100',
            'child_age'   => 'nullable|integer|min:1|max:18',
            'language'    => 'nullable|string|in:en,ar',
            'photo'       => 'nullable|image|max:10240', // 10MB max
        ]);

        $user = $request->user();
        $limitDetails = $user->getStoryLimitDetails();
        
        if (!$limitDetails['is_unlimited'] && $limitDetails['usage'] >= $limitDetails['total_limit']) {
            return response()->json([
                'message' => 'You have reached your monthly story limit. Please upgrade your plan or purchase an add-on to create more stories.',
                'limit_details' => $limitDetails
            ], 403);
        }

        if (!$limitDetails['is_daily_unlimited'] && $limitDetails['daily_usage'] >= $limitDetails['daily_total_limit']) {
            return response()->json([
                'message' => 'You have reached your daily story creation limit.',
                'limit_details' => $limitDetails
            ], 403);
        }

        $data = [
            'user_id'    => $request->user()->id,
            'title'      => $validated['title'],
            'theme'      => $validated['theme'],
            'child_name' => $validated['child_name'] ?? null,
            'child_age'  => $validated['child_age'] ?? null,
            'language'   => $validated['language'] ?? 'en',
            'status'     => 'draft',
        ];

        // Handle photo upload
        if ($request->hasFile('photo')) {
            $disk = config('filesystems.default');
            $path = $request->file('photo')->store('stories/photos', [
                'disk' => $disk,
                'visibility' => 'public'
            ]);
            $data['photo_url'] = Storage::disk($disk)->url($path);
        }

        $story = Story::create($data);

        // Log activity
        ActivityLog::log(
            userId: $request->user()->id,
            action: 'story_created',
            entityType: 'story',
            entityId: $story->id,
            newValues: $data
        );

        return response()->json([
            'message' => 'Story created successfully',
            'story'   => $story,
        ], 201);
    }

    /**
     * Generate story content (simulate AI generation)
     */
    public function generate(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$story->isDraft()) {
            return response()->json(['message' => 'Story can only be generated from draft status'], 400);
        }

        $user = $request->user();
        $videoDetails = $user->getVideoLimitDetails();

        if (!$videoDetails['is_unlimited'] && $videoDetails['usage'] >= $videoDetails['total_limit']) {
            return response()->json([
                'message' => 'You have reached your monthly video generation limit. Please upgrade your plan or purchase an add-on to generate more videos.',
                'limit_details' => $videoDetails
            ], 403);
        }

        if (!$videoDetails['is_daily_unlimited'] && $videoDetails['daily_usage'] >= $videoDetails['daily_total_limit']) {
            return response()->json([
                'message' => 'You have reached your daily video generation limit.',
                'limit_details' => $videoDetails
            ], 403);
        }

        $story->update(['status' => 'processing']);

        \App\Jobs\GenerateStoryJob::dispatch($story);

        return response()->json([
            'message' => 'Story generation started',
            'story'   => $story->fresh(),
        ], 202);
    }

    /**
     * Update story
     */
    public function update(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title'      => 'sometimes|string|max:255',
            'child_name' => 'sometimes|nullable|string|max:100',
            'child_age'  => 'sometimes|nullable|integer|min:1|max:18',
        ]);

        $story->update($validated);

        return response()->json([
            'message' => 'Story updated',
            'story'   => $story->fresh(),
        ]);
    }

    /**
     * Delete story
     */
    public function destroy(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete photo if exists
        if ($story->photo_url) {
            $disk = config('filesystems.default');
            if (preg_match('/stories\/photos\/.+$/', $story->photo_url, $matches)) {
                $path = $matches[0];
                Storage::disk($disk)->delete($path);
            } else {
                $path = str_replace(asset('storage/'), '', $story->photo_url);
                Storage::disk('public')->delete($path);
            }
        }

        $story->delete();

        return response()->json(['message' => 'Story deleted']);
    }


}
