<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardRevenueTest extends TestCase
{
    use RefreshDatabase;

    public function test_revenue_is_grouped_by_currency_and_excludes_non_sales(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $customer = User::factory()->create(['role' => 'user', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->transaction($customer, 'sar-old', 100, 'SAR', 'completed', 'subscription', now()->subMonth());
        $this->transaction($customer, 'sar-current', 50, 'SAR', 'completed', 'subscription', now());
        $this->transaction($customer, 'usd-current', 10, 'USD', 'completed', 'one_time', now());
        $this->transaction($customer, 'refund', 50, 'SAR', 'completed', 'refund', now());
        $this->transaction($customer, 'pending', 300, 'SAR', 'pending', 'subscription', now());

        $revenue = $this->getJson('/api/admin/stats')
            ->assertOk()
            ->json('revenue');

        $this->assertNull($revenue['total']);
        $this->assertNull($revenue['this_month']);
        $this->assertNull($revenue['growth_percentage']);
        $this->assertEqualsCanonicalizing([
            ['currency' => 'SAR', 'total' => '150.00'],
            ['currency' => 'USD', 'total' => '10.00'],
        ], $revenue['total_by_currency']);
        $this->assertEqualsCanonicalizing([
            ['currency' => 'SAR', 'total' => '50.00'],
            ['currency' => 'USD', 'total' => '10.00'],
        ], $revenue['this_month_by_currency']);
        $this->assertEqualsCanonicalizing([
            ['currency' => 'SAR', 'total' => '50.00', 'count' => 1],
        ], $revenue['refunds_by_currency']);
    }

    private function transaction(User $user, string $id, float $amount, string $currency, string $status, string $type, $createdAt): void
    {
        Transaction::forceCreate([
            'user_id' => $user->id,
            'gateway' => 'test',
            'gateway_transaction_id' => $id,
            'amount' => $amount,
            'currency' => $currency,
            'status' => $status,
            'type' => $type,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }
}
