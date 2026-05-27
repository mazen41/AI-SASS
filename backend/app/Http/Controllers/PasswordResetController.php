<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\MailTemplate;
use App\Services\MailService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    /**
     * Send a password reset link to the given user.
     */
    public function sendResetLinkEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'We have emailed your password reset link.',
            ]);
        }

        // Generate a random token
        $token = Str::random(60);

        // Store token in database
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        // Build reset link URL
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        $resetLink = $frontendUrl . "/reset-password?token=" . urlencode($token) . "&email=" . urlencode($request->email);

        // Verify password_reset template exists, seed it if not
        $template = MailTemplate::where('key', 'password_reset')->first();
        if (!$template) {
            $templates = MailService::getDefaultTemplates();
            foreach ($templates as $tData) {
                if ($tData['key'] === 'password_reset') {
                    MailTemplate::create($tData);
                }
            }
        }

        // Send email
        MailService::sendWithTemplate('password_reset', $request->email, [
            'app_name' => config('app.name', 'StoryHero'),
            'user_name' => $user->name,
            'reset_link' => $resetLink,
            'expires_in' => '60 minutes',
        ]);

        return response()->json([
            'message' => 'We have emailed your password reset link.',
        ]);
    }

    /**
     * Reset the user's password.
     */
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email|exists:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json([
                'errors' => [
                    'email' => ['This password reset token is invalid.'],
                ],
            ], 422);
        }

        // Token expires after 60 minutes
        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'errors' => [
                    'email' => ['This password reset token has expired.'],
                ],
            ], 422);
        }

        // Update password
        $user = User::where('email', $request->email)->firstOrFail();
        $user->password = Hash::make($request->password);
        $user->save();

        // Delete token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Your password has been reset successfully.',
        ]);
    }
}
