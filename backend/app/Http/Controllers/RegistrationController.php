<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\MailTemplate;
use App\Models\Package;
use App\Models\PaymentSetting;
use App\Models\PendingRegistration;
use App\Models\MyFatoorahCheckoutSession;
use App\Services\MyFatoorahService;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Package-gated, OTP-verified, payment-gated registration.
 *
 * Replaces the old single-step AuthController::register. Flow:
 *   1. POST /register/initiate    — validate details + REQUIRED package_id, send OTP
 *   2. POST /register/verify-otp  — must succeed before anything else can happen
 *   3. POST /register/complete    — free package -> account created now;
 *                                    paid package -> returns a hosted payment URL
 *   4. Verified payment webhook creates the account for paid packages.
 *   5. GET  /register/status/{id} — frontend polls this after payment redirect
 *
 * No `users` row is ever created for a paid package until a payment webhook
 * confirms payment — this is what prevents unpaid access.
 */
class RegistrationController extends Controller
{
    private const OTP_TTL_MINUTES     = 10;
    private const OTP_MAX_ATTEMPTS    = 5;
    private const RESEND_COOLDOWN_SEC = 60;
    private const RESEND_MAX_COUNT    = 5;
    private const SESSION_TTL_HOURS   = 2;

    /**
     * Step 1: validate details, require a package, create the pending
     * record, send the OTP. No user row exists yet.
     */
    public function initiate(Request $request): JsonResponse
    {
        $key = 'register-initiate:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Too many registration attempts. Please try again later.'], 429);
        }
        RateLimiter::hit($key, 60);

        $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            // package_id is REQUIRED — this is the enforcement point for task 4.
            'package_id'            => ['required', 'integer', 'exists:packages,id'],
        ]);

        $package = Package::where('id', $request->package_id)->where('is_active', true)->first();
        if (!$package) {
            return response()->json(['message' => 'Selected package is not available.'], 422);
        }

        // A verified registration is resumable. Do not delete it when the user
        // retries signup after losing the tab or payment redirect.
        $existing = PendingRegistration::where('email', $request->email)
            ->whereIn('status', ['otp_verified', 'awaiting_payment'])
            ->where('expires_at', '>', now())
            ->latest('created_at')
            ->first();
        if ($existing) {
            if (!Hash::check($request->password, (string) $existing->password_hash)) {
                return response()->json([
                    'message' => 'A registration is already in progress for this email. Sign in with the password used during signup to resume it.',
                    'code' => 'registration_in_progress',
                ], 409);
            }

            return response()->json([
                'message' => 'Your email is already verified. Continue to payment.',
                'pending_registration_id' => $existing->id,
                'status' => $existing->status,
                'email_verified' => true,
                'package_id' => $existing->package_id,
                'already_verified' => true,
            ]);
        }

        // Remove only expired/abandoned sessions; preserve active OTP sessions
        // so a retry cannot silently invalidate a code already in the inbox.
        PendingRegistration::where('email', $request->email)
            ->where('expires_at', '<=', now())
            ->delete();

        $otp = (string) random_int(100000, 999999);

        $pending = PendingRegistration::create([
            'id'             => (string) Str::uuid(),
            'name'           => $request->name,
            'email'          => $request->email,
            'password_hash'  => Hash::make($request->password),
            'package_id'     => $package->id,
            'otp_hash'       => Hash::make($otp),
            'otp_expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'last_otp_sent_at' => now(),
            'status'         => 'pending_otp',
            'expires_at'     => now()->addHours(self::SESSION_TTL_HOURS),
        ]);

        $this->sendOtpEmail($pending, $otp);

        return response()->json([
            'message'                => 'Verification code sent to your email.',
            'pending_registration_id' => $pending->id,
            'otp_expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
        ], 201);
    }

    /**
     * Resend a fresh OTP for an existing pending registration.
     * Cooldown + max-resend cap prevent using this as an email bomb.
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate(['pending_registration_id' => ['required', 'uuid']]);

        $pending = PendingRegistration::find($request->pending_registration_id);
        if (!$pending || $pending->isExpired() || $pending->status !== 'pending_otp') {
            return response()->json(['message' => 'This registration session is invalid or expired. Please start again.'], 410);
        }

        if ($pending->last_otp_sent_at && $pending->last_otp_sent_at->addSeconds(self::RESEND_COOLDOWN_SEC)->isFuture()) {
            $wait = now()->diffInSeconds($pending->last_otp_sent_at->addSeconds(self::RESEND_COOLDOWN_SEC));
            return response()->json(['message' => "Please wait {$wait}s before requesting another code."], 429);
        }

        if ($pending->otp_resend_count >= self::RESEND_MAX_COUNT) {
            return response()->json(['message' => 'Too many code requests. Please start registration again.'], 429);
        }

        $otp = (string) random_int(100000, 999999);

        $pending->update([
            'otp_hash'         => Hash::make($otp),
            'otp_expires_at'   => now()->addMinutes(self::OTP_TTL_MINUTES),
            'otp_attempts'     => 0,
            'otp_resend_count' => $pending->otp_resend_count + 1,
            'last_otp_sent_at' => now(),
        ]);

        $this->sendOtpEmail($pending, $otp);

        return response()->json([
            'message'                => 'A new verification code has been sent.',
            'otp_expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
        ]);
    }

    /**
     * Step 2: verify the OTP. Nothing past this point is reachable
     * without a successful call here (enforces task 5's requirement).
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'pending_registration_id' => ['required', 'uuid'],
            'otp'                     => ['required', 'digits:6'],
        ]);

        $pending = PendingRegistration::find($request->pending_registration_id);
        if (!$pending || $pending->isExpired()) {
            return response()->json(['message' => 'This registration session is invalid or expired. Please start again.'], 410);
        }

        if (in_array($pending->status, ['otp_verified', 'awaiting_payment'], true)) {
            return response()->json([
                'message' => 'Email already verified. Continue to payment.',
                'already_verified' => true,
                'package' => [
                    'id' => $pending->package->id,
                    'name' => $pending->package->name,
                    'total_price' => $pending->package->total_price,
                ],
                'next_step' => 'payment',
            ]);
        }
        if ($pending->status !== 'pending_otp') {
            return response()->json(['message' => 'This step was already completed.'], 409);
        }

        if (!$pending->otp_expires_at || $pending->otp_expires_at->isPast()) {
            return response()->json(['message' => 'Verification code expired. Please request a new one.'], 422);
        }

        if ($pending->otp_attempts >= self::OTP_MAX_ATTEMPTS) {
            return response()->json(['message' => 'Too many incorrect attempts. Please request a new code.'], 429);
        }

        if (!Hash::check($request->otp, (string) $pending->otp_hash)) {
            $pending->increment('otp_attempts');
            $remaining = max(0, self::OTP_MAX_ATTEMPTS - $pending->otp_attempts);
            return response()->json(['message' => "Incorrect code. {$remaining} attempt(s) remaining."], 422);
        }

        $pending->update([
            'status'             => 'otp_verified',
            'email_verified_at' => now(),
            'otp_hash'           => null, // consumed — cannot be replayed
        ]);

        $package = $pending->package;

        return response()->json([
            'message'    => 'Email verified.',
            'package'    => ['id' => $package->id, 'name' => $package->name, 'total_price' => $package->total_price],
            'next_step'  => $package->total_price > 0 ? 'payment' : 'complete',
        ]);
    }

    /**
     * Step 3: OTP must already be verified (enforced below). Free package ->
     * account is created right now. Paid package -> a Moyasar payment is
     * created and its URL returned; the account is NOT created here.
     */
    public function complete(Request $request): JsonResponse
    {
        $request->validate(['pending_registration_id' => ['required', 'uuid']]);

        $pending = PendingRegistration::find($request->pending_registration_id);
        if (!$pending || $pending->isExpired()) {
            return response()->json(['message' => 'This registration session is invalid or expired. Please start again.'], 410);
        }

        // Hard gate: cannot reach payment/account-creation without a verified OTP.
        if (!in_array($pending->status, ['otp_verified', 'awaiting_payment'], true)) {
            return response()->json(['message' => 'Please verify your email code first.'], 403);
        }

        // Re-check uniqueness in case the email was taken since initiate().
        if (User::where('email', $pending->email)->exists()) {
            return response()->json(['message' => 'An account with this email already exists.'], 422);
        }

        $package = $pending->package;

        // ── Free package: create the account now ────────────────────────────
        if ((float) $package->total_price <= 0.0) {
            $user  = $pending->createUserAndComplete();
            $token = $user->createToken('auth_token')->plainTextToken;

            ActivityLog::log('user_registered', $user->id, 'User', $user->id);
            $this->sendWelcomeEmail($user);

            return response()->json(['message' => 'Registration successful.', 'user' => $user, 'token' => $token], 201);
        }

        // Centralized MyFatoorah is the sole MyF gateway when enabled.
        if (config('services.central_payments.enabled')) {
            return $this->initiateCentralMyFatoorahPayment($pending, $package);
        }
        if (MyFatoorahService::configured()) {
            return $this->initiateMyFatoorahPayment($pending, $package);
        }

        // ── Paid package: create a Moyasar payment, no account yet ──────────
        return $this->initiateMoyasarPayment($pending, $package);
    }

    private function initiateCentralMyFatoorahPayment(PendingRegistration $pending, Package $package): JsonResponse
    {
        if ((float) $package->total_price <= 0) {
            return response()->json(['message' => 'Free packages do not require payment.'], 422);
        }
        $checkout = MyFatoorahCheckoutSession::create([
            'pending_registration_id' => $pending->id,
            'amount' => $package->total_price,
            'currency' => 'SAR',
            'status' => 'pending',
        ]);
        // The central payment service verifies that this pending order is in
        // an eligible state during the same checkout request.
        $pending->update(['status' => 'awaiting_payment']);
        try {
            $payment = app(\App\Services\CentralPaymentClientService::class)
                ->createHostedPayment((string) $checkout->id, 'nazstudio-registration-' . $checkout->id);
            $checkout->update(['gateway_response' => ['central_payment_id' => $payment['central_payment_id']]]);
            return response()->json([
                'url' => $payment['payment_url'],
                'pending_registration_id' => $pending->id,
                'gateway' => 'myfatoorah',
            ]);
        } catch (\Throwable $e) {
            $checkout->update(['status' => 'failed']);
            Log::error('Central MyFatoorah registration checkout failed', [
                'pending_id' => $pending->id,
                'checkout_id' => $checkout->id,
                'exception_type' => get_class($e),
            ]);
            return response()->json(['message' => 'Could not start payment. Please try again or contact support.'], 502);
        }
    }

    private function initiateMyFatoorahPayment(PendingRegistration $pending, Package $package): JsonResponse
    {
        $gateway = MyFatoorahService::configured();
        if (!$gateway || (float) $package->total_price <= 0) {
            return response()->json(['message' => 'MyFatoorah checkout is unavailable.'], 503);
        }
        $checkout = MyFatoorahCheckoutSession::create([
            'pending_registration_id' => $pending->id,
            'amount' => $package->total_price,
            'currency' => strtoupper((string) data_get($gateway->setting()->additional_settings, 'currency', 'SAR')),
            'status' => 'pending',
        ]);
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        try {
            $invoice = $gateway->sendPayment([
                'CustomerName' => $pending->name,
                'CustomerEmail' => $pending->email,
                'InvoiceValue' => (float) $package->total_price,
                'DisplayCurrencyIso' => $checkout->currency,
                'NotificationOption' => 'LNK',
                'Language' => app()->getLocale() === 'ar' ? 'AR' : 'EN',
                'CustomerReference' => $checkout->id,
                'UserDefinedField' => $checkout->id,
                'CallBackUrl' => $frontendUrl . '/register/success?pending_id=' . $pending->id,
                'ErrorUrl' => $frontendUrl . '/register?payment=failed',
                'WebhookUrl' => url('/api/webhooks/myfatoorah'),
            ]);
            $invoiceId = (string) $invoice['InvoiceId'];
            $checkout->update(['invoice_id' => $invoiceId, 'gateway_response' => ['invoice_status' => $invoice['InvoiceStatus'] ?? null]]);
            $pending->update(['status' => 'awaiting_payment', 'myfatoorah_invoice_id' => $invoiceId]);
            return response()->json(['url' => $invoice['InvoiceURL'], 'pending_registration_id' => $pending->id, 'gateway' => 'myfatoorah']);
        } catch (\Throwable $e) {
            $checkout->update(['status' => 'failed']);
            Log::error('Registration MyFatoorah invoice creation failed', ['pending_id' => $pending->id, 'exception' => get_class($e)]);
            return response()->json(['message' => 'Could not start payment. Check the payment settings and try again.'], 502);
        }
    }

    /**
     * Creates the Moyasar payment for a paid-package registration.
     * Deliberately has NO "mock success" fallback like BillingController's
     * subscribe methods do — for account creation specifically we never want
     * a misconfigured gateway to silently grant free access (task 3's "no
     * fake/failed payments" requirement). If Moyasar isn't configured, the
     * signup fails loudly instead.
     */
    private function initiateMoyasarPayment(PendingRegistration $pending, Package $package): JsonResponse
    {
        $setting = PaymentSetting::getMoyasar();
        if (!$setting || !$setting->is_enabled || !$setting->secret_key) {
            Log::error('Registration payment: Moyasar not configured', ['pending_id' => $pending->id]);
            return response()->json(['message' => 'Payment is temporarily unavailable. Please try again later or contact support.'], 503);
        }

        $frontendUrl  = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        $amountHalala = (int) round((float) $package->total_price * 100);

        try {
            $response = Http::withBasicAuth($setting->secret_key, '')
                ->post('https://api.moyasar.com/v1/payments', [
                    'amount'       => $amountHalala,
                    'currency'     => 'SAR',
                    'description'  => $package->name . ' — Package Purchase (Registration)',
                    'callback_url' => $frontendUrl . '/register/success?pending_id=' . $pending->id,
                    'source'       => ['type' => 'creditcard', 'company' => null, 'name' => null, 'number' => null, 'cvc' => null, 'month' => null, 'year' => null],
                    // pending_registration_id is how the webhook finds this
                    // record — there is no user_id yet, by design.
                    'metadata'     => ['pending_registration_id' => $pending->id],
                ]);

            if (!$response->successful()) {
                Log::error('Registration Moyasar payment init failed', ['body' => $response->body()]);
                return response()->json(['message' => 'Could not start payment. Please try again.'], 502);
            }

            $payment    = $response->json();
            $paymentUrl = $payment['source']['transaction_url']
                ?? ('https://api.moyasar.com/v1/payments/' . ($payment['id'] ?? '') . '/pay');

            $pending->update(['status' => 'awaiting_payment', 'moyasar_payment_id' => $payment['id'] ?? null]);

            return response()->json(['url' => $paymentUrl, 'pending_registration_id' => $pending->id]);
        } catch (\Throwable $e) {
            Log::error('Registration Moyasar payment error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Payment error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Frontend polls this after redirecting back from Moyasar, since account
     * creation happens asynchronously via webhook, not on the redirect itself.
     * Issues a login token exactly once (token_claimed_at guards re-issue).
     */
    public function status(string $id): JsonResponse
    {
        $pending = PendingRegistration::find($id);
        if (!$pending) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if ($pending->isExpired() && $pending->status !== 'completed') {
            return response()->json([
                'status' => 'expired',
                'pending_registration_id' => $pending->id,
                'email_verified' => (bool) $pending->email_verified_at,
            ]);
        }

        if ($pending->status !== 'completed' || !$pending->created_user_id) {
            return response()->json([
                'status' => $pending->status,
                'pending_registration_id' => $pending->id,
                'name' => $pending->name,
                'email' => $pending->email,
                'package_id' => $pending->package_id,
                'email_verified' => (bool) $pending->email_verified_at,
            ]);
        }

        $user = $pending->createdUser;
        if (!$user) {
            return response()->json(['status' => 'completed', 'message' => 'Account record missing — contact support.'], 500);
        }

        if ($pending->token_claimed_at) {
            // Token already handed out once — don't mint another on refresh.
            return response()->json(['status' => 'completed', 'already_claimed' => true]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        $pending->update(['token_claimed_at' => now()]);

        return response()->json(['status' => 'completed', 'user' => $user, 'token' => $token]);
    }

    // ── Email helpers ────────────────────────────────────────────────────────

    private function sendOtpEmail(PendingRegistration $pending, string $otp): void
    {
        $this->ensureTemplateSeeded('registration_otp');

        MailService::sendWithTemplate('registration_otp', $pending->email, [
            'app_name'   => config('app.name', 'StoryHero'),
            'user_name'  => $pending->name,
            'otp_code'   => $otp,
            'expires_in' => self::OTP_TTL_MINUTES . ' minutes',
        ]);
    }

    private function sendWelcomeEmail(User $user): void
    {
        $this->ensureTemplateSeeded('welcome');
        try {
            MailService::sendWithTemplate('welcome', $user->email, [
                'app_name'   => config('app.name', 'StoryHero'),
                'user_name'  => $user->name,
                'user_email' => $user->email,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Welcome email failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }
    }

    /** Mirrors the seed-if-missing pattern already used in PasswordResetController. */
    private function ensureTemplateSeeded(string $key): void
    {
        if (MailTemplate::where('key', $key)->exists()) {
            return;
        }
        foreach (MailService::getDefaultTemplates() as $data) {
            if ($data['key'] === $key) {
                MailTemplate::create($data);
                return;
            }
        }
    }
}
