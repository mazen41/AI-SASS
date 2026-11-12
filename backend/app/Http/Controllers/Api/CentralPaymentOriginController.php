<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Models\MyFatoorahCheckoutSession;
use App\Models\PendingRegistration;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CentralPaymentOriginController extends Controller
{
    public function verifyOrder(Request $request): JsonResponse
    {
        $input = $request->validate(['external_order_id' => ['required', 'uuid']]);
        $checkout = MyFatoorahCheckoutSession::query()->find($input['external_order_id']);
        if (!$checkout || $checkout->status !== 'pending') {
            return response()->json(['verified' => false, 'message' => 'Checkout is not eligible for payment.'], 404);
        }

        $packageName = null;
        $customer = [];
        if ($checkout->pending_registration_id) {
            $pending = PendingRegistration::query()->with('package')->find($checkout->pending_registration_id);
            if (!$pending || $pending->status !== 'awaiting_payment' || !$pending->email_verified_at
                || !$pending->package?->is_active || (float) $pending->package->total_price <= 0) {
                return response()->json(['verified' => false, 'message' => 'Registration checkout is not eligible.'], 422);
            }
            $packageName = $pending->package->name;
            $customer = ['name' => $pending->name, 'email' => $pending->email];
            $resultPath = '/register/success?pending_id=' . rawurlencode((string) $pending->id);
            $packageId = (string) $pending->package_id;
            $customerId = (string) $pending->id;
        } else {
            $user = User::query()->find($checkout->user_id);
            $plan = Plan::query()->find($checkout->plan_id);
            if (!$user || !$plan || !$plan->is_active || (float) $plan->price <= 0) {
                return response()->json(['verified' => false, 'message' => 'Subscription checkout is not eligible.'], 422);
            }
            $packageName = $plan->name;
            $customer = ['name' => $user->name, 'email' => $user->email];
            $resultPath = '/billing/success?gateway=myfatoorah&checkout_id=' . rawurlencode((string) $checkout->id);
            $packageId = (string) $plan->id;
            $customerId = (string) $user->id;
        }

        return response()->json([
            'verified' => true,
            'order' => [
                'external_order_id' => (string) $checkout->id,
                'external_customer_id' => $customerId,
                'external_package_id' => $packageId,
                'package_name' => $packageName,
                'customer_email' => $customer['email'] ?? null,
                'customer_name' => $customer['name'] ?? null,
                'amount' => number_format((float) $checkout->amount, 2, '.', ''),
                'currency' => strtoupper((string) $checkout->currency),
                'customer' => $customer,
                'payment_result_path' => $resultPath,
            ],
        ]);
    }

    public function confirmPayment(Request $request): JsonResponse
    {
        $input = $request->validate([
            'event_id' => ['required', 'string', 'max:190'],
            'central_payment_id' => ['required', 'uuid'],
            'external_order_id' => ['required', 'uuid'],
            'external_package_id' => ['nullable', 'string', 'max:160'],
            'external_customer_id' => ['nullable', 'string', 'max:160'],
            'payment_status' => ['required', 'in:paid,failed,expired,cancelled,canceled,refunded'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'currency' => ['required', 'string', 'size:3'],
            'myfatoorah_invoice_id' => ['required', 'string', 'max:80'],
            'myfatoorah_payment_id' => ['nullable', 'string', 'max:80'],
            'paid_at' => ['nullable', 'date'],
        ]);

        $ack = DB::transaction(function () use ($input): bool {
            $checkout = MyFatoorahCheckoutSession::query()->lockForUpdate()->find($input['external_order_id']);
            if (!$checkout) return false;
            if (($checkout->gateway_response['central_payment_id'] ?? null) !== $input['central_payment_id']) return false;
            if ($checkout->status === 'completed') return true;
            if ($checkout->status !== 'pending'
                || abs((float) $checkout->amount - (float) $input['amount']) > 0.009
                || strtoupper((string) $checkout->currency) !== strtoupper($input['currency'])) return false;

            if ($checkout->pending_registration_id) {
                $pending = PendingRegistration::query()->lockForUpdate()->find($checkout->pending_registration_id);
                if (!$pending || (string) $pending->package_id !== (string) $input['external_package_id']
                    || (string) $pending->id !== (string) $input['external_customer_id']) return false;
                if ($input['payment_status'] === 'paid') {
                    if (!$pending->email_verified_at || $pending->status !== 'awaiting_payment') return false;
                    $pending->update(['myfatoorah_invoice_id' => $input['myfatoorah_invoice_id']]);
                    $user = $pending->createUserAndComplete();
                    Transaction::firstOrCreate(['gateway_transaction_id' => 'myfatoorah_' . $input['myfatoorah_payment_id']], [
                        'user_id' => $user->id,
                        'gateway' => 'myfatoorah',
                        'amount' => $checkout->amount,
                        'currency' => $checkout->currency,
                        'status' => 'completed',
                        'type' => 'one_time',
                        'gateway_response' => ['central_payment_id' => $input['central_payment_id'], 'event_id' => $input['event_id']],
                    ]);
                    ActivityLog::log('user_registered_paid_package', $user->id, 'User', $user->id, null, ['package_id' => $pending->package_id, 'gateway' => 'myfatoorah']);
                } else {
                    $checkout->update(['status' => 'failed']);
                    return true;
                }
            } else {
                $user = User::query()->find($checkout->user_id);
                $plan = Plan::query()->find($checkout->plan_id);
                if (!$user || !$plan || (string) $plan->id !== (string) $input['external_package_id']
                    || (string) $user->id !== (string) $input['external_customer_id']) return false;
                if ($input['payment_status'] === 'paid') {
                    $transactionId = 'myfatoorah_' . $input['myfatoorah_payment_id'];
                    if (!Transaction::query()->where('gateway_transaction_id', $transactionId)->exists()) {
                        $user->subscriptions()->where('status', 'active')->update(['status' => 'canceled', 'canceled_at' => now()]);
                        $subscription = Subscription::query()->create([
                            'user_id' => $user->id,
                            'plan_id' => $plan->id,
                            'gateway' => 'myfatoorah',
                            'gateway_subscription_id' => $transactionId,
                            'status' => 'active',
                            'current_period_start' => now(),
                            'current_period_end' => in_array(strtolower((string) $plan->billing_period), ['year', 'yearly', 'annual', 'annually'], true)
                                ? now()->addYear()
                                : now()->addMonth(),
                        ]);
                        Transaction::query()->create([
                            'user_id' => $user->id, 'subscription_id' => $subscription->id,
                            'gateway' => 'myfatoorah', 'gateway_transaction_id' => $transactionId,
                            'amount' => $checkout->amount, 'currency' => $checkout->currency,
                            'status' => 'completed', 'type' => 'subscription',
                            'gateway_response' => ['central_payment_id' => $input['central_payment_id'], 'event_id' => $input['event_id']],
                        ]);
                        app(\App\Services\AiCreditService::class)->grantPlanCredits(
                            $user, $plan, 'subscription-cycle:myfatoorah-central:' . $input['myfatoorah_payment_id']
                        );
                        Invoice::query()->create([
                            'user_id' => $user->id, 'subscription_id' => $subscription->id,
                            'invoice_number' => Invoice::generateInvoiceNumber(), 'amount' => $checkout->amount,
                            'currency' => $checkout->currency, 'status' => 'paid',
                            'items' => [['name' => $plan->name . ' Plan', 'price' => $checkout->amount, 'type' => 'subscription']],
                            'gateway' => 'myfatoorah', 'gateway_transaction_id' => $input['myfatoorah_payment_id'],
                            'issued_at' => now(), 'paid_at' => $input['paid_at'] ?? now(),
                        ]);
                        ActivityLog::log('payment_received', $user->id, 'Subscription', $subscription->id, null, ['amount' => $checkout->amount, 'gateway' => 'myfatoorah', 'plan' => $plan->name]);
                    }
                } else {
                    $checkout->update(['status' => 'failed']);
                    return true;
                }
            }

            $checkout->update([
                'status' => 'completed',
                'invoice_id' => $input['myfatoorah_invoice_id'],
                'payment_id' => $input['myfatoorah_payment_id'],
                'gateway_response' => [
                    ...($checkout->gateway_response ?? []),
                    'central_payment_id' => $input['central_payment_id'],
                    'myfatoorah_invoice_id' => $input['myfatoorah_invoice_id'],
                    'myfatoorah_payment_id' => $input['myfatoorah_payment_id'],
                    'event_id' => $input['event_id'],
                ],
            ]);
            return true;
        });

        return response()->json(['acknowledged' => $ack], $ack ? 200 : 409);
    }
}
