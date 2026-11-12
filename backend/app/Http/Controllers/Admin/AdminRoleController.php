<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\AdminPermission;
use App\Models\AdminRole;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminRoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'roles' => AdminRole::with('permissions:key,description')->withCount('users')->orderBy('id')->get(),
            'permissions' => AdminPermission::orderBy('key')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()?->isSuperAdmin()) {
            return response()->json(['message' => 'Only a super-admin can create roles or grant admin permissions.'], 403);
        }
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists('admin_permissions', 'key')],
        ]);
        $role = AdminRole::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']).'-'.Str::lower(Str::random(6)),
            'is_system' => false,
        ]);
        $role->permissions()->sync($validated['permissions'] ?? []);
        ActivityLog::log('admin_role_created', $request->user()->id, 'AdminRole', $role->id, null, ['name' => $role->name, 'permissions' => $validated['permissions'] ?? []], $request->input('reason'));

        return response()->json(['role' => $role->load('permissions:key,description')], 201);
    }

    public function update(Request $request, AdminRole $role): JsonResponse
    {
        if (!$request->user()?->isSuperAdmin()) {
            return response()->json(['message' => 'Only a super-admin can change role permissions.'], 403);
        }
        if ($role->is_system) {
            return response()->json(['message' => 'System roles cannot be edited. Create a custom role instead.'], 422);
        }
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists('admin_permissions', 'key')],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $before = ['name' => $role->name, 'permissions' => $role->permissions()->pluck('admin_permissions.key')->all()];
        if (isset($validated['name'])) $role->name = $validated['name'];
        $role->save();
        if (array_key_exists('permissions', $validated)) $role->permissions()->sync($validated['permissions']);
        ActivityLog::log('admin_role_updated', $request->user()->id, 'AdminRole', $role->id, $before, ['name' => $role->name, 'permissions' => $role->permissions()->pluck('admin_permissions.key')->all()], $validated['reason'] ?? null);

        return response()->json(['role' => $role->load('permissions:key,description')]);
    }

    public function assign(Request $request, User $user): JsonResponse
    {
        if (!$request->user()?->isSuperAdmin()) {
            return response()->json(['message' => 'Only a super-admin can assign administrator roles.'], 403);
        }
        if (!$user->isAdmin() || $user->isSuperAdmin()) {
            return response()->json(['message' => 'Only non-owner administrator accounts can receive an admin role.'], 422);
        }
        $validated = $request->validate([
            'admin_role_id' => ['required', 'integer', Rule::exists('admin_roles', 'id')],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $before = $user->admin_role_id;
        $user->admin_role_id = $validated['admin_role_id'];
        $user->save();
        ActivityLog::log('admin_role_assigned', $request->user()->id, 'User', $user->id, ['admin_role_id' => $before], ['admin_role_id' => $user->admin_role_id], $validated['reason'] ?? null);

        return response()->json(['user' => $user->fresh()->load('adminRole:id,name,slug')]);
    }
}
