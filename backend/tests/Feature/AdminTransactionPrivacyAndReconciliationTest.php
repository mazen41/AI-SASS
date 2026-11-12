<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTransactionPrivacyAndReconciliationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_transaction_views_do_not_expose_provider_payloads_and_summary_keeps_currencies_separate(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $customer = User::factory()->create(['role' => 'user', 'status' => 'active', 'name' => '=HYPERLINK("https://example.test","click")']);
        Sanctum::actingAs($admin);

        $sar = Transaction::create([
            'user_id' => $customer->id,
            'gateway' => 'myfatoorah',
            'gateway_transaction_id' => 'mf-private-123',
            'amount' => 90,
            'currency' => 'SAR',
            'status' => 'completed',
            'type' => 'subscription',
            'gateway_response' => ['api_key' => 'never-return-this'],
        ]);
        Transaction::create([
            'user_id' => $customer->id,
            'gateway' => 'stripe',
            'gateway_transaction_id' => 'stripe-private-456',
            'amount' => 25,
            'currency' => 'USD',
            'status' => 'completed',
            'type' => 'one_time',
            'gateway_response' => ['authorization' => 'never-return-this-either'],
        ]);
        $pending = Transaction::create([
            'user_id' => $customer->id,
            'gateway' => 'myfatoorah',
            'gateway_transaction_id' => 'mf-pending-789',
            'amount' => 10,
            'currency' => 'SAR',
            'status' => 'pending',
            'type' => 'subscription',
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);
        DB::table('transactions')->where('id', $pending->id)->update(['created_at' => now()->subHour()]);

        $this->getJson('/api/admin/transactions')
            ->assertOk()
            ->assertJsonMissingPath('data.0.gateway_response')
            ->assertJsonMissingPath('data.1.gateway_response');

        $this->getJson("/api/admin/transactions/{$sar->id}")
            ->assertOk()
            ->assertJsonPath('transaction.gateway_transaction_id', 'mf-private-123')
            ->assertJsonMissingPath('transaction.gateway_response');

        $summary = $this->getJson('/api/admin/transactions/reconciliation')->assertOk();
        $summary->assertJsonPath('source', 'internal_transaction_ledger')
            ->assertJsonPath('stale_pending_count', 1);
        $currencyTotals = collect($summary->json('currency_status_totals'));
        $this->assertSame(90.0, (float) $currencyTotals->firstWhere('currency', 'SAR')['amount_total']);
        $this->assertSame(25.0, (float) $currencyTotals->firstWhere('currency', 'USD')['amount_total']);
        $this->assertStringContainsString('do not confirm settlement', $summary->json('note'));

        $csv = $this->getJson('/api/admin/transactions-export')->assertOk()->json('csv');
        $this->assertStringContainsString("'=HYPERLINK", $csv);
        $this->assertStringNotContainsString('never-return-this', $csv);
    }

    public function test_transaction_filters_are_validated_and_export_is_scoped_to_requested_dates(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $customer = User::factory()->create(['role' => 'user', 'status' => 'active']);
        Sanctum::actingAs($admin);

        Transaction::create([
            'user_id' => $customer->id,
            'gateway' => 'stripe',
            'gateway_transaction_id' => 'old-record',
            'amount' => 1,
            'currency' => 'USD',
            'status' => 'failed',
            'type' => 'one_time',
            'created_at' => now()->subDays(10),
            'updated_at' => now()->subDays(10),
        ]);

        $this->getJson('/api/admin/transactions?status=unknown')->assertUnprocessable();
        $csv = $this->getJson('/api/admin/transactions-export?date_from=' . now()->subDay()->toDateString())
            ->assertOk()
            ->json('csv');
        $this->assertStringNotContainsString('old-record', $csv);
    }
}
