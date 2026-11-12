<?php

namespace Tests\Feature;

use App\Models\AiCreditTransaction;
use App\Models\AiCreditWallet;
use App\Models\Story;
use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiCreditServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_receives_one_idempotent_welcome_grant(): void
    {
        $user = User::factory()->create();
        $service = app(AiCreditService::class);

        $service->grant($user, 30, 'welcome_grant', 'welcome-credit:' . $user->id, 'subscription');

        $this->assertSame(30, (int) $service->summarize($user)['subscription_credits']);
        $this->assertSame(1, AiCreditTransaction::where('reference', 'welcome-credit:' . $user->id)->count());
    }

    public function test_reservation_finalization_and_refund_are_idempotent(): void
    {
        $user = User::factory()->create();
        $story = Story::create(['user_id' => $user->id, 'title' => 'Test', 'theme' => 'adventure', 'status' => 'draft', 'selected_outputs' => ['story_text']]);
        $service = app(AiCreditService::class);

        $reservation = $service->reserve($user, $story, ['story_text']);
        $this->assertSame('reserved', $reservation->status);
        $this->assertSame(19, $service->summarize($user)['available_credits']);
        $this->assertSame(11, $service->summarize($user)['reserved_credits']);

        $service->finalizeOutput($story, 'story_text');
        $service->finalizeOutput($story, 'story_text');
        $summary = $service->summarize($user);
        $this->assertSame(0, $summary['reserved_credits']);
        $this->assertSame(11, $summary['consumed_this_cycle']);
        $this->assertSame(1, AiCreditTransaction::where('reference', "reservation:{$reservation->id}:story_text:consumed")->count());

        $secondStory = Story::create(['user_id' => $user->id, 'title' => 'Test 2', 'theme' => 'adventure', 'status' => 'draft', 'selected_outputs' => ['story_text']]);
        $second = $service->reserve($user, $secondStory, ['story_text']);
        $this->assertTrue($service->refundOutput($secondStory, 'story_text', 'test failure'));
        $this->assertFalse($service->refundOutput($secondStory, 'story_text', 'duplicate failure'));
        $this->assertSame(1, AiCreditTransaction::where('reference', "reservation:{$second->id}:story_text:refund")->count());
        $this->assertSame(19, $service->summarize($user)['available_credits']);
    }

    public function test_duplicate_payment_grant_does_not_change_wallet_twice(): void
    {
        $user = User::factory()->create();
        $service = app(AiCreditService::class);

        $this->assertTrue($service->grant($user, 250, 'credit_purchase', 'payment:unique-1'));
        $this->assertFalse($service->grant($user, 250, 'credit_purchase', 'payment:unique-1'));
        $this->assertSame(280, $service->summarize($user)['available_credits']);
        $this->assertSame(250, (int) AiCreditWallet::where('user_id', $user->id)->value('purchased_credits'));
    }

    public function test_page_count_changes_server_estimate_and_client_cannot_set_price(): void
    {
        $user = User::factory()->create();
        $service = app(AiCreditService::class);
        $eightPages = $service->estimate($user, ['story_book_pdf'], ['page_count' => 8]);
        $twentyPages = $service->estimate($user, ['story_book_pdf'], ['page_count' => 20]);

        $this->assertSame(40, $eightPages['total_credits']);
        $this->assertSame(100, $twentyPages['total_credits']);
        $this->actingAs($user, 'sanctum')->postJson('/api/ai-credits/estimate', [
            'selected_outputs' => ['story_text'], 'credits' => 1,
        ])->assertOk()->assertJsonPath('total_credits', 11);
    }

    public function test_insufficient_balance_does_not_create_reservation_or_change_wallet(): void
    {
        $user = User::factory()->create();
        $story = Story::create(['user_id' => $user->id, 'title' => 'Large book', 'theme' => 'adventure', 'status' => 'draft', 'selected_outputs' => ['story_book_pdf'], 'generation_settings' => ['page_count' => 20]]);
        $service = app(AiCreditService::class);

        try {
            $service->reserve($user, $story, ['story_book_pdf'], ['page_count' => 20]);
            $this->fail('Reservation should reject an insufficient wallet.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Insufficient AI credits', $exception->getMessage());
        }

        $this->assertSame(30, $service->summarize($user)['available_credits']);
        $this->assertSame(0, $service->summarize($user)['reserved_credits']);
        $this->assertDatabaseMissing('ai_credit_reservations', ['story_id' => $story->id]);
    }

    public function test_subscription_grant_does_not_erase_purchased_or_rollover_credits(): void
    {
        $user = User::factory()->create();
        $service = app(AiCreditService::class);
        $service->grant($user, 200, 'credit_purchase', 'payment:purchased-1', 'purchased');
        $service->grant($user, 250, 'subscription_renewal', 'invoice:renewal-1', 'subscription');

        $wallet = AiCreditWallet::where('user_id', $user->id)->firstOrFail();
        $this->assertSame(280, (int) $wallet->subscription_credits);
        $this->assertSame(200, (int) $wallet->purchased_credits);
        $this->assertSame(480, $wallet->available);
    }

    public function test_partial_generation_keeps_successful_output_and_refunds_only_failed_output(): void
    {
        $user = User::factory()->create();
        $story = Story::create(['user_id' => $user->id, 'title' => 'Partial', 'theme' => 'adventure', 'status' => 'processing', 'selected_outputs' => ['story_text', 'narration_audio']]);
        $service = app(AiCreditService::class);
        $reservation = $service->reserve($user, $story, ['story_text', 'narration_audio']);

        $service->finalizeOutput($story, 'story_text');
        $this->assertTrue($service->refundOutput($story, 'narration_audio', 'provider failure'));
        $this->assertFalse($service->refundOutput($story, 'narration_audio', 'retry'));

        $this->assertSame('partially_refunded', $reservation->fresh()->status);
        $this->assertSame(19, $service->summarize($user)['available_credits']);
        $this->assertSame(0, $service->summarize($user)['reserved_credits']);
        $this->assertSame(11, $service->summarize($user)['consumed_this_cycle']);
    }

    public function test_credit_history_is_scoped_to_authenticated_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        app(AiCreditService::class)->grant($other, 99, 'credit_purchase', 'payment:other-user', 'purchased');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/ai-credits/history')->assertOk();
        $this->assertSame(['welcome-credit:' . $user->id], collect($response->json('data'))->pluck('reference')->all());
    }
}
