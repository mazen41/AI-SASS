<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Models\MyFatoorahCheckoutSession;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use App\Services\MyFatoorahService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MyFatoorahWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $setting = PaymentSetting::getMyfatoorah();
        if (!$setting || !$setting->is_enabled || !$setting->webhook_secret) {
            Log::warning('MyFatoorah webhook rejected: gateway or webhook secret unavailable');
            return response('Webhook not configured', 400);
        }

        $payload = $request->json()->all();
        if (($payload['Event']['Name'] ?? null) !== 'PAYMENT_STATUS_CHANGED') return response('Ignored', 200);
        $signature = (string) $request->header('MyFatoorah-Signature', '');
        if (!MyFatoorahService::validPaymentStatusSignature($payload, $setting->webhook_secret, $signature)) {
            Log::warning('MyFatoorah webhook rejected: invalid signature');
            return response('Invalid signature', 400);
        }

        $invoice = (array) data_get($payload, 'Data.Invoice', []);
        $transaction = (array) data_get($payload, 'Data.Transaction', []);
        $invoiceId = (string) ($invoice['Id'] ?? '');
        $session = MyFatoorahCheckoutSession::where('invoice_id', $invoiceId)->first();
        if (!$session && !empty($invoice['ExternalIdentifier'])) {
            $session = MyFatoorahCheckoutSession::find((string) $invoice['ExternalIdentifier']);
        }
        if (!$session) {
            Log::warning('MyFatoorah webhook invoice has no matching checkout', ['invoice_id' => $invoiceId]);
            return response('Unknown invoice', 404);
        }

        try {
            $verified = (new MyFatoorahService($setting))->getInvoiceStatus($invoiceId);
        } catch (\Throwable $e) {
            Log::error('MyFatoorah payment verification failed', ['checkout_id' => $session->id, 'exception' => get_class($e)]);
            return response('Could not verify payment', 503);
        }

        $verifiedInvoiceId = (string) ($verified['InvoiceId'] ?? $verified['InvoiceID'] ?? '');
        $status = strtoupper((string) ($verified['InvoiceStatus'] ?? $verified['Status'] ?? ''));
        $paidAmount = round((float) ($verified['InvoiceValue'] ?? $verified['InvoiceAmount'] ?? 0), 2);
        $verifiedTransactions = (array) ($verified['InvoiceTransactions'] ?? $verified['Transactions'] ?? []);
        $successfulTransaction = collect($verifiedTransactions)->first(fn ($item) => strtoupper((string) ($item['TransactionStatus'] ?? $item['Transaction_Status'] ?? '')) === 'SUCCESS') ?? [];
        $currency = strtoupper((string) ($successfulTransaction['PaidCurrency'] ?? $verified['Currency'] ?? $verified['DisplayCurrencyIso'] ?? $session->currency));
        $transactionSucceeded = !$verifiedTransactions || !empty($successfulTransaction);
        if ($verifiedInvoiceId !== $invoiceId || $status !== 'PAID' || !$transactionSucceeded || abs($paidAmount - (float) $session->amount) > 0.009 || $currency !== strtoupper($session->currency)) {
            Log::warning('MyFatoorah payment did not match local checkout', ['checkout_id' => $session->id, 'invoice_id_matches' => $verifiedInvoiceId === $invoiceId, 'status' => $status, 'amount_matches' => abs($paidAmount - (float) $session->amount) <= 0.009, 'currency_matches' => $currency === strtoupper($session->currency)]);
            return response('Payment not completed or does not match checkout', 200);
        }

        $paymentId = (string) ($successfulTransaction['PaymentId'] ?? $verified['PaymentId'] ?? $transaction['PaymentId'] ?? $invoiceId);
        DB::transaction(function () use ($session, $verified, $paymentId): void {
            $session = MyFatoorahCheckoutSession::whereKey($session->id)->lockForUpdate()->first();
            if (!$session || $session->status === 'completed') return;
            $session->update(['status' => 'completed', 'payment_id' => $paymentId, 'gateway_response' => $verified]);

            if ($session->pending_registration_id) {
                $pending = \App\Models\PendingRegistration::whereKey($session->pending_registration_id)->lockForUpdate()->first();
                if (!$pending || !$pending->email_verified_at) throw new \RuntimeException('Verified registration is unavailable.');
                if ($pending->status !== 'completed') {
                    $pending->update(['myfatoorah_invoice_id' => $session->invoice_id]);
                    $user = $pending->createUserAndComplete();
                    Transaction::firstOrCreate(['gateway_transaction_id' => 'myfatoorah_' . $paymentId], [
                        'user_id' => $user->id, 'gateway' => 'myfatoorah', 'amount' => $session->amount,
                        'currency' => $session->currency, 'status' => 'completed', 'type' => 'one_time', 'gateway_response' => $verified,
                    ]);
                    ActivityLog::log('user_registered_paid_package', $user->id, 'User', $user->id, null, ['package_id' => $pending->package_id, 'gateway' => 'myfatoorah']);
                }
                return;
            }

            $user = User::findOrFail($session->user_id);
            $plan = Plan::findOrFail($session->plan_id);
            if (Transaction::where('gateway_transaction_id', 'myfatoorah_' . $paymentId)->exists()) return;
            $user->subscriptions()->where('status', 'active')->update(['status' => 'canceled', 'canceled_at' => now()]);
            $subscription = Subscription::create([
                'user_id' => $user->id, 'plan_id' => $plan->id, 'gateway' => 'myfatoorah',
                'gateway_subscription_id' => 'myfatoorah_' . $paymentId, 'status' => 'active',
                'current_period_start' => now(), 'current_period_end' => now()->addDays(30),
            ]);
            Transaction::create([
                'user_id' => $user->id, 'subscription_id' => $subscription->id, 'gateway' => 'myfatoorah',
                'gateway_transaction_id' => 'myfatoorah_' . $paymentId, 'amount' => $session->amount,
                'currency' => $session->currency, 'status' => 'completed', 'type' => 'subscription', 'gateway_response' => $verified,
            ]);
            Invoice::create([
                'user_id' => $user->id, 'subscription_id' => $subscription->id,
                'invoice_number' => Invoice::generateInvoiceNumber(), 'amount' => $session->amount,
                'currency' => $session->currency, 'status' => 'paid',
                'items' => [['name' => $plan->name . ' Plan', 'price' => $session->amount, 'type' => 'subscription']],
                'gateway' => 'myfatoorah', 'gateway_transaction_id' => $paymentId, 'issued_at' => now(), 'paid_at' => now(),
            ]);
            ActivityLog::log('payment_received', $user->id, 'Subscription', $subscription->id, null, ['amount' => $session->amount, 'gateway' => 'myfatoorah', 'plan' => $plan->name]);
        });

        Log::info('MyFatoorah payment checkout completed', ['checkout_id' => $session->id, 'invoice_id' => $invoiceId]);
        return response('OK', 200);
    }
}
