<?php

namespace App\Http\Controllers;

use App\Models\Story;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use App\Jobs\GenerateStoryProductsJob;
use Illuminate\Support\Facades\Storage;

class StoryController extends Controller
{
    public function index(Request $request)
    {
        $stories = $request->user()->stories()
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($stories);
    }

    public function show(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'story'   => $story->load(['user', 'outputs']),
            'assets'  => $story->assets()->orderBy('scene_number')->get(),
            'outputs' => $story->outputs()->get()->keyBy('output_type'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'         => 'required|string|max:255',
            'theme'         => 'required|string|in:adventure,space,jungle,fantasy,ocean,dinosaur,superhero,princess,pirate',
            'child_name'    => 'nullable|string|max:100',
            'child_age'     => 'nullable|integer|min:1|max:18',
            'language'      => 'nullable|string|in:en,ar',
            'custom_prompt' => 'nullable|string|max:500',
            'photo'         => 'nullable|image|max:10240',
        ]);

        $user         = $request->user();
        $limitDetails = $user->getStoryLimitDetails();

        // Only enforce limits when the user has an active subscription;
        // users without a subscription can create stories freely.
        if ($user->activeSubscription()) {
            if (!$limitDetails['is_unlimited'] && $limitDetails['usage'] >= $limitDetails['total_limit']) {
                return response()->json(['message' => 'Monthly story limit reached.', 'limit_details' => $limitDetails], 403);
            }

            if (!$limitDetails['is_daily_unlimited'] && $limitDetails['daily_usage'] >= $limitDetails['daily_total_limit']) {
                return response()->json(['message' => 'Daily story limit reached.', 'limit_details' => $limitDetails], 403);
            }
        }

        $data = [
            'user_id'       => $user->id,
            'title'         => $validated['title'],
            'theme'         => $validated['theme'],
            'child_name'    => $validated['child_name']    ?? null,
            'child_age'     => $validated['child_age']     ?? null,
            'language'      => $validated['language']      ?? 'en',
            'custom_prompt' => $validated['custom_prompt'] ?? null,
            'status'        => 'draft',
        ];

        if ($request->hasFile('photo')) {
            $disk        = config('filesystems.default');
            $path        = $request->file('photo')->store('stories/photos', ['disk' => $disk, 'visibility' => 'public']);
            $data['photo_url'] = Storage::disk($disk)->url($path);
        }

        $story = Story::create($data);

        ActivityLog::log(userId: $user->id, action: 'story_created', entityType: 'story', entityId: $story->id, newValues: $data);

        return response()->json(['message' => 'Story created successfully', 'story' => $story], 201);
    }

    public function generate(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$story->isDraft()) {
            return response()->json(['message' => 'Story can only be generated from draft status'], 400);
        }

        $user         = $request->user();
        $videoDetails = $user->getVideoLimitDetails();

        // Only enforce limits when a subscription exists; allow free use otherwise
        if ($user->activeSubscription()) {
            if (!$videoDetails['is_unlimited'] && $videoDetails['usage'] >= $videoDetails['total_limit']) {
                return response()->json(['message' => 'Monthly video limit reached.', 'limit_details' => $videoDetails], 403);
            }
            if (!$videoDetails['is_daily_unlimited'] && $videoDetails['daily_usage'] >= $videoDetails['daily_total_limit']) {
                return response()->json(['message' => 'Daily video limit reached.', 'limit_details' => $videoDetails], 403);
            }
        }

        $story->update(['status' => 'processing', 'processing_step' => 'queued']);

        \App\Jobs\GenerateStoryJob::dispatch($story);

        return response()->json(['message' => 'Story generation started', 'story' => $story->fresh()], 202);
    }

    public function status(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'status'          => $story->status,
            'processing_step' => $story->processing_step,
            'error_message'   => $story->error_message,
            'assembled_video_url' => $story->assembled_video_url,
            'narration_url'   => $story->narration_url,
            'outputs'         => $story->outputs()->get()->keyBy('output_type'),
            'assets_count'    => [
                'images' => $story->imageAssets()->count(),
                'videos' => $story->videoAssets()->count(),
                'coloring_pages' => $story->coloringPageAssets()->count(),
            ],
        ]);
    }

    public function generateProducts(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$story->content || $story->imageAssets()->count() === 0) {
            return response()->json(['message' => 'Story text and scene images are required before book products can be generated.'], 422);
        }

        GenerateStoryProductsJob::dispatchSync($story);

        return response()->json([
            'message' => 'Story products generated',
            'outputs' => $story->fresh()->outputs()->get()->keyBy('output_type'),
        ]);
    }

    public function update(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title'         => 'sometimes|string|max:255',
            'child_name'    => 'sometimes|nullable|string|max:100',
            'child_age'     => 'sometimes|nullable|integer|min:1|max:18',
            'custom_prompt' => 'sometimes|nullable|string|max:500',
        ]);

        $story->update($validated);

        return response()->json(['message' => 'Story updated', 'story' => $story->fresh()]);
    }

    public function destroy(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($story->photo_url) {
            $disk = config('filesystems.default');
            if (preg_match('/stories\/photos\/.+$/', $story->photo_url, $matches)) {
                Storage::disk($disk)->delete($matches[0]);
            }
        }

        // Delete all story storage folder
        $disk = config('filesystems.default');
        Storage::disk($disk)->deleteDirectory("stories/{$story->id}");

        $story->delete();

        return response()->json(['message' => 'Story deleted']);
    }
}
