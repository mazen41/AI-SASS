<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_plans_seeder_is_idempotent(): void
    {
        // First run
        (new SubscriptionPlansSeeder)->run();

        $initialCount = Plan::count();
        $this->assertGreaterThanOrEqual(5, $initialCount);

        // Check required 5 seeded tiers exist with exact configured prices and credits
        $free = Plan::where('slug', 'free')->first();
        $starter = Plan::where('slug', 'starter')->first();
        $family = Plan::where('slug', 'family')->first();
        $creator = Plan::where('slug', 'creator')->first();
        $ultimate = Plan::where('slug', 'ultimate')->first();

        $this->assertNotNull($free);
        $this->assertSame('0.00', (string) $free->price);
        $this->assertSame(30, $free->monthly_credits);

        $this->assertNotNull($starter);
        $this->assertSame('9.99', (string) $starter->price);
        $this->assertSame(250, $starter->monthly_credits);

        $this->assertNotNull($family);
        $this->assertSame('19.99', (string) $family->price);
        $this->assertSame(750, $family->monthly_credits);

        $this->assertNotNull($creator);
        $this->assertSame('39.99', (string) $creator->price);
        $this->assertSame(1800, $creator->monthly_credits);

        $this->assertNotNull($ultimate);
        $this->assertSame('79.99', (string) $ultimate->price);
        $this->assertSame(4000, $ultimate->monthly_credits);

        // Second run must not duplicate any plans
        (new SubscriptionPlansSeeder)->run();
        $this->assertSame($initialCount, Plan::count());
    }

    public function test_seeder_does_not_overwrite_admin_modifications(): void
    {
        (new SubscriptionPlansSeeder)->run();

        // Admin modifies starter plan price and credits
        $starter = Plan::where('slug', 'starter')->first();
        $starter->update([
            'price' => 14.99,
            'monthly_credits' => 350,
            'description' => 'Admin customized starter description',
        ]);

        // Re-run seeder
        (new SubscriptionPlansSeeder)->run();

        $fresh = Plan::where('slug', 'starter')->first();
        $this->assertSame('14.99', (string) $fresh->price);
        $this->assertSame(350, $fresh->monthly_credits);
        $this->assertSame('Admin customized starter description', $fresh->description);
    }

    public function test_admin_can_create_update_duplicate_reorder_archive_and_delete_plan(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        // 1. Create plan
        $createRes = $this->postJson('/api/admin/plans', [
            'name' => 'Custom VIP Tier',
            'slug' => 'custom-vip',
            'description' => 'Exclusive custom plan for artists',
            'price' => 49.99,
            'yearly_price' => 499.99,
            'monthly_credits' => 2500,
            'billing_period' => 'monthly',
            'is_active' => true,
            'is_public' => true,
            'capabilities' => [
                'story_enabled' => true,
                'video_enabled' => true,
                'max_storybook_pages' => 24,
            ],
            'features' => ['2,500 credits', '24 page storybooks'],
        ]);

        $createRes->assertCreated();
        $planId = $createRes->json('plan.id');
        $this->assertDatabaseHas('plans', ['slug' => 'custom-vip']);

        // 2. Update plan
        $updateRes = $this->putJson("/api/admin/plans/{$planId}", [
            'name' => 'Custom VIP Tier Updated',
            'price' => 54.99,
        ]);
        $updateRes->assertOk();
        $this->assertSame('54.99', (string) Plan::find($planId)->price);

        // 3. Duplicate plan
        $dupRes = $this->postJson("/api/admin/plans/{$planId}/duplicate");
        $dupRes->assertCreated();
        $dupSlug = $dupRes->json('plan.slug');
        $this->assertStringStartsWith('custom-vip-copy', $dupSlug);

        // 4. Reorder plans
        $reorderRes = $this->putJson('/api/admin/plans/order', [
            'orders' => [
                ['id' => $planId, 'sort_order' => 99],
            ],
        ]);
        $reorderRes->assertOk();
        $this->assertSame(99, Plan::find($planId)->sort_order);

        // 5. Archive plan
        $archiveRes = $this->postJson("/api/admin/plans/{$planId}/archive");
        $archiveRes->assertOk();
        $this->assertFalse((bool) Plan::find($planId)->is_active);
        $this->assertFalse((bool) Plan::find($planId)->is_public);

        // 6. Delete plan (has no subscriptions)
        $deleteRes = $this->deleteJson("/api/admin/plans/{$planId}");
        $deleteRes->assertOk();
        $this->assertDatabaseMissing('plans', ['id' => $planId]);
    }

    public function test_plan_with_subscriptions_cannot_be_deleted(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $plan = Plan::create([
            'name' => 'Subscribed Plan',
            'slug' => 'subscribed-plan',
            'price' => 19.99,
            'monthly_credits' => 500,
            'billing_period' => 'monthly',
        ]);

        $subscriber = User::factory()->create(['status' => 'active']);
        Subscription::create([
            'user_id' => $subscriber->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'active',
        ]);

        $deleteRes = $this->deleteJson("/api/admin/plans/{$plan->id}");
        $deleteRes->assertStatus(422);
        $this->assertDatabaseHas('plans', ['id' => $plan->id]);
    }

    public function test_unauthorized_users_blocked_from_admin_plans(): void
    {
        $regularUser = User::factory()->create(['role' => 'user', 'status' => 'active']);

        // Regular user blocked with 403
        Sanctum::actingAs($regularUser);
        $this->getJson('/api/admin/plans')->assertForbidden();
        $this->postJson('/api/admin/plans', ['name' => 'Hacker Plan'])->assertForbidden();

        // Unauthenticated guest blocked with 401
        app('auth')->forgetGuards();
        $this->withHeaders(['Authorization' => 'Bearer invalid_token'])->getJson('/api/admin/plans')->assertUnauthorized();
    }

    public function test_public_pricing_endpoint_returns_active_and_public_plans(): void
    {
        (new SubscriptionPlansSeeder)->run();

        // Create a hidden/private plan
        Plan::create([
            'name' => 'Secret Internal Plan',
            'slug' => 'secret-plan',
            'price' => 1.00,
            'monthly_credits' => 10,
            'billing_period' => 'monthly',
            'is_active' => true,
            'is_public' => false,
        ]);

        // Create an inactive plan
        Plan::create([
            'name' => 'Deprecated Tier',
            'slug' => 'deprecated-tier',
            'price' => 5.00,
            'monthly_credits' => 50,
            'billing_period' => 'monthly',
            'is_active' => false,
            'is_public' => true,
        ]);

        $res = $this->getJson('/api/pricing/plans');
        $res->assertOk();

        $slugs = collect($res->json('plans'))->pluck('slug')->all();
        $this->assertContains('free', $slugs);
        $this->assertContains('starter', $slugs);
        $this->assertNotContains('secret-plan', $slugs);
        $this->assertNotContains('deprecated-tier', $slugs);
    }

    public function test_free_plan_can_be_activated_without_payment_gateway(): void
    {
        (new SubscriptionPlansSeeder)->run();
        $freePlan = Plan::where('slug', 'free')->firstOrFail();

        $user = User::factory()->create(['status' => 'active']);
        Sanctum::actingAs($user);

        $res = $this->postJson('/api/billing/subscribe/free', [
            'plan_id' => $freePlan->id,
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $freePlan->id,
            'gateway' => 'free',
            'status' => 'active',
        ]);
    }

    public function test_plan_restrictions_enforced_server_side(): void
    {
        (new SubscriptionPlansSeeder)->run();
        $freePlan = Plan::where('slug', 'free')->firstOrFail();

        $user = User::factory()->create(['status' => 'active']);
        Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $freePlan->id,
            'gateway' => 'free',
            'status' => 'active',
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        Sanctum::actingAs($user);

        // Attempt video generation (Free plan has video_enabled = false)
        $videoRes = $this->postJson('/api/stories', [
            'title' => 'My Video Adventure',
            'theme' => 'adventure',
            'selected_outputs' => ['video'],
        ]);
        $videoRes->assertStatus(403);
        $this->assertStringContainsString('Video generation is not included', $videoRes->json('message'));

        // Attempt storybook with 16 pages (Free plan has max_storybook_pages = 8)
        $pagesRes = $this->postJson('/api/stories', [
            'title' => 'My Long Book',
            'theme' => 'adventure',
            'selected_outputs' => ['story_book_pdf'],
            'page_count' => 16,
        ]);
        $pagesRes->assertStatus(403);
        $this->assertStringContainsString('allows a maximum of 8 storybook pages', $pagesRes->json('message'));
    }
}
