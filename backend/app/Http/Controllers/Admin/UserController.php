<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use App\Models\AdminRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $users = $query->with('adminRole:id,name,slug')->withCount(['subscriptions', 'transactions'])
            ->latest()
            ->paginate($request->get('per_page', 15));

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        // Keep this response intentionally allow-listed. Returning the User model
        // directly would also serialize OAuth identifiers and other auth columns.
        $user->load([
            'subscriptions.plan',
            'transactions' => fn($q) => $q->select(['id', 'user_id', 'subscription_id', 'gateway', 'gateway_transaction_id', 'amount', 'currency', 'status', 'type', 'created_at'])->latest()->take(10),
            'activityLogs' => fn($q) => $q->select(['id', 'user_id', 'action', 'entity_type', 'entity_id', 'reason', 'result', 'request_id', 'created_at'])->latest()->take(20),
            'aiCreditWallet',
            'aiCreditTransactions' => fn($q) => $q->select(['id', 'user_id', 'type', 'amount', 'description', 'status', 'created_at'])->latest()->take(10),
            'stories' => fn($q) => $q->select(['id', 'user_id', 'title', 'status', 'processing_step', 'created_at'])->latest()->take(10),
            'adminRole:id,name,slug',
        ]);

        $user->loadCount(['subscriptions', 'transactions', 'stories']);

        return response()->json(['user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'avatar' => $user->avatar,
            'email_verified_at' => $user->email_verified_at,
            'last_login_at' => $user->last_login_at,
            'must_change_password' => $user->must_change_password,
            'password_changed_at' => $user->password_changed_at,
            'created_at' => $user->created_at,
            'admin_role' => $user->adminRole,
            'subscriptions_count' => $user->subscriptions_count,
            'transactions_count' => $user->transactions_count,
            'stories_count' => $user->stories_count,
            'subscriptions' => $user->subscriptions,
            'transactions' => $user->transactions,
            'activity_logs' => $user->activityLogs,
            'ai_credit_wallet' => $user->aiCreditWallet,
            'ai_credit_transactions' => $user->aiCreditTransactions,
            'stories' => $user->stories,
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:12'],
            'role' => ['required', Rule::in(['user', 'admin', 'super_admin'])],
            'status' => ['required', Rule::in(['active', 'suspended', 'banned'])],
            'admin_role_id' => ['nullable', 'integer', Rule::exists('admin_roles', 'id')],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if (!$request->user()?->isSuperAdmin() && ($validated['role'] !== 'user' || $validated['status'] !== 'active' || !empty($validated['admin_role_id']))) {
            return response()->json(['message' => 'Only a super-admin can create staff or non-active accounts.'], 403);
        }

        $validated['password'] = Hash::make($validated['password']);
        $adminRoleId = $validated['admin_role_id'] ?? null;
        unset($validated['admin_role_id']);
        $reason = $validated['reason'] ?? null;
        unset($validated['reason']);

        $user = User::create($validated);
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            if ($user->role === 'admin') {
                $user->admin_role_id = $adminRoleId ?: AdminRole::where('slug', 'administrator')->value('id');
            }
            $user->must_change_password = true;
            $user->save();
        }

        ActivityLog::log('user_created', auth()->id(), 'User', $user->id, null, $this->auditSnapshot($user), $reason);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user,
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if (!$request->user()?->isSuperAdmin() && $user->isAdmin()) {
            return response()->json(['message' => 'Only a super-admin may modify administrator accounts.'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['sometimes', 'string', 'min:12'],
            'role' => ['sometimes', Rule::in(['user', 'admin', 'super_admin'])],
            'status' => ['sometimes', Rule::in(['active', 'suspended', 'banned'])],
            'admin_role_id' => ['sometimes', 'nullable', 'integer', Rule::exists('admin_roles', 'id')],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $attemptsRoleChange = isset($validated['role']) && $validated['role'] !== $user->role;
        $attemptsAdminRoleChange = array_key_exists('admin_role_id', $validated) && (int) $validated['admin_role_id'] !== (int) $user->admin_role_id;
        $attemptsRestriction = isset($validated['status']) && $validated['status'] !== $user->status && $validated['status'] !== 'active';
        if (!$request->user()?->isSuperAdmin() && ($attemptsRoleChange || $attemptsAdminRoleChange || $attemptsRestriction)) {
            return response()->json(['message' => 'Only a super-admin can change roles or restrict account access.'], 403);
        }

        $oldValues = $this->auditSnapshot($user);
        $reason = $validated['reason'] ?? null;
        unset($validated['reason']);

        if (array_key_exists('admin_role_id', $validated)) {
            if ($user->role !== 'admin' && !in_array($validated['role'] ?? null, ['admin'], true)) {
                return response()->json(['message' => 'Admin roles can only be assigned to administrator accounts.'], 422);
            }
            $user->admin_role_id = $validated['admin_role_id'];
            unset($validated['admin_role_id']);
        } elseif (isset($validated['role']) && $validated['role'] !== 'admin') {
            $user->admin_role_id = null;
        } elseif (($validated['role'] ?? null) === 'admin' && !$user->admin_role_id) {
            $user->admin_role_id = AdminRole::where('slug', 'administrator')->value('id');
        }

        if (in_array($validated['role'] ?? null, ['admin', 'super_admin'], true) && $validated['role'] !== $user->role) {
            $user->must_change_password = true;
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        ActivityLog::log('user_updated', auth()->id(), 'User', $user->id, $oldValues, $this->auditSnapshot($user->fresh()), $reason);

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if (!request()->user()?->isSuperAdmin()) {
            return response()->json(['message' => 'Only a super-admin may initiate an account deletion request.'], 403);
        }

        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        // The current schema cascades deletion through payment, credit, and child-media
        // records. Do not expose irreversible hard deletion until a reviewed privacy
        // workflow can preserve financial/audit retention requirements.
        return response()->json([
            'message' => 'Direct account deletion is disabled. Use the privacy request workflow so related data can be reviewed and retained or erased safely.',
            'error_code' => 'PRIVACY_WORKFLOW_REQUIRED',
        ], 409);
    }

    public function suspend(User $user): JsonResponse
    {
        if (!request()->user()?->isSuperAdmin() && $user->isAdmin()) {
            return response()->json(['message' => 'Only a super-admin may suspend an administrator account.'], 403);
        }

        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot suspend your own account.',
            ], 422);
        }

        $oldStatus = $user->status;
        $user->update(['status' => 'suspended']);

        ActivityLog::log('user_suspended', auth()->id(), 'User', $user->id, ['status' => $oldStatus], ['status' => 'suspended'], request()->input('reason'));

        return response()->json([
            'message' => 'User suspended successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function activate(User $user): JsonResponse
    {
        if (!request()->user()?->isSuperAdmin() && $user->isAdmin()) {
            return response()->json(['message' => 'Only a super-admin may reactivate an administrator account.'], 403);
        }

        $oldStatus = $user->status;
        $user->update(['status' => 'active']);

        ActivityLog::log('user_activated', auth()->id(), 'User', $user->id, ['status' => $oldStatus], ['status' => 'active'], request()->input('reason'));

        return response()->json([
            'message' => 'User activated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    /** Avoid copying OAuth identifiers or authentication data into audit snapshots. */
    private function auditSnapshot(User $user): array
    {
        return $user->only(['id', 'name', 'email', 'role', 'status', 'admin_role_id']);
    }
}
