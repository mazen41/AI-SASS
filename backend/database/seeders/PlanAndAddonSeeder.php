<?php

namespace Database\Seeders;

use App\Models\PlanAddon;
use Illuminate\Database\Seeder;

class PlanAndAddonSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Subscription Plans via the dedicated idempotent seeder
        $this->call(SubscriptionPlansSeeder::class);

        // 2. Seed Plan Add-ons safely (never delete existing rows)
        $addons = [
            [
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
            ],
            [
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
            ],
        ];

        foreach ($addons as $addonData) {
            PlanAddon::firstOrCreate(['slug' => $addonData['slug']], $addonData);
        }
    }
}
