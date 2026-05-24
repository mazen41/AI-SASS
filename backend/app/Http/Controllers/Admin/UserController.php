<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
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

        $users = $query->withCount(['subscriptions', 'transactions'])
            ->latest()
            ->paginate($request->get('per_page', 15));

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->load([
            'subscriptions.plan',
            'transactions' => fn($q) => $q->latest()->take(10),
            'activityLogs' => fn($q) => $q->latest()->take(20),
        ]);

        $user->loadCount(['subscriptions', 'transactions']);

        return response()->json(['user' => $user]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['user', 'admin', 'super_admin'])],
            'status' => ['required', Rule::in(['active', 'suspended', 'banned'])],
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        ActivityLog::log('user_created', auth()->id(), 'User', $user->id, null, $user->toArray());

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user,
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['sometimes', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in(['user', 'admin', 'super_admin'])],
            'status' => ['sometimes', Rule::in(['active', 'suspended', 'banned'])],
        ]);

        $oldValues = $user->toArray();

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        ActivityLog::log('user_updated', auth()->id(), 'User', $user->id, $oldValues, $user->fresh()->toArray());

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        ActivityLog::log('user_deleted', auth()->id(), 'User', $user->id, $user->toArray(), null);

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }

    public function suspend(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot suspend your own account.',
            ], 422);
        }

        $oldStatus = $user->status;
        $user->update(['status' => 'suspended']);

        ActivityLog::log('user_suspended', auth()->id(), 'User', $user->id, ['status' => $oldStatus], ['status' => 'suspended']);

        return response()->json([
            'message' => 'User suspended successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function activate(User $user): JsonResponse
    {
        $oldStatus = $user->status;
        $user->update(['status' => 'active']);

        ActivityLog::log('user_activated', auth()->id(), 'User', $user->id, ['status' => $oldStatus], ['status' => 'active']);

        return response()->json([
            'message' => 'User activated successfully.',
            'user' => $user->fresh(),
        ]);
    }
}
