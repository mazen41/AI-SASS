<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\PendingRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationLegalAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_requires_explicit_terms_and_privacy_acceptance_and_records_versions(): void
    {
        Mail::fake();
        $package = Package::create(['name' => 'Free', 'total_price' => 0, 'is_active' => true]);
        $payload = [
            'name' => 'Test Parent',
            'email' => 'parent@example.test',
            'password' => 'A-secure-password-123',
            'password_confirmation' => 'A-secure-password-123',
            'package_id' => $package->id,
        ];

        $this->postJson('/api/register/initiate', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('pending_registrations', 0);

        $this->postJson('/api/register/initiate', $payload + [
            'terms_accepted' => true,
            'privacy_accepted' => true,
        ])->assertCreated();

        $pending = PendingRegistration::where('email', 'parent@example.test')->firstOrFail();
        $this->assertSame('2026-11-12', $pending->terms_version);
        $this->assertSame('2026-11-12', $pending->privacy_version);
        $this->assertNotNull($pending->legal_accepted_at);
    }

    public function test_new_social_signup_requires_terms_and_privacy_acceptance(): void
    {
        $package = Package::create(['name' => 'Free', 'total_price' => 0, 'is_active' => true]);

        $this->getJson('/api/auth/google?package_id=' . $package->id)
            ->assertUnprocessable()
            ->assertJsonPath('code', 'legal_acceptance_required');
    }

    public function test_social_exchange_code_is_one_time_and_returns_a_token_without_url_token_transport(): void
    {
        $user = User::create([
            'name' => 'Social Parent',
            'email' => 'social@example.test',
            'password' => 'A-secure-password-123',
            'status' => 'active',
        ]);
        $code = str_repeat('A', 64);
        Cache::put('social_auth_code:' . $code, ['user_id' => $user->id], now()->addMinute());

        $this->postJson('/api/auth/exchange', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('user.email', 'social@example.test')
            ->assertJsonStructure(['token', 'user']);

        $this->postJson('/api/auth/exchange', ['code' => $code])
            ->assertUnauthorized();
    }

    public function test_social_callback_rejects_missing_oauth_state_before_provider_exchange(): void
    {
        $response = $this->get('/api/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('/auth/callback?error=', $response->headers->get('Location'));
    }
}
