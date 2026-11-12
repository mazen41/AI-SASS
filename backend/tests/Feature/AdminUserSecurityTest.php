<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_admin_cannot_create_or_promote_staff(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/users', [
            'name' => 'Escalation Attempt',
            'email' => 'escalation@example.test',
            'password' => 'a-long-test-password',
            'role' => 'super_admin',
            'status' => 'active',
        ])->assertForbidden();

        $target = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $this->putJson("/api/admin/users/{$target->id}", ['role' => 'super_admin'])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'escalation@example.test']);
        $this->assertSame('user', $target->fresh()->role);
    }

    public function test_regular_admin_cannot_modify_or_suspend_staff_accounts(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $superAdmin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/users/{$superAdmin->id}", ['name' => 'Changed'])
            ->assertForbidden();
        $this->postJson("/api/admin/users/{$superAdmin->id}/suspend")
            ->assertForbidden();
        $this->postJson("/api/admin/users/{$superAdmin->id}/activate")
            ->assertForbidden();

        $this->assertSame('active', $superAdmin->fresh()->status);
        $this->assertSame($superAdmin->name, $superAdmin->fresh()->name);
    }

    public function test_user_deletion_does_not_cascade_through_financial_or_media_records(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $target = User::factory()->create(['role' => 'user', 'status' => 'active']);
        Sanctum::actingAs($superAdmin);

        $this->deleteJson("/api/admin/users/{$target->id}")
            ->assertStatus(409)
            ->assertJsonPath('error_code', 'PRIVACY_WORKFLOW_REQUIRED');

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }
}
