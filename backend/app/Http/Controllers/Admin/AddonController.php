<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlanAddon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AddonController extends Controller
{
    public function index(): JsonResponse
    {
        $addons = PlanAddon::orderBy('sort_order')->get();
        return response()->json(['addons' => $addons]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:plan_addons',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'story_limit' => 'integer|min:0',
            'video_limit' => 'integer|min:0',
            'daily_story_limit' => 'integer|min:0',
            'daily_video_limit' => 'integer|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $addon = PlanAddon::create($request->only([
            'name', 'slug', 'description', 'price', 'story_limit', 'video_limit', 'daily_story_limit', 'daily_video_limit', 'is_active', 'sort_order'
        ]));

        return response()->json(['message' => 'Add-on created.', 'addon' => $addon], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $addon = PlanAddon::findOrFail($id);

        $request->validate([
            'name' => 'string|max:255',
            'slug' => 'string|max:255|unique:plan_addons,slug,' . $id,
            'description' => 'nullable|string',
            'price' => 'numeric|min:0',
            'story_limit' => 'integer|min:0',
            'video_limit' => 'integer|min:0',
            'daily_story_limit' => 'integer|min:0',
            'daily_video_limit' => 'integer|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $addon->update($request->only([
            'name', 'slug', 'description', 'price', 'story_limit', 'video_limit', 'daily_story_limit', 'daily_video_limit', 'is_active', 'sort_order'
        ]));

        return response()->json(['message' => 'Add-on updated.', 'addon' => $addon]);
    }

    public function destroy(int $id): JsonResponse
    {
        $addon = PlanAddon::findOrFail($id);
        $addon->delete();
        return response()->json(['message' => 'Add-on deleted.']);
    }
}
