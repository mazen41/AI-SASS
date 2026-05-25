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

        $story->update(['status' => 'processing']);

        // Simulate AI processing
        $themeData = $this->generateStoryContent($story);

        $story->update([
            'status'           => 'completed',
            'content'          => $themeData['content'],
            'scenes'           => $themeData['scenes'],
            'duration_seconds' => $themeData['duration'],
            'video_url'        => $themeData['video_url'],
        ]);

        // Log activity
        ActivityLog::log(
            userId: $request->user()->id,
            action: 'story_generated',
            entityType: 'story',
            entityId: $story->id,
            oldValues: ['status' => 'processing'],
            newValues: ['status' => 'completed']
        );

        return response()->json([
            'message' => 'Story generated successfully',
            'story'   => $story->fresh(),
        ]);
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

    /**
     * Simulate AI story generation based on theme
     */
    private function generateStoryContent(Story $story): array
    {
        $themes = [
            'adventure' => [
                'title' => 'The Great Adventure of {name}',
                'content' => "Once upon a time, in a land filled with wonder, {name} embarked on an incredible journey. Through mystical forests and over towering mountains, {name} discovered courage they never knew they had. With the help of new friends, they solved ancient riddles and found the treasure that was friendship itself.",
            ],
            'space' => [
                'title' => '{name} and the Cosmic Quest',
                'content' => "In the vast expanse of the cosmos, {name} piloted a shiny spacecraft through swirling nebulas and past twinkling stars. On a mission to save the galaxy from a dark force, {name} showed extraordinary bravery. Along the way, they discovered that the brightest light comes from within.",
            ],
            'jungle' => [
                'title' => '{name} and the Jungle Kingdom',
                'content' => "Deep in the heart of the emerald jungle, {name} swung from vine to vine, befriending colorful parrots and wise old elephants. When the ancient Tree of Life began to wither, {name} embarked on a quest to find the magical water that would restore it, learning that true strength comes from helping others.",
            ],
            'fantasy' => [
                'title' => '{name} and the Magic Realm',
                'content' => "In a world where dragons soared and castles floated in the clouds, {name} discovered a magical amulet that granted one special wish. But instead of using it for themselves, {name} chose to heal the broken kingdom and bring happiness to everyone, proving that the greatest magic of all is kindness.",
            ],
            'ocean' => [
                'title' => '{name} Under the Sea',
                'content' => "Beneath the sparkling waves, {name} explored coral cities and danced with dolphins. When a mysterious darkness threatened the underwater world, {name} discovered they could communicate with sea creatures and led them to restore the light, showing that courage flows like the tides.",
            ],
            'dinosaur' => [
                'title' => '{name} and the Dino World',
                'content' => "In a world where dinosaurs still roamed, {name} became the youngest dinosaur whisperer. Through jungles of giant ferns and valleys of volcanoes, {name} helped a lost baby T-Rex find its family, learning that even the fiercest creatures need a friend.",
            ],
            'superhero' => [
                'title' => '{name} the Superhero',
                'content' => "When a strange meteor gave {name} extraordinary powers, they faced a choice: use them for personal gain or protect the city. {name} chose heroism, saving the day with courage and heart. The city cheered their name, but {name} knew the real power was in always doing what's right.",
            ],
            'princess' => [
                'title' => '{name} and the Royal Quest',
                'content' => "In a magnificent kingdom, {name} proved that being royal isn't about wearing a crown - it's about leading with kindness. When the kingdom faced a great challenge, {name} used wisdom, bravery, and compassion to unite everyone and save the day, showing that true royalty comes from the heart.",
            ],
            'pirate' => [
                'title' => '{name} and the Treasure Map',
                'content' => "Aboard the mighty ship Starfinder, Captain {name} led a crew of quirky pirates across the seven seas. Following a mysterious map, they discovered that the greatest treasure wasn't gold or jewels, but the unbreakable bonds of friendship forged during their incredible voyage.",
            ],
        ];

        $theme = $themes[$story->theme] ?? $themes['adventure'];
        $childName = $story->child_name ?? 'the hero';

        $content = str_replace('{name}', $childName, $theme['content']);
        $title = str_replace('{name}', $childName, $theme['title']);

        // Generate scenes
        $scenes = [
            ['chapter' => 1, 'description' => 'The beginning of the journey', 'duration' => 30],
            ['chapter' => 2, 'description' => 'Meeting new friends', 'duration' => 45],
            ['chapter' => 3, 'description' => 'Facing the challenge', 'duration' => 60],
            ['chapter' => 4, 'description' => 'The heroic moment', 'duration' => 50],
            ['chapter' => 5, 'description' => 'Happy ending', 'duration' => 35],
        ];

        return [
            'title'    => $title,
            'content'  => $content,
            'scenes'   => $scenes,
            'duration' => array_sum(array_column($scenes, 'duration')),
            'video_url'  => null, // Would be generated by actual AI service
        ];
    }
}
