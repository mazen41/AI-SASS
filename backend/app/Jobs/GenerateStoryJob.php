<?php

namespace App\Jobs;

use App\Models\Story;
use App\Models\ActivityLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GenerateStoryJob implements ShouldQueue
{
    use Queueable;

    public $story;

    /**
     * Create a new job instance.
     */
    public function __construct(Story $story)
    {
        $this->story = $story;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $themeData = $this->generateStoryContent($this->story);

            $this->story->update([
                'status'           => 'completed',
                'content'          => $themeData['content'],
                'scenes'           => $themeData['scenes'],
                'duration_seconds' => $themeData['duration'],
                'video_url'        => $themeData['video_url'],
            ]);

            // Log activity
            ActivityLog::log(
                userId: $this->story->user_id,
                action: 'story_generated',
                entityType: 'story',
                entityId: $this->story->id,
                oldValues: ['status' => 'processing'],
                newValues: ['status' => 'completed']
            );
        } catch (\Exception $e) {
            Log::error('Story generation failed: ' . $e->getMessage());
            $this->story->update(['status' => 'failed']);
            
            ActivityLog::log(
                userId: $this->story->user_id,
                action: 'story_generation_failed',
                entityType: 'story',
                entityId: $this->story->id,
                oldValues: ['status' => 'processing'],
                newValues: ['status' => 'failed']
            );
        }
    }

    private function generateStoryContent(Story $story): array
    {
        // Add a slight delay to simulate an external API call
        sleep(2);
        
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
