<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AccountSecurityController extends Controller
{
    public function forceChangePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->must_change_password) {
            return response()->json(['message' => 'No forced password change is pending.'], 409);
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(12)->letters()->mixedCase()->numbers()],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'The current temporary password is incorrect.'], 422);
        }

        $user->forceFill([
            'password' => $validated['password'],
            'must_change_password' => false,
            'password_changed_at' => now(),
        ])->save();

        $currentToken = $user->currentAccessToken();
        if ($currentToken && method_exists($currentToken, 'getKey')) {
            $user->tokens()->where('id', '!=', $currentToken->getKey())->delete();
        }

        ActivityLog::log('password_changed', $user->id, 'User', $user->id, null, ['forced_rotation' => true]);

        return response()->json([
            'message' => 'Password updated. You can now use the admin dashboard.',
            'user' => $user->fresh(),
        ]);
    }
}
