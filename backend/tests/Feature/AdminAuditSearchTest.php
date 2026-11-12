<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AdminRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAuditSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_audit_search_filters_by_actor_text_result_and_request_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $admin->admin_role_id = AdminRole::where('slug', 'administrator')->value('id');
        $admin->save();
        ActivityLog::create([
            'user_id' => $admin->id, 'action' => 'user_suspended', 'entity_type' => 'User', 'entity_id' => 91,
            'reason' => 'fraud review', 'request_id' => 'req-audit-123', 'result' => 'success',
        ]);
        ActivityLog::create([
            'user_id' => $admin->id, 'action' => 'login_failed', 'entity_type' => 'Auth', 'entity_id' => null,
            'reason' => 'invalid password', 'request_id' => 'req-audit-456', 'result' => 'failure',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/activity-logs?q=fraud&result=success&request_id=req-audit-123')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.action', 'user_suspended');
        $this->getJson('/api/admin/activity-logs?result=failure')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.action', 'login_failed');
    }

    public function test_audit_search_rejects_invalid_result_and_unbounded_page_size(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/activity-logs?result=maybe')->assertUnprocessable();
        $this->getJson('/api/admin/activity-logs?per_page=1000')->assertUnprocessable();
    }
}
