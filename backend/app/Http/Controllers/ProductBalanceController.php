<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\UserProductBalance;
use App\Models\Invoice;
use App\Models\AiCreditPackage;
use App\Models\AiCreditTransaction;
use App\Models\MyFatoorahCheckoutSession;
use App\Models\PaymentSetting;
use App\Services\AiCreditService;
use App\Services\MyFatoorahService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductBalanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $activePackage = $user->activeUserPackage();
        $balances = $user->getAllProductBalances();

        return response()->json([
            'active_package' => $activePackage?->load('package.items.product'),
            'balances' => $balances,
        ]);
    }

    public function purchase(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Product balances are retired. Select an AI credit package and complete verified checkout.'], 410);
    }

    public function creditSummary(Request $request, AiCreditService $credits): JsonResponse
    {
        return response()->json(['credits' => $credits->summarize($request->user())]);
    }

    public function creditHistory(Request $request): JsonResponse
    {
        $items = AiCreditTransaction::where('user_id', $request->user()->id)->latest()->paginate(30);
        return response()->json($items);
    }

    public function creditPackages(): JsonResponse
    {
        return response()->json(['packages' => AiCreditPackage::where('is_active', true)->orderBy('sort_order')->get()]);
    }

    public function purchaseCredits(Request $request, int $packageId): JsonResponse
    {
        $user = $request->user();
        $package = AiCreditPackage::where('is_active', true)->findOrFail($packageId);
        $gateway = MyFatoorahService::configured();
        if (!$gateway) return response()->json(['message' => 'Credit checkout is temporarily unavailable.'], 503);

        $checkout = MyFatoorahCheckoutSession::create([
            'user_id' => $user->id, 'amount' => $package->price, 'currency' => $package->currency,
            'status' => 'pending', 'purpose' => 'credit_purchase', 'credit_package_id' => $package->id,
        ]);
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        try {
            $invoice = $gateway->sendPayment([
                'CustomerName' => $user->name ?: $user->email,
                'CustomerEmail' => $user->email,
                'InvoiceValue' => (float)$package->price,
                'DisplayCurrencyIso' => $package->currency,
                'NotificationOption' => 'LNK',
                'Language' => app()->getLocale() === 'ar' ? 'AR' : 'EN',
                'CustomerReference' => $checkout->id,
                'UserDefinedField' => $checkout->id,
                'CallBackUrl' => $frontendUrl . '/billing/success?gateway=myfatoorah&checkout_id=' . $checkout->id,
                'ErrorUrl' => $frontendUrl . '/billing?status=cancel&gateway=myfatoorah',
                'WebhookUrl' => url('/api/webhooks/myfatoorah'),
            ]);
            $checkout->update(['invoice_id' => (string)$invoice['InvoiceId'], 'gateway_response' => ['invoice_status' => $invoice['InvoiceStatus'] ?? null]]);
            return response()->json(['url' => $invoice['InvoiceURL'], 'checkout_id' => $checkout->id]);
        } catch (\Throwable $e) {
            $checkout->update(['status' => 'failed']);
            \Illuminate\Support\Facades\Log::error('MyFatoorah credit checkout failed', ['checkout_id' => $checkout->id, 'exception_type' => get_class($e)]);
            return response()->json(['message' => 'Could not start credit checkout. Please try again.'], 502);
        }
    }
}
