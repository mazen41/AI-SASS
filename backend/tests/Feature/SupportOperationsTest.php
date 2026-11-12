<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Invoice;
use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_open_and_reply_to_owned_ticket_but_cannot_read_other_customers_ticket(): void
    {
        $customer = User::factory()->create();
        $other = User::factory()->create();
        Sanctum::actingAs($customer);

        $created = $this->postJson('/api/support/tickets', [
            'subject' => 'Generation did not finish', 'category' => 'generation', 'message' => 'The story is stuck on processing.',
        ])->assertCreated();
        $ticketId = $created->json('ticket.id');
        $this->postJson("/api/support/tickets/{$ticketId}/reply", ['message' => 'I have added more details.'])->assertOk();
        $this->getJson("/api/support/tickets/{$ticketId}")->assertOk()->assertJsonPath('ticket.messages.1.body', 'I have added more details.');

        $otherTicket = $other->supportTickets()->create([
            'ticket_number' => 'NS-OTHER-001', 'subject' => 'Private support case', 'category' => 'general',
            'priority' => 'normal', 'status' => 'open', 'last_message_at' => now(),
        ]);
        $this->getJson("/api/support/tickets/{$otherTicket->id}")->assertNotFound();
    }

    public function test_admin_can_manage_and_reply_to_support_ticket(): void
    {
        $customer = User::factory()->create();
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $ticket = $customer->supportTickets()->create([
            'ticket_number' => 'NS-ADMIN-001', 'subject' => 'Billing question', 'category' => 'billing',
            'priority' => 'normal', 'status' => 'open', 'last_message_at' => now(),
        ]);
        $ticket->messages()->create(['sender_id' => $customer->id, 'sender_type' => 'customer', 'body' => 'Please explain this invoice.']);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/support-tickets/{$ticket->id}", ['priority' => 'high', 'status' => 'pending'])
            ->assertOk()->assertJsonPath('ticket.priority', 'high');
        $this->postJson("/api/admin/support-tickets/{$ticket->id}/reply", ['message' => 'We are reviewing this invoice.'])
            ->assertOk()->assertJsonPath('ticket.status', 'pending')
            ->assertJsonPath('ticket.messages.1.sender_type', 'admin');
    }

    public function test_admin_cannot_mark_local_invoice_paid_or_refunded_without_provider_confirmation(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $invoice = Invoice::create([
            'user_id' => User::factory()->create()->id, 'invoice_number' => 'INV-SUPPORT-001', 'amount' => 99,
            'currency' => 'SAR', 'status' => 'pending', 'gateway' => 'myfatoorah', 'gateway_transaction_id' => 'mf-test-1',
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/invoices/{$invoice->id}/mark-paid")->assertStatus(409);
        $this->postJson("/api/admin/invoices/{$invoice->id}/mark-refunded")->assertStatus(409);
        $this->assertSame('pending', $invoice->fresh()->status);
    }

    public function test_generation_support_requires_admin_permission_and_does_not_expose_story_content(): void
    {
        $customer = User::factory()->create();
        $story = Story::create(['user_id' => $customer->id, 'title' => 'Private story title', 'theme' => 'adventure', 'status' => 'failed']);
        $story->aiJobLogs()->create(['step' => 'generate_story', 'status' => 'failed', 'error' => 'Provider request failed for mazen@example.test with key=sk-test-secret']);
        $restrictedRole = AdminRole::create(['name' => 'Support reader', 'slug' => 'support-reader', 'is_system' => false]);
        $restrictedRole->permissions()->attach('generation.support');
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'admin_role_id' => $restrictedRole->id]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/generation-operations?status=failed')->assertOk()
            ->assertJsonMissing(['content' => $story->content])
            ->assertDontSee('mazen@example.test')
            ->assertDontSee('sk-test-secret');
        $this->getJson("/api/admin/generation-operations/stories/{$story->id}")->assertOk()
            ->assertDontSee('Private story title')
            ->assertDontSee('sk-test-secret');
    }
}
