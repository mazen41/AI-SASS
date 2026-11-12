<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\Package;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

class SubscriptionPlansSeeder extends Seeder
{
    /**
     * Initial subscription plans configuration in Saudi Riyals (SAR / ر.س).
     * These represent factory baseline defaults. Admin modifications in the database
     * are strictly preserved and never overwritten by subsequent seeder executions.
     */
    public static function getInitialPlans(): array
    {
        return [
            [
                'name' => 'Free',
                'slug' => 'free',
                'description' => 'Explore the studio and create your very first personalized AI story.',
                'price' => 0.00,
                'yearly_price' => 0.00,
                'monthly_credits' => 30,
                'story_limit' => 2,
                'video_limit' => 0,
                'daily_story_limit' => 1,
                'daily_video_limit' => 0,
                'billing_period' => 'monthly',
                'icon' => 'sparkles',
                'badge' => null,
                'trial_days' => 0,
                'sort_order' => 1,
                'is_active' => true,
                'is_public' => true,
                'is_featured' => false,
                'features' => [
                    '30 AI Credits per month',
                    '2 personalized stories per month',
                    '8-page illustrated storybook preview',
                    'Printable coloring sheets',
                    'Standard AI creative model',
                    'Community support',
                ],
                'capabilities' => [
                    'story_enabled' => true,
                    'storybook_enabled' => true,
                    'coloring_enabled' => true,
                    'narration_enabled' => false,
                    'video_enabled' => false,
                    'max_storybook_pages' => 8,
                    'max_coloring_pages' => 8,
                    'max_video_duration_seconds' => 0,
                    'allowed_ai_models' => ['standard'],
                    'character_consistency' => false,
                    'priority_generation' => false,
                    'commercial_usage' => false,
                    'custom_branding' => false,
                    'support_level' => 'community',
                ],
            ],
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Great for parents starting a regular bedtime story and imagination routine.',
                'price' => 39.00,
                'yearly_price' => 390.00,
                'monthly_credits' => 250,
                'story_limit' => 15,
                'video_limit' => 2,
                'daily_story_limit' => 3,
                'daily_video_limit' => 1,
                'billing_period' => 'monthly',
                'icon' => 'zap',
                'badge' => null,
                'trial_days' => 0,
                'sort_order' => 2,
                'is_active' => true,
                'is_public' => true,
                'is_featured' => false,
                'features' => [
                    '250 AI Credits per month',
                    'Up to 15 stories & 2 cinematic videos',
                    '12-page illustrated storybooks',
                    'Character consistency from uploaded photo',
                    'AI voice narration',
                    'Printable A4 coloring books',
                    'Standard email support',
                ],
                'capabilities' => [
                    'story_enabled' => true,
                    'storybook_enabled' => true,
                    'coloring_enabled' => true,
                    'narration_enabled' => true,
                    'video_enabled' => true,
                    'max_storybook_pages' => 12,
                    'max_coloring_pages' => 12,
                    'max_video_duration_seconds' => 30,
                    'allowed_ai_models' => ['standard', 'high_quality'],
                    'character_consistency' => true,
                    'priority_generation' => false,
                    'commercial_usage' => false,
                    'custom_branding' => false,
                    'support_level' => 'email',
                ],
            ],
            [
                'name' => 'Family',
                'slug' => 'family',
                'description' => 'Our most popular plan for families who want rich storytelling, videos, and full creative magic.',
                'price' => 79.00,
                'yearly_price' => 790.00,
                'monthly_credits' => 750,
                'story_limit' => 40,
                'video_limit' => 8,
                'daily_story_limit' => 5,
                'daily_video_limit' => 2,
                'billing_period' => 'monthly',
                'icon' => 'heart',
                'badge' => 'RECOMMENDED',
                'trial_days' => 0,
                'sort_order' => 3,
                'is_active' => true,
                'is_public' => true,
                'is_featured' => true,
                'features' => [
                    '750 AI Credits per month',
                    'Up to 40 stories & 8 cinematic videos',
                    '16-page storybooks in high resolution',
                    'Advanced character consistency (Fal.ai & Claude)',
                    'Custom emotional audio narration',
                    'Priority generation queue',
                    'Full PDF exports with personal dedications',
                    'Priority customer support',
                ],
                'capabilities' => [
                    'story_enabled' => true,
                    'storybook_enabled' => true,
                    'coloring_enabled' => true,
                    'narration_enabled' => true,
                    'video_enabled' => true,
                    'max_storybook_pages' => 16,
                    'max_coloring_pages' => 16,
                    'max_video_duration_seconds' => 60,
                    'allowed_ai_models' => ['standard', 'high_quality', 'premium'],
                    'character_consistency' => true,
                    'priority_generation' => true,
                    'commercial_usage' => false,
                    'custom_branding' => true,
                    'support_level' => 'priority',
                ],
            ],
            [
                'name' => 'Creator',
                'slug' => 'creator',
                'description' => 'Built for teachers, content creators, and prolific storytellers crafting professional narratives.',
                'price' => 159.00,
                'yearly_price' => 1590.00,
                'monthly_credits' => 1800,
                'story_limit' => 100,
                'video_limit' => 25,
                'daily_story_limit' => 10,
                'daily_video_limit' => 5,
                'billing_period' => 'monthly',
                'icon' => 'sparkles',
                'badge' => 'CREATOR CHOICE',
                'trial_days' => 0,
                'sort_order' => 4,
                'is_active' => true,
                'is_public' => true,
                'is_featured' => false,
                'features' => [
                    '1,800 AI Credits per month',
                    'Up to 100 stories & 25 cinematic videos',
                    '20-page storybooks in 4K resolution',
                    'Commercial usage license included',
                    'Ultra-fast priority generation engine',
                    'Watermark removal & custom branding',
                    'Multi-character scenes & custom art styles',
                    'Priority direct support',
                ],
                'capabilities' => [
                    'story_enabled' => true,
                    'storybook_enabled' => true,
                    'coloring_enabled' => true,
                    'narration_enabled' => true,
                    'video_enabled' => true,
                    'max_storybook_pages' => 20,
                    'max_coloring_pages' => 20,
                    'max_video_duration_seconds' => 90,
                    'allowed_ai_models' => ['standard', 'high_quality', 'premium'],
                    'character_consistency' => true,
                    'priority_generation' => true,
                    'commercial_usage' => true,
                    'custom_branding' => true,
                    'support_level' => 'priority',
                ],
            ],
            [
                'name' => 'Ultimate',
                'slug' => 'ultimate',
                'description' => 'Unrestricted studio power with maximum monthly credits, longest videos, and dedicated rendering.',
                'price' => 319.00,
                'yearly_price' => 3190.00,
                'monthly_credits' => 4000,
                'story_limit' => 250,
                'video_limit' => 60,
                'daily_story_limit' => 25,
                'daily_video_limit' => 15,
                'billing_period' => 'monthly',
                'icon' => 'crown',
                'badge' => 'MAX POWER',
                'trial_days' => 0,
                'sort_order' => 5,
                'is_active' => true,
                'is_public' => true,
                'is_featured' => false,
                'features' => [
                    '4,000 AI Credits per month',
                    'Up to 250 stories & 60 cinematic videos',
                    '24-page storybooks with premium print layout',
                    'Extended cinematic video duration (120s)',
                    'Full commercial usage & publishing license',
                    'Dedicated GPU rendering priority',
                    'White-label branding & custom cover pages',
                    'Dedicated VIP account manager support',
                ],
                'capabilities' => [
                    'story_enabled' => true,
                    'storybook_enabled' => true,
                    'coloring_enabled' => true,
                    'narration_enabled' => true,
                    'video_enabled' => true,
                    'max_storybook_pages' => 24,
                    'max_coloring_pages' => 24,
                    'max_video_duration_seconds' => 120,
                    'allowed_ai_models' => ['standard', 'high_quality', 'premium'],
                    'character_consistency' => true,
                    'priority_generation' => true,
                    'commercial_usage' => true,
                    'custom_branding' => true,
                    'support_level' => 'dedicated',
                ],
            ],
        ];
    }

    public function run(): void
    {
        $plans = self::getInitialPlans();

        foreach ($plans as $planData) {
            // IDEMPOTENCY GUARANTEE:
            // Check if plan already exists by unique slug.
            // If it exists, LEAVE IT UNTOUCHED to preserve all admin edits!
            // If it does not exist, insert it as initial seed data.
            $exists = Plan::where('slug', $planData['slug'])->exists();
            if (!$exists) {
                Plan::create($planData);
            }

            // Also ensure packages table has matching active packages
            Package::updateOrCreate(
                ['name' => $planData['name']],
                [
                    'description' => $planData['description'],
                    'total_price' => $planData['price'],
                    'is_active' => true,
                ]
            );
        }

        Cache::forget('active_plans');
    }
}
