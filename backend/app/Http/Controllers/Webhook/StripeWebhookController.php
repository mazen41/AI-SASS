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
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $setting = PaymentSetting::getStripe();

        if (!$setting || !$setting->is_enabled) {
            Log::warning('Stripe webhook received but Stripe is not enabled');
            return response('Stripe not configured', 400);
        }

        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');

        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $sigHeader,
                $setting->webhook_secret
            );
        } catch (\UnexpectedValueException $e) {
            Log::error('Stripe webhook invalid payload', ['error' => $e->getMessage()]);
            return response('Invalid payload', 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::error('Stripe webhook signature verification failed', ['error' => $e->getMessage()]);
            return response('Invalid signature', 400);
        }

        Log::info('Stripe webhook received', ['type' => $event->type]);

        match ($event->type) {
            'checkout.session.completed' => $this->handleCheckoutCompleted($event->data->object),
            'customer.subscription.created' => $this->handleSubscriptionCreated($event->data->object),
            'customer.subscription.updated' => $this->handleSubscriptionUpdated($event->data->object),
            'customer.subscription.deleted' => $this->handleSubscriptionDeleted($event->data->object),
            'invoice.paid' => $this->handleInvoicePaid($event->data->object),
            'invoice.payment_failed' => $this->handleInvoicePaymentFailed($event->data->object),
            'charge.refunded' => $this->handleChargeRefunded($event->data->object),
            default => Log::info('Unhandled Stripe event', ['type' => $event->type]),
        };

        return response('OK', 200);
    }

    private function handleCheckoutCompleted($session): void
    {
        Log::info('Checkout session completed', ['session_id' => $session->id]);
    }

    private function handleSubscriptionCreated($subscription): void
    {
        $user = User::where('email', $subscription->customer_email)->first();
        
        if (!$user) {
            Log::warning('Stripe subscription created for unknown user', [
                'customer_id' => $subscription->customer,
            ]);
            return;
        }

        $existingSub = Subscription::where('gateway_subscription_id', $subscription->id)->first();
        if ($existingSub) {
            return;
        }

        $sub = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $this->getPlanIdFromStripePrice($subscription->items->data[0]->price->id),
            'gateway' => 'stripe',
            'gateway_subscription_id' => $subscription->id,
            'gateway_customer_id' => $subscription->customer,
            'status' => $this->mapStripeStatus($subscription->status),
            'current_period_start' => \Carbon\Carbon::createFromTimestamp($subscription->current_period_start),
            'current_period_end' => \Carbon\Carbon::createFromTimestamp($subscription->current_period_end),
        ]);

        ActivityLog::log('subscription_created', $user->id, 'Subscription', $sub->id);
    }

    private function handleSubscriptionUpdated($subscription): void
    {
        $sub = Subscription::where('gateway_subscription_id', $subscription->id)->first();

        if (!$sub) {
            Log::warning('Stripe subscription update for unknown subscription', [
                'subscription_id' => $subscription->id,
            ]);
            return;
        }

        $oldStatus = $sub->status;
        $sub->update([
            'status' => $this->mapStripeStatus($subscription->status),
            'current_period_start' => \Carbon\Carbon::createFromTimestamp($subscription->current_period_start),
            'current_period_end' => \Carbon\Carbon::createFromTimestamp($subscription->current_period_end),
            'canceled_at' => $subscription->canceled_at 
                ? \Carbon\Carbon::createFromTimestamp($subscription->canceled_at) 
                : null,
        ]);

        if ($oldStatus !== $sub->status) {
            ActivityLog::log('subscription_status_changed', $sub->user_id, 'Subscription', $sub->id, 
                ['status' => $oldStatus], 
                ['status' => $sub->status]
            );
        }
    }

    private function handleSubscriptionDeleted($subscription): void
    {
        $sub = Subscription::where('gateway_subscription_id', $subscription->id)->first();

        if ($sub) {
            $sub->update([
                'status' => 'canceled',
                'canceled_at' => now(),
            ]);

            ActivityLog::log('subscription_canceled', $sub->user_id, 'Subscription', $sub->id);
        }
    }

    private function handleInvoicePaid($invoice): void
    {
        $sub = Subscription::where('gateway_subscription_id', $invoice->subscription)->first();

        if (!$sub) {
            Log::warning('Invoice paid for unknown subscription', [
                'invoice_id' => $invoice->id,
            ]);
            return;
        }

        $existingTransaction = Transaction::where('gateway_transaction_id', $invoice->payment_intent)->first();
        if ($existingTransaction) {
            return;
        }

        Transaction::create([
            'user_id' => $sub->user_id,
            'subscription_id' => $sub->id,
            'gateway' => 'stripe',
            'gateway_transaction_id' => $invoice->payment_intent,
            'amount' => $invoice->amount_paid / 100,
            'currency' => strtoupper($invoice->currency),
            'status' => 'completed',
            'type' => 'subscription',
            'gateway_response' => [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->number,
            ],
        ]);

        ActivityLog::log('payment_received', $sub->user_id, 'Transaction', null, null, [
            'amount' => $invoice->amount_paid / 100,
            'gateway' => 'stripe',
        ]);
    }

    private function handleInvoicePaymentFailed($invoice): void
    {
        $sub = Subscription::where('gateway_subscription_id', $invoice->subscription)->first();

        if ($sub) {
            $sub->update(['status' => 'past_due']);

            ActivityLog::log('payment_failed', $sub->user_id, 'Subscription', $sub->id);
        }
    }

    private function handleChargeRefunded($charge): void
    {
        $transaction = Transaction::where('gateway_transaction_id', $charge->payment_intent)->first();

        if ($transaction) {
            $transaction->update(['status' => 'refunded']);

            Transaction::create([
                'user_id' => $transaction->user_id,
                'subscription_id' => $transaction->subscription_id,
                'gateway' => 'stripe',
                'gateway_transaction_id' => $charge->id . '_refund',
                'amount' => -($charge->amount_refunded / 100),
                'currency' => strtoupper($charge->currency),
                'status' => 'completed',
                'type' => 'refund',
            ]);

            ActivityLog::log('payment_refunded', $transaction->user_id, 'Transaction', $transaction->id);
        }
    }

    private function mapStripeStatus(string $status): string
    {
        return match ($status) {
            'active' => 'active',
            'past_due' => 'past_due',
            'canceled' => 'canceled',
            'unpaid' => 'past_due',
            'trialing' => 'trialing',
            'paused' => 'paused',
            default => 'active',
        };
    }

    private function getPlanIdFromStripePrice(string $priceId): ?int
    {
        $plan = \App\Models\Plan::where('stripe_price_id', $priceId)->first();
        return $plan?->id;
    }
}
