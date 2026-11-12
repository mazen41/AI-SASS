<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\PaymentSetting;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Plan;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Handles Moyasar webhook events.
 * Webhook secret is stored encrypted in payment_settings (gateway='moyasar').
 * Moyasar sends a SHA-256 HMAC signature in the X-Moyasar-Signature header.
 *
 * Supported events:
 *  - payment.paid        → activate subscription
 *  - payment.failed      → mark subscription past_due
 *  - payment.refunded    → record refund transaction
 */
class MoyasarWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $setting = PaymentSetting::getMoyasar();

        if (!$setting || !$setting->is_enabled) {
            Log::warning('Moyasar webhook received but Moyasar is not enabled');
            return response('Moyasar not configured', 400);
        }

        $payload   = $request->getContent();
        $signature = $request->header('X-Moyasar-Signature');

        // Verify HMAC-SHA256 signature.
        // SECURITY FIX: this used to be `if ($setting->webhook_secret) { verify }`,
        // which meant a missing secret SKIPPED verification entirely — anyone
        // who found the webhook URL could POST a fake `payment.paid` event and
        // get a free subscription or (with the new registration flow) a free
        // account. Now we fail CLOSED: no secret configured = reject, except
        // in local/testing where you're presumably hitting this with a tool
        // like `php artisan tinker` or a manual curl during setup.
        if (!$setting->webhook_secret) {
            if (!app()->environment('local', 'testing')) {
                Log::error('Moyasar webhook: rejected — no webhook_secret configured in a non-local environment');
                return response('Webhook not configured', 400);
            }
            Log::warning('Moyasar webhook: no webhook_secret configured — allowing ONLY because APP_ENV is local/testing');
        } else {
            $expected = hash_hmac('sha256', $payload, $setting->webhook_secret);
            if (!hash_equals($expected, (string) $signature)) {
                Log::error('Moyasar webhook: invalid signature');
                return response('Invalid signature', 400);
            }
        }

        $data = json_decode($payload, true);

        if (!$data || !isset($data['type'])) {
            Log::error('Moyasar webhook: invalid payload');
            return response('Invalid payload', 400);
        }

        Log::info('Moyasar webhook received', ['type' => $data['type'], 'id' => $data['id'] ?? null]);

        match ($data['type']) {
            'payment.paid'     => $this->handlePaymentPaid($data),
            'payment.failed'   => $this->handlePaymentFailed($data),
            'payment.refunded' => $this->handlePaymentRefunded($data),
            default            => Log::info('Moyasar: unhandled event', ['type' => $data['type']]),
        };

        return response('OK', 200);
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    private function handlePaymentPaid(array $data): void
    {
        $payment  = $data['data'] ?? $data;
        $metadata = $payment['metadata'] ?? [];

        // Defense in depth: don't trust the event `type` alone — also check
        // the payment's own status field actually says paid.
        $status = strtolower($payment['status'] ?? '');
        if ($status !== 'paid') {
            Log::warning('Moyasar payment.paid event received but payment.status is not "paid" — ignoring', [
                'payment_id' => $payment['id'] ?? null,
                'status'     => $status,
            ]);
            return;
        }

        // ── Branch: package-purchase-at-registration flow (no user yet) ─────
        if (!empty($metadata['pending_registration_id'])) {
            $this->handleRegistrationPaymentPaid($payment, $metadata['pending_registration_id']);
            return;
        }

        // ── Existing flow: paying for a Plan/Subscription as a logged-in user ─
        $userId   = $metadata['user_id']   ?? null;
        $planId   = $metadata['plan_id']   ?? null;

        if (!$userId || !$planId) {
            Log::warning('Moyasar payment.paid: missing user_id or plan_id in metadata', $metadata);
            return;
        }

        $user = User::find($userId);
        $plan = Plan::find($planId);

        if (!$user || !$plan) {
            Log::warning('Moyasar payment.paid: user or plan not found', compact('userId', 'planId'));
            return;
        }

        // Idempotency guard
        $paymentId = $payment['id'] ?? null;
        $existingTransaction = $paymentId ? Transaction::where('gateway_transaction_id', $paymentId)->first() : null;
        if ($existingTransaction) {
            $existingSubscription = $existingTransaction->subscription_id
                ? Subscription::with('plan', 'user')->find($existingTransaction->subscription_id)
                : null;
            if ($existingSubscription?->plan && $existingSubscription->user) {
                app(\App\Services\AiCreditService::class)->grantPlanCredits(
                    $existingSubscription->user, $existingSubscription->plan, 'subscription-cycle:moyasar-payment:' . $paymentId
                );
            }
            Log::info('Moyasar payment.paid: already processed', ['payment_id' => $paymentId]);
            return;
        }

        // Cancel any existing active subscription
        $user->subscriptions()->where('status', 'active')->update([
            'status'      => 'canceled',
            'canceled_at' => now(),
        ]);

        $subscription = Subscription::create([
            'user_id'                  => $user->id,
            'plan_id'                  => $plan->id,
            'gateway'                  => 'moyasar',
            'gateway_subscription_id'  => 'moyasar_' . ($paymentId ?? uniqid()),
            'gateway_customer_id'      => $payment['source']['company'] ?? null,
            'status'                   => 'active',
            'current_period_start'     => now(),
            'current_period_end'       => now()->addDays(30),
        ]);

        $amountHalala = (int) ($payment['amount'] ?? 0);
        $amountSar    = $amountHalala / 100;

        Transaction::create([
            'user_id'                 => $user->id,
            'subscription_id'         => $subscription->id,
            'gateway'                 => 'moyasar',
            'gateway_transaction_id'  => $paymentId,
            'amount'                  => $amountSar,
            'currency'                => strtoupper($payment['currency'] ?? 'SAR'),
            'status'                  => 'completed',
            'type'                    => 'subscription',
            'gateway_response'        => $payment,
        ]);

        app(\App\Services\AiCreditService::class)->grantPlanCredits(
            $user, $plan, 'subscription-cycle:moyasar-payment:' . ($paymentId ?: $subscription->id)
        );

        // Create invoice
        Invoice::create([
            'user_id'        => $user->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'amount'         => $amountSar,
            'currency'       => strtoupper($payment['currency'] ?? 'SAR'),
            'status'         => 'paid',
            'items'          => [['name' => $plan->name . ' Plan', 'price' => $amountSar, 'type' => 'subscription']],
            'gateway'        => 'moyasar',
            'issued_at'      => now(),
            'paid_at'        => now(),
        ]);

        ActivityLog::log('payment_received', $user->id, 'Subscription', $subscription->id, null, [
            'amount'  => $amountSar,
            'gateway' => 'moyasar',
            'plan'    => $plan->name,
        ]);

        Log::info('Moyasar payment.paid: subscription activated', [
            'user_id'         => $user->id,
            'plan'            => $plan->name,
            'subscription_id' => $subscription->id,
        ]);
    }

    /**
     * Confirmed payment for a paid-package registration: create the account
     * now. This is the ONLY place a paid registration's `users` row gets
     * created — there is no other code path that can do it.
     */
    private function handleRegistrationPaymentPaid(array $payment, string $pendingRegistrationId): void
    {
        $pending = \App\Models\PendingRegistration::find($pendingRegistrationId);
        if (!$pending) {
            Log::error('Moyasar payment.paid: pending_registration not found', ['id' => $pendingRegistrationId]);
            return;
        }

        // Idempotency: webhook deliveries can duplicate. createUserAndComplete()
        // itself is also idempotent, but skip the whole block if already done.
        if ($pending->status === 'completed' && $pending->created_user_id) {
            Log::info('Moyasar payment.paid: registration already completed', ['pending_id' => $pending->id]);
            return;
        }

        // Must have actually passed OTP verification — belt and suspenders,
        // since complete()/initiateMoyasarPayment() already enforce this
        // before a payment can even be created.
        if (!$pending->email_verified_at) {
            Log::error('Moyasar payment.paid: pending registration has no verified email — refusing to create account', [
                'pending_id' => $pending->id,
            ]);
            return;
        }

        $user = $pending->createUserAndComplete();

        Transaction::create([
            'user_id'                => $user->id,
            'gateway'                => 'moyasar',
            'gateway_transaction_id' => $payment['id'] ?? null,
            'amount'                 => (int) ($payment['amount'] ?? 0) / 100,
            'currency'               => strtoupper($payment['currency'] ?? 'SAR'),
            'status'                 => 'completed',
            'type'                   => 'package',
            'gateway_response'       => $payment,
        ]);

        ActivityLog::log('user_registered_paid_package', $user->id, 'User', $user->id, null, [
            'package_id' => $pending->package_id,
            'gateway'    => 'moyasar',
        ]);

        Log::info('Moyasar payment.paid: registration completed, account created', [
            'user_id'    => $user->id,
            'pending_id' => $pending->id,
        ]);
    }

    private function handlePaymentFailed(array $data): void
    {
        $payment  = $data['data'] ?? $data;
        $metadata = $payment['metadata'] ?? [];
        $userId   = $metadata['user_id'] ?? null;

        if (!$userId) return;

        $sub = Subscription::where('user_id', $userId)
            ->where('gateway', 'moyasar')
            ->latest()
            ->first();

        if ($sub) {
            $sub->update(['status' => 'past_due']);
            ActivityLog::log('payment_failed', $userId, 'Subscription', $sub->id);
        }

        Log::warning('Moyasar payment.failed', ['user_id' => $userId, 'payment_id' => $payment['id'] ?? null]);
    }

    private function handlePaymentRefunded(array $data): void
    {
        $payment   = $data['data'] ?? $data;
        $paymentId = $payment['id'] ?? null;

        $transaction = Transaction::where('gateway_transaction_id', $paymentId)->first();

        if ($transaction) {
            $transaction->update(['status' => 'refunded']);

            $refundAmount = (int) ($payment['refunded'] ?? $payment['amount'] ?? 0);

            Transaction::create([
                'user_id'                => $transaction->user_id,
                'subscription_id'        => $transaction->subscription_id,
                'gateway'                => 'moyasar',
                'gateway_transaction_id' => $paymentId . '_refund',
                'amount'                 => -($refundAmount / 100),
                'currency'               => strtoupper($payment['currency'] ?? 'SAR'),
                'status'                 => 'completed',
                'type'                   => 'refund',
                'gateway_response'       => $payment,
            ]);

            ActivityLog::log('payment_refunded', $transaction->user_id, 'Transaction', $transaction->id);
        }

        Log::info('Moyasar payment.refunded', ['payment_id' => $paymentId]);
    }
}
