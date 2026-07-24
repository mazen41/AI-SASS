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

        // Verify HMAC-SHA256 signature
        if ($setting->webhook_secret) {
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
        if ($paymentId && Transaction::where('gateway_transaction_id', $paymentId)->exists()) {
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
