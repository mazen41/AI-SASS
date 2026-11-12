<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminForcedPasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_created_by_owner_must_change_temporary_password_before_admin_access(): void
    {
        $owner = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        Sanctum::actingAs($owner);
        $response = $this->postJson('/api/admin/users', [
            'name' => 'Provisioned Staff',
            'email' => 'provisioned@example.test',
            'password' => 'TempPassword123',
            'role' => 'admin',
            'status' => 'active',
        ])->assertCreated();

        $staff = User::findOrFail($response->json('user.id'));
        $this->assertTrue($staff->must_change_password);
        Sanctum::actingAs($staff);
        $this->getJson('/api/admin/users')->assertStatus(428)->assertJsonPath('error_code', 'PASSWORD_CHANGE_REQUIRED');

        $this->postJson('/api/account/password/force-change', [
            'current_password' => 'TempPassword123',
            'password' => 'SecureNewPassword123',
            'password_confirmation' => 'SecureNewPassword123',
        ])->assertOk();

        $staff->refresh();
        $this->assertFalse($staff->must_change_password);
        $this->assertTrue(Hash::check('SecureNewPassword123', $staff->password));
        $this->assertNotNull($staff->password_changed_at);
        $this->getJson('/api/admin/users')->assertOk();
    }

    public function test_password_rotation_rejects_wrong_temporary_password_and_weak_new_password(): void
    {
        $user = User::factory()->create(['must_change_password' => true]);
        Sanctum::actingAs($user);

        $this->postJson('/api/account/password/force-change', [
            'current_password' => 'incorrect',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertUnprocessable();
        $this->assertTrue($user->fresh()->must_change_password);
    }
}
