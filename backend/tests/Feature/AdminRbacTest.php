<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminRbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_create_a_restricted_role_and_assign_it(): void
    {
        $owner = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $staff = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($owner);

        $roleResponse = $this->postJson('/api/admin/roles', [
            'name' => 'Read only support',
            'permissions' => ['users.view'],
        ])->assertCreated()->assertJsonPath('role.name', 'Read only support');
        $roleId = $roleResponse->json('role.id');

        $this->putJson("/api/admin/users/{$staff->id}/admin-role", ['admin_role_id' => $roleId])->assertOk();
        $this->assertSame($roleId, $staff->fresh()->admin_role_id);

        Sanctum::actingAs($staff->fresh());
        $this->getJson('/api/admin/users')->assertOk();
        $this->postJson('/api/admin/users', [
            'name' => 'Should be denied',
            'email' => 'denied@example.test',
            'password' => 'a-long-test-password',
            'role' => 'user',
            'status' => 'active',
        ])->assertForbidden()->assertJsonPath('required_permission', 'users.manage');
    }

    public function test_role_management_is_denied_to_restricted_admin_and_owner_bypasses_permission_checks(): void
    {
        $role = AdminRole::where('slug', 'administrator')->firstOrFail();
        $staff = User::factory()->create(['role' => 'admin', 'status' => 'active', 'admin_role_id' => $role->id]);
        Sanctum::actingAs($staff);
        $this->postJson('/api/admin/roles', ['name' => 'Unauthorized role'])->assertForbidden()->assertJsonPath('required_permission', 'roles.manage');

        $owner = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        Sanctum::actingAs($owner);
        $this->getJson('/api/admin/roles')->assertOk();
    }

    public function test_new_admin_created_by_owner_gets_compatibility_role_unless_another_is_selected(): void
    {
        $owner = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/admin/users', [
            'name' => 'New Staff Admin',
            'email' => 'new-admin@example.test',
            'password' => 'a-long-test-password',
            'role' => 'admin',
            'status' => 'active',
        ])->assertCreated();

        $this->assertSame(
            AdminRole::where('slug', 'administrator')->value('id'),
            User::findOrFail($response->json('user.id'))->admin_role_id,
        );
    }
}
