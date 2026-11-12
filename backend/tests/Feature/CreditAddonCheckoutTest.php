<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PlanAddon;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditAddonCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_addon_endpoint_does_not_create_a_paid_invoice_without_payment(): void
    {
        $user = User::factory()->create();
        $addon = PlanAddon::create([
            'name' => 'Test credits',
            'slug' => 'test-credits',
            'price' => 5.99,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/billing/addons/purchase', [
            'addon_id' => $addon->id,
        ]);

        $response->assertStatus(503)->assertJsonPath('code', 'ADDON_CHECKOUT_UNAVAILABLE');
        $this->assertDatabaseMissing('invoices', ['user_id' => $user->id]);
        $this->assertSame(0, Invoice::where('user_id', $user->id)->count());
    }
}
