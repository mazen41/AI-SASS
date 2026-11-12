<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\ActivityLog;
use App\Models\Story;
use App\Models\Transaction;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserDetailPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_detail_includes_admin_metrics_without_gateway_or_child_media_secrets(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $target = User::factory()->create([
            'role' => 'user',
            'status' => 'active',
            'social_provider' => 'google',
            'social_id' => 'private-oauth-subject',
        ]);
        Sanctum::actingAs($admin);

        $plan = Plan::create(['name' => 'Starter', 'slug' => 'starter-test', 'price' => 99, 'billing_period' => 'monthly']);
        $subscription = Subscription::create([
            'user_id' => $target->id,
            'plan_id' => $plan->id,
            'gateway' => 'myfatoorah',
            'status' => 'active',
        ]);
        Transaction::create([
            'user_id' => $target->id,
            'subscription_id' => $subscription->id,
            'gateway' => 'myfatoorah',
            'gateway_transaction_id' => 'private-gateway-ref',
            'amount' => 99,
            'currency' => 'SAR',
            'status' => 'completed',
            'type' => 'subscription',
            'gateway_response' => ['secret' => 'private-gateway-payload'],
        ]);
        Story::create([
            'user_id' => $target->id,
            'title' => 'A private story',
            'content' => 'private child story content',
            'child_name' => 'Private Child',
            'photo_url' => 'private/child-photo.jpg',
            'status' => 'processing',
        ]);
        DB::table('ai_credit_wallets')->where('user_id', $target->id)->update([
            'subscription_credits' => 900,
            'purchased_credits' => 100,
        ]);

        $response = $this->getJson("/api/admin/users/{$target->id}")->assertOk();

        $response->assertJsonPath('user.email', $target->email)
            ->assertJsonPath('user.subscriptions_count', 1)
            ->assertJsonPath('user.transactions_count', 1)
            ->assertJsonPath('user.stories_count', 1)
            ->assertJsonPath('user.ai_credit_wallet.available_credits', 1000)
            ->assertJsonPath('user.transactions.0.gateway_transaction_id', 'private-gateway-ref')
            ->assertJsonMissingPath('user.transactions.0.gateway_response')
            ->assertJsonMissingPath('user.social_id')
            ->assertJsonMissingPath('user.stories.0.content')
            ->assertJsonMissingPath('user.stories.0.child_name')
            ->assertJsonMissingPath('user.stories.0.photo_url');

        $this->putJson("/api/admin/users/{$target->id}", ['name' => 'Updated Name'])->assertOk();
        $auditSnapshot = ActivityLog::where('action', 'user_updated')->latest('id')->firstOrFail()->new_values;
        $this->assertArrayNotHasKey('social_id', $auditSnapshot);
        $this->assertArrayNotHasKey('password', $auditSnapshot);
    }
}
