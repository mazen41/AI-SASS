<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\ActivityLog;
use App\Services\MyFatoorahService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Throwable;

class PaymentOperationsController extends Controller
{
    /** Read-only provider check. Never mutates invoices, transactions, subscriptions, or entitlements. */
    public function verifyMyFatoorah(Invoice $invoice): JsonResponse
    {
        abort_unless(Str::lower((string) $invoice->gateway) === 'myfatoorah', 422, 'This operation supports MyFatoorah invoices only.');
        abort_unless($invoice->gateway_transaction_id, 422, 'This invoice has no provider invoice ID to verify.');
        $service = MyFatoorahService::apiConfigured();
        abort_unless($service, 503, 'MyFatoorah verification is not configured.');

        try {
            $data = $service->getInvoiceStatus((string) $invoice->gateway_transaction_id);
            $providerAmount = data_get($data, 'InvoiceValue') ?? data_get($data, 'InvoiceTransactions.0.TransationValue');
            $providerCurrency = data_get($data, 'DisplayCurrencyIso') ?? data_get($data, 'InvoiceTransactions.0.Currency');
            ActivityLog::log('myfatoorah_status_checked', request()->user()?->id, 'Invoice', $invoice->id, null, [
                'local_status' => $invoice->status,
                'provider_status' => data_get($data, 'InvoiceStatus'),
                'amount_matches' => is_numeric($providerAmount) ? abs((float) $providerAmount - (float) $invoice->amount) < 0.01 : null,
                'currency_matches' => $providerCurrency ? strtoupper((string) $providerCurrency) === strtoupper((string) $invoice->currency) : null,
            ]);
            return response()->json([
                'local' => ['invoice_id' => $invoice->id, 'status' => $invoice->status, 'amount' => (float) $invoice->amount, 'currency' => strtoupper((string) $invoice->currency)],
                'provider' => [
                    'invoice_status' => data_get($data, 'InvoiceStatus'),
                    'transaction_status' => data_get($data, 'InvoiceTransactions.0.TransactionStatus'),
                    'provider_invoice_id' => data_get($data, 'InvoiceId'),
                    'provider_amount' => is_numeric($providerAmount) ? (float) $providerAmount : null,
                    'provider_currency' => $providerCurrency ? strtoupper((string) $providerCurrency) : null,
                ],
                'matches' => [
                    'amount' => is_numeric($providerAmount) ? abs((float) $providerAmount - (float) $invoice->amount) < 0.01 : null,
                    'currency' => $providerCurrency ? strtoupper((string) $providerCurrency) === strtoupper((string) $invoice->currency) : null,
                ],
                'checked_at' => now()->toISOString(),
                'note' => 'Read-only provider check; no local payment or subscription state was changed.',
            ]);
        } catch (Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Provider status could not be verified. Check gateway configuration and server logs.'], 502);
        }
    }
}
