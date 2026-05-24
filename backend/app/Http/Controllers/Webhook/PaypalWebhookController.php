<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaypalWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $setting = PaymentSetting::getPaypal();

        if (!$setting || !$setting->is_enabled) {
            Log::warning('PayPal webhook received but PayPal is not enabled');
            return response('PayPal not configured', 400);
        }

        // Verify webhook signature
        if (!$this->verifyWebhookSignature($request, $setting)) {
            Log::error('PayPal webhook signature verification failed');
            return response('Invalid signature', 400);
        }

        $payload = $request->all();
        $eventType = $payload['event_type'] ?? null;

        Log::info('PayPal webhook received', ['type' => $eventType]);

        match ($eventType) {
            'BILLING.SUBSCRIPTION.CREATED' => $this->handleSubscriptionCreated($payload['resource']),
            'BILLING.SUBSCRIPTION.ACTIVATED' => $this->handleSubscriptionActivated($payload['resource']),
            'BILLING.SUBSCRIPTION.UPDATED' => $this->handleSubscriptionUpdated($payload['resource']),
            'BILLING.SUBSCRIPTION.CANCELLED' => $this->handleSubscriptionCancelled($payload['resource']),
            'BILLING.SUBSCRIPTION.SUSPENDED' => $this->handleSubscriptionSuspended($payload['resource']),
            'PAYMENT.SALE.COMPLETED' => $this->handlePaymentCompleted($payload['resource']),
            'PAYMENT.SALE.REFUNDED' => $this->handlePaymentRefunded($payload['resource']),
            default => Log::info('Unhandled PayPal event', ['type' => $eventType]),
        };

        return response('OK', 200);
    }

    private function verifyWebhookSignature(Request $request, PaymentSetting $setting): bool
    {
        $baseUrl = $setting->is_sandbox
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        // Get access token
        $tokenResponse = Http::withBasicAuth($setting->public_key, $setting->secret_key)
            ->asForm()
            ->post("{$baseUrl}/v1/oauth2/token", [
                'grant_type' => 'client_credentials',
            ]);

        if (!$tokenResponse->successful()) {
            return false;
        }

        $accessToken = $tokenResponse->json('access_token');

        // Verify signature
        $verifyResponse = Http::withToken($accessToken)
            ->post("{$baseUrl}/v1/notifications/verify-webhook-signature", [
                'auth_algo' => $request->header('PAYPAL-AUTH-ALGO'),
                'cert_url' => $request->header('PAYPAL-CERT-URL'),
                'transmission_id' => $request->header('PAYPAL-TRANSMISSION-ID'),
                'transmission_sig' => $request->header('PAYPAL-TRANSMISSION-SIG'),
                'transmission_time' => $request->header('PAYPAL-TRANSMISSION-TIME'),
                'webhook_id' => $setting->webhook_secret,
                'webhook_event' => $request->all(),
            ]);

        return $verifyResponse->successful() && 
               $verifyResponse->json('verification_status') === 'SUCCESS';
    }

    private function handleSubscriptionCreated($resource): void
    {
        Log::info('PayPal subscription created', ['subscription_id' => $resource['id']]);
    }

    private function handleSubscriptionActivated($resource): void
    {
        $customId = $resource['custom_id'] ?? null;
        $user = $customId ? User::find($customId) : null;

        if (!$user) {
            Log::warning('PayPal subscription activated for unknown user', [
                'subscription_id' => $resource['id'],
            ]);
            return;
        }

        $existingSub = Subscription::where('gateway_subscription_id', $resource['id'])->first();
        if ($existingSub) {
            $existingSub->update(['status' => 'active']);
            return;
        }

        $sub = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $this->getPlanIdFromPaypalPlan($resource['plan_id']),
            'gateway' => 'paypal',
            'gateway_subscription_id' => $resource['id'],
            'gateway_customer_id' => $resource['subscriber']['payer_id'] ?? null,
            'status' => 'active',
            'current_period_start' => isset($resource['billing_info']['last_payment']['time']) 
                ? \Carbon\Carbon::parse($resource['billing_info']['last_payment']['time']) 
                : now(),
            'current_period_end' => isset($resource['billing_info']['next_billing_time']) 
                ? \Carbon\Carbon::parse($resource['billing_info']['next_billing_time']) 
                : null,
        ]);

        ActivityLog::log('subscription_created', $user->id, 'Subscription', $sub->id);
    }

    private function handleSubscriptionUpdated($resource): void
    {
        $sub = Subscription::where('gateway_subscription_id', $resource['id'])->first();

        if ($sub) {
            $sub->update([
                'status' => $this->mapPaypalStatus($resource['status']),
                'current_period_end' => isset($resource['billing_info']['next_billing_time']) 
                    ? \Carbon\Carbon::parse($resource['billing_info']['next_billing_time']) 
                    : $sub->current_period_end,
            ]);
        }
    }

    private function handleSubscriptionCancelled($resource): void
    {
        $sub = Subscription::where('gateway_subscription_id', $resource['id'])->first();

        if ($sub) {
            $sub->update([
                'status' => 'canceled',
                'canceled_at' => now(),
            ]);

            ActivityLog::log('subscription_canceled', $sub->user_id, 'Subscription', $sub->id);
        }
    }

    private function handleSubscriptionSuspended($resource): void
    {
        $sub = Subscription::where('gateway_subscription_id', $resource['id'])->first();

        if ($sub) {
            $sub->update(['status' => 'paused']);

            ActivityLog::log('subscription_suspended', $sub->user_id, 'Subscription', $sub->id);
        }
    }

    private function handlePaymentCompleted($resource): void
    {
        $billingAgreementId = $resource['billing_agreement_id'] ?? null;
        $sub = $billingAgreementId 
            ? Subscription::where('gateway_subscription_id', $billingAgreementId)->first() 
            : null;

        $existingTransaction = Transaction::where('gateway_transaction_id', $resource['id'])->first();
        if ($existingTransaction) {
            return;
        }

        $userId = $sub?->user_id;

        if (!$userId) {
            Log::warning('PayPal payment completed for unknown subscription', [
                'sale_id' => $resource['id'],
            ]);
            return;
        }

        Transaction::create([
            'user_id' => $userId,
            'subscription_id' => $sub?->id,
            'gateway' => 'paypal',
            'gateway_transaction_id' => $resource['id'],
            'amount' => $resource['amount']['total'],
            'currency' => $resource['amount']['currency'],
            'status' => 'completed',
            'type' => 'subscription',
            'gateway_response' => [
                'state' => $resource['state'],
                'payment_mode' => $resource['payment_mode'] ?? null,
            ],
        ]);

        ActivityLog::log('payment_received', $userId, 'Transaction', null, null, [
            'amount' => $resource['amount']['total'],
            'gateway' => 'paypal',
        ]);
    }

    private function handlePaymentRefunded($resource): void
    {
        $saleId = $resource['sale_id'] ?? null;
        $transaction = $saleId ? Transaction::where('gateway_transaction_id', $saleId)->first() : null;

        if ($transaction) {
            $transaction->update(['status' => 'refunded']);

            Transaction::create([
                'user_id' => $transaction->user_id,
                'subscription_id' => $transaction->subscription_id,
                'gateway' => 'paypal',
                'gateway_transaction_id' => $resource['id'],
                'amount' => -$resource['amount']['total'],
                'currency' => $resource['amount']['currency'],
                'status' => 'completed',
                'type' => 'refund',
            ]);

            ActivityLog::log('payment_refunded', $transaction->user_id, 'Transaction', $transaction->id);
        }
    }

    private function mapPaypalStatus(string $status): string
    {
        return match ($status) {
            'ACTIVE' => 'active',
            'SUSPENDED' => 'paused',
            'CANCELLED' => 'canceled',
            'EXPIRED' => 'expired',
            default => 'active',
        };
    }

    private function getPlanIdFromPaypalPlan(string $planId): ?int
    {
        $plan = \App\Models\Plan::where('paypal_plan_id', $planId)->first();
        return $plan?->id;
    }
}
