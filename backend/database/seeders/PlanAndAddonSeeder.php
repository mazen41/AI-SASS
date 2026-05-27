<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\PlanAddon;
use Illuminate\Database\Seeder;

class PlanAndAddonSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing plans and addons
        Plan::query()->delete();
        PlanAddon::query()->delete();

        // 1. Seed Subscription Plans
        Plan::create([
            'name' => 'Basic Plan',
            'slug' => 'basic',
            'description' => 'Perfect for beginners starting their storytelling journey.',
            'price' => 4.99,
            'billing_period' => 'monthly',
            'story_limit' => 5,
            'video_limit' => 1,
            'daily_story_limit' => 1,
            'daily_video_limit' => 1,
            'features' => [
                'Create up to 5 stories per month',
                'Generate 1 animated video per month',
                'Maximum 1 story creation per day',
                'Upload custom photos',
                'Access to standard themes',
            ],
            'is_active' => true,
            'is_featured' => false,
            'sort_order' => 1,
        ]);

        Plan::create([
            'name' => 'Pro Plan',
            'slug' => 'pro',
            'description' => 'Our most popular plan for active storytelling kids.',
            'price' => 9.99,
            'billing_period' => 'monthly',
            'story_limit' => 15,
            'video_limit' => 5,
            'daily_story_limit' => 2,
            'daily_video_limit' => 1,
            'features' => [
                'Create up to 15 stories per month',
                'Generate 5 animated videos per month',
                'Maximum 2 stories creation per day',
                'Upload custom photos',
                'Access to all themes',
                'Priority generation speed',
            ],
            'is_active' => true,
            'is_featured' => true,
            'sort_order' => 2,
        ]);

        Plan::create([
            'name' => 'Diamond Plan',
            'slug' => 'diamond',
            'description' => 'Unlimited storytelling power for creators.',
            'price' => 19.99,
            'billing_period' => 'monthly',
            'story_limit' => 999999, // unlimited
            'video_limit' => 15,
            'daily_story_limit' => 5,
            'daily_video_limit' => 2,
            'features' => [
                'Create unlimited stories',
                'Generate 15 animated videos per month',
                'Maximum 5 stories creation per day',
                'Upload custom photos',
                'Access to all premium themes',
                'Ultra fast generation priority',
                'Dedicated support channel',
            ],
            'is_active' => true,
            'is_featured' => false,
            'sort_order' => 3,
        ]);

        // 2. Seed Plan Add-ons
        PlanAddon::create([
            'name' => 'Extra 10 Stories',
            'slug' => 'extra-stories-10',
            'description' => 'Get an additional 10 story creation credits for the current billing cycle.',
            'price' => 2.99,
            'story_limit' => 10,
            'video_limit' => 0,
            'daily_story_limit' => 0,
            'daily_video_limit' => 0,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        PlanAddon::create([
            'name' => 'Extra 5 Videos',
            'slug' => 'extra-videos-5',
            'description' => 'Get an additional 5 animated video generation credits for the current billing cycle.',
            'price' => 4.99,
            'story_limit' => 0,
            'video_limit' => 5,
            'daily_story_limit' => 0,
            'daily_video_limit' => 0,
            'is_active' => true,
            'sort_order' => 2,
        ]);
    }
}
