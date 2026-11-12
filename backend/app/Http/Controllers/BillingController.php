<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanAddon;
use App\Models\Subscription;
use App\Models\Invoice;
use App\Models\PaymentSetting;
use App\Models\ActivityLog;
use App\Models\MailTemplate;
use App\Models\MyFatoorahCheckoutSession;
use App\Services\MyFatoorahService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;

class BillingController extends Controller
{
    public function plans(): JsonResponse
    {
        $plans = Cache::rememberForever('active_plans', function () {
            return Plan::where('is_active', true)
                ->where('is_public', true)
                ->orderBy('sort_order')
                ->get();
        });

        $stripe  = PaymentSetting::getStripe();
        $paypal  = PaymentSetting::getPaypal();
        $moyasar = PaymentSetting::getMoyasar();
        $myfatoorah = PaymentSetting::getMyfatoorah();
        $gateways = [];
        if ($stripe  && $stripe->is_enabled  && $stripe->secret_key)  $gateways[] = 'stripe';
        if ($paypal  && $paypal->is_enabled  && $paypal->secret_key)  $gateways[] = 'paypal';
        if ($moyasar && $moyasar->is_enabled && $moyasar->secret_key) $gateways[] = 'moyasar';
        if (config('services.central_payments.enabled') || ($myfatoorah && $myfatoorah->is_enabled && $myfatoorah->secret_key && $myfatoorah->webhook_secret)) $gateways[] = 'myfatoorah';

        return response()->json([
            'plans'    => $plans,
            'gateways' => $gateways,
        ]);
    }

    public function subscribeFree(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|integer|exists:plans,id',
        ]);

        $plan = Plan::findOrFail($request->plan_id);

        if (!$plan->is_active) {
            return response()->json(['message' => 'This plan is currently not available.'], 422);
        }

        if ((float) $plan->price > 0) {
            return response()->json(['message' => 'Paid plans require a payment gateway checkout.'], 422);
        }

        $user = $request->user();

        $activeSub = $user->activeSubscription();
        if ($activeSub && $activeSub->plan_id === $plan->id && $activeSub->status === 'active') {
            return response()->json([
                'message' => 'You are already enrolled in this plan.',
                'subscription' => $activeSub->load('plan'),
            ]);
        }

        $subscription = Subscription::updateOrCreate(
            ['user_id' => $user->id, 'status' => 'active'],
            [
                'plan_id' => $plan->id,
                'gateway' => 'free',
                'gateway_subscription_id' => 'free_' . $user->id . '_' . time(),
                'gateway_customer_id' => 'free_' . $user->id,
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
            ]
        );

        if ($plan->monthly_credits > 0) {
            $reference = 'free_plan_grant:' . $user->id . ':' . now()->format('Y-m');
            app(\App\Services\AiCreditService::class)->grantPlanCredits($user, $plan, $reference);
        }

        ActivityLog::log('free_plan_enrolled', $user->id, 'Subscription', $subscription->id, null, [
            'plan_id' => $plan->id,
            'plan_slug' => $plan->slug,
        ]);

        return response()->json([
            'message' => 'Free plan activated successfully! Welcome to the studio.',
            'subscription' => $subscription->fresh()->load('plan'),
        ]);
    }

    public function activeSubscription(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->activeSubscription();

        $stripe  = PaymentSetting::getStripe();
        $paypal  = PaymentSetting::getPaypal();
        $moyasar = PaymentSetting::getMoyasar();
        $myfatoorah = PaymentSetting::getMyfatoorah();
        $gateways = [];
        if ($stripe  && $stripe->is_enabled  && $stripe->secret_key)  $gateways[] = 'stripe';
        if ($paypal  && $paypal->is_enabled  && $paypal->secret_key)  $gateways[] = 'paypal';
        if ($moyasar && $moyasar->is_enabled && $moyasar->secret_key) $gateways[] = 'moyasar';
        if (config('services.central_payments.enabled') || ($myfatoorah && $myfatoorah->is_enabled && $myfatoorah->secret_key && $myfatoorah->webhook_secret)) $gateways[] = 'myfatoorah';

        return response()->json([
            'subscription' => $subscription ? $subscription->load('plan') : null,
            'story_limits' => $user->getStoryLimitDetails(),
            'video_limits' => $user->getVideoLimitDetails(),
            'gateways' => $gateways,
        ]);
    }

    public function addons(): JsonResponse
    {
        $addons = PlanAddon::where('is_active', true)->orderBy('sort_order')->get();
        return response()->json(['addons' => $addons]);
    }

    public function purchaseAddon(Request $request): JsonResponse
    {
        $request->validate([
            'addon_id' => 'required|exists:plan_addons,id',
        ]);
        // Never represent an add-on as paid without a verified payment. This
        // legacy endpoint has no checkout/session or webhook-backed grant path.
        Log::warning('Credit add-on checkout unavailable; refusing unpaid grant', [
            'user_id' => $request->user()->id,
            'addon_id' => (int) $request->addon_id,
        ]);

        return response()->json([
            'message' => 'Credit add-on checkout is temporarily unavailable. No payment or credits were processed.',
            'code' => 'ADDON_CHECKOUT_UNAVAILABLE',
        ], 503);
    }

    public function subscribeStripe(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $plan = Plan::find($request->plan_id);
        $user = $request->user();

        $stripeSettings = PaymentSetting::getStripe();
        if (!$stripeSettings || !$stripeSettings->is_enabled || !$stripeSettings->secret_key || !$plan->stripe_price_id) {
            // SECURITY: fail closed. A "mock" fallback here used to grant a
            // real active subscription with no payment whenever Stripe was
            // unconfigured — anyone could hit this endpoint and get a free
            // plan. Never silently grant access; require a working gateway.
            Log::error('Stripe subscribe: gateway not configured', ['user_id' => $user->id, 'plan_id' => $plan->id]);
            return response()->json(['message' => 'Payment is temporarily unavailable. Please try again later or contact support.'], 503);
        }

        try {
            \Stripe\Stripe::setApiKey($stripeSettings->secret_key);

            $session = \Stripe\Checkout\Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price' => $plan->stripe_price_id,
                    'quantity' => 1,
                ]],
                'mode' => 'subscription',
                'success_url' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/billing/success?gateway=stripe&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/billing?status=cancel',
                'customer_email' => $user->email,
                'client_reference_id' => (string) $user->id,
                'subscription_data' => [
                    'metadata' => [
                        'user_id' => $user->id,
                        'plan_id' => $plan->id,
                    ]
                ]
            ]);

            return response()->json(['url' => $session->url]);
        } catch (\Exception $e) {
            Log::error('Stripe checkout error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Stripe integration error: ' . $e->getMessage()], 500);
        }
    }

    public function subscribePaypal(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $plan = Plan::find($request->plan_id);
        $user = $request->user();

        $paypalSettings = PaymentSetting::getPaypal();
        if (!$paypalSettings || !$paypalSettings->is_enabled || !$paypalSettings->public_key || !$paypalSettings->secret_key || !$plan->paypal_plan_id) {
            // SECURITY: fail closed — see subscribeStripe() for why the old
            // mock-activation fallback was removed.
            Log::error('PayPal subscribe: gateway not configured', ['user_id' => $user->id, 'plan_id' => $plan->id]);
            return response()->json(['message' => 'Payment is temporarily unavailable. Please try again later or contact support.'], 503);
        }

        $baseUrl = $paypalSettings->is_sandbox
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        try {
            $tokenResponse = Http::withBasicAuth($paypalSettings->public_key, $paypalSettings->secret_key)
                ->asForm()
                ->post("{$baseUrl}/v1/oauth2/token", [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$tokenResponse->successful()) {
                throw new \Exception("PayPal OAuth authentication failed.");
            }

            $accessToken = $tokenResponse->json('access_token');

            $subscriptionResponse = Http::withToken($accessToken)
                ->post("{$baseUrl}/v1/billing/subscriptions", [
                    'plan_id' => $plan->paypal_plan_id,
                    'custom_id' => (string) $user->id,
                    'application_context' => [
                        'brand_name' => 'StoryHero',
                        'locale' => 'en-US',
                        'shipping_preference' => 'NO_SHIPPING',
                        'user_action' => 'SUBSCRIBE_NOW',
                        'return_url' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/billing/success?gateway=paypal',
                        'cancel_url' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/billing?status=cancel',
                    ]
                ]);

            if (!$subscriptionResponse->successful()) {
                throw new \Exception("PayPal subscription creation failed: " . $subscriptionResponse->body());
            }

            $links = $subscriptionResponse->json('links');
            $approveUrl = '';
            foreach ($links as $link) {
                if ($link['rel'] === 'approve') {
                    $approveUrl = $link['href'];
                    break;
                }
            }

            if (!$approveUrl) {
                throw new \Exception("Approve link not found in PayPal response.");
            }

            return response()->json(['url' => $approveUrl]);
        } catch (\Exception $e) {
            Log::error('PayPal checkout error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'PayPal integration error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Initiate a Moyasar payment for a subscription plan.
     * Returns a Moyasar payment URL that the frontend redirects to.
     * On success, Moyasar calls our webhook which activates the subscription.
     */
    public function subscribeMoyasar(Request $request): JsonResponse
    {
        $request->validate(['plan_id' => 'required|exists:plans,id']);

        $plan    = Plan::findOrFail($request->plan_id);
        $user    = $request->user();
        $setting = PaymentSetting::getMoyasar();

        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');

        // SECURITY: fail closed — see subscribeStripe() for why the old
        // mock-activation fallback (which granted a free active subscription
        // with no payment whenever Moyasar was unconfigured) was removed.
        if (!$setting || !$setting->is_enabled || !$setting->secret_key || !$setting->public_key) {
            Log::error('Moyasar subscribe: gateway not configured', ['user_id' => $user->id, 'plan_id' => $plan->id]);
            return response()->json(['message' => 'Payment is temporarily unavailable. Please try again later or contact support.'], 503);
        }

        // Amount in halala (SAR cents): Moyasar expects smallest currency unit
        $amountHalala = (int) round((float) $plan->price * 100);

        try {
            $response = Http::withBasicAuth($setting->secret_key, '')
                ->post('https://api.moyasar.com/v1/payments', [
                    'amount'      => $amountHalala,
                    'currency'    => 'SAR',
                    'description' => $plan->name . ' — Monthly Subscription',
                    'callback_url' => $frontendUrl . '/billing/success?gateway=moyasar',
                    'source'       => [
                        'type'       => 'creditcard',
                        'company'    => null,
                        'name'       => null,
                        'number'     => null,
                        'cvc'        => null,
                        'month'      => null,
                        'year'       => null,
                    ],
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'plan_id' => (string) $plan->id,
                    ],
                ]);

            if (!$response->successful()) {
                Log::error('Moyasar payment init failed', ['body' => $response->body()]);
                throw new \Exception('Moyasar API error: ' . $response->body());
            }

            $payment    = $response->json();
            // Moyasar's payment URL is a single string at source.transaction_url,
            // not an array — the old code here `foreach`'d over it as if it were
            // one, which is either a no-op or a TypeError depending on the SDK
            // version, and always fell through to the checks below anyway.
            $paymentUrl = $payment['source']['transaction_url'] ?? null;

            // Fallback: use Moyasar hosted payment page
            if (!$paymentUrl && isset($payment['id'])) {
                $paymentUrl = 'https://api.moyasar.com/v1/payments/' . $payment['id'] . '/pay';
            }

            if (!$paymentUrl) {
                throw new \Exception('No payment URL returned from Moyasar.');
            }

            return response()->json(['url' => $paymentUrl, 'payment_id' => $payment['id'] ?? null]);

        } catch (\Exception $e) {
            Log::error('Moyasar subscribe error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Moyasar payment error: ' . $e->getMessage()], 500);
        }
    }

    public function subscribeMyfatoorah(Request $request): JsonResponse
    {
        $request->validate(['plan_id' => ['required', 'exists:plans,id']]);
        $plan = Plan::findOrFail($request->integer('plan_id'));
        $user = $request->user();
        if (config('services.central_payments.enabled')) {
            return $this->subscribeCentralMyfatoorah($user, $plan);
        }
        $gateway = MyFatoorahService::configured();
        if (!$gateway || (float) $plan->price <= 0) {
            return response()->json(['message' => 'MyFatoorah is not configured for paid checkout.'], 503);
        }

        $checkout = MyFatoorahCheckoutSession::create([
            'user_id' => $user->id, 'plan_id' => $plan->id, 'amount' => $plan->price,
            'currency' => strtoupper((string) data_get($gateway->setting()->additional_settings, 'currency', 'SAR')),
            'status' => 'pending',
        ]);
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        try {
            $invoice = $gateway->sendPayment([
                'CustomerName' => $user->name ?: $user->email,
                'CustomerEmail' => $user->email,
                'InvoiceValue' => (float) $plan->price,
                'DisplayCurrencyIso' => $checkout->currency,
                'NotificationOption' => 'LNK',
                'Language' => app()->getLocale() === 'ar' ? 'AR' : 'EN',
                'CustomerReference' => $checkout->id,
                'UserDefinedField' => $checkout->id,
                'CallBackUrl' => $frontendUrl . '/billing/success?gateway=myfatoorah&checkout_id=' . $checkout->id,
                'ErrorUrl' => $frontendUrl . '/billing?status=cancel&gateway=myfatoorah',
                'WebhookUrl' => url('/api/webhooks/myfatoorah'),
            ]);
            $checkout->update(['invoice_id' => (string) $invoice['InvoiceId'], 'gateway_response' => ['invoice_status' => $invoice['InvoiceStatus'] ?? null]]);
            return response()->json(['url' => $invoice['InvoiceURL'], 'invoice_id' => (string) $invoice['InvoiceId']]);
        } catch (\Throwable $e) {
            $checkout->update(['status' => 'failed']);
            Log::error('MyFatoorah subscription invoice creation failed', ['checkout_id' => $checkout->id, 'exception' => get_class($e)]);
            return response()->json(['message' => 'Could not start MyFatoorah checkout. Verify the gateway settings and try again.'], 502);
        }
    }

    private function subscribeCentralMyfatoorah(\App\Models\User $user, Plan $plan): JsonResponse
    {
        if ((float) $plan->price <= 0) {
            return response()->json(['message' => 'Free plans do not require payment.'], 422);
        }
        $checkout = MyFatoorahCheckoutSession::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'amount' => $plan->price,
            'currency' => 'SAR',
            'status' => 'pending',
        ]);
        try {
            $payment = app(\App\Services\CentralPaymentClientService::class)
                ->createHostedPayment((string) $checkout->id, 'nazstudio-subscription-' . $checkout->id);
            $checkout->update(['gateway_response' => ['central_payment_id' => $payment['central_payment_id']]]);
            return response()->json([
                'url' => $payment['payment_url'],
                'invoice_id' => $payment['central_payment_id'],
                'checkout_id' => $checkout->id,
            ]);
        } catch (\Throwable $e) {
            $checkout->update(['status' => 'failed']);
            Log::error('Central MyFatoorah subscription checkout failed', [
                'checkout_id' => $checkout->id,
                'exception_type' => get_class($e),
            ]);
            return response()->json(['message' => 'Could not start payment. Please try again or contact support.'], 502);
        }
    }

    public function myfatoorahCheckoutStatus(Request $request, string $checkoutId): JsonResponse
    {
        $checkout = MyFatoorahCheckoutSession::whereKey($checkoutId)
            ->where('user_id', $request->user()->id)
            ->first();
        if (!$checkout) return response()->json(['message' => 'Checkout not found.'], 404);
        return response()->json(['status' => $checkout->status, 'purpose' => $checkout->purpose ?: 'subscription']);
    }

    /**
     * Upgrade to a higher-priced plan.
     */
    public function upgradePlan(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);
        // The legacy path canceled the paid plan and activated an unpaid
        // replacement. Until changes go through a verified gateway checkout,
        // fail closed and leave the current subscription untouched.
        Log::warning('Subscription upgrade unavailable; refusing unverified plan change', [
            'user_id' => $request->user()->id,
            'target_plan_id' => (int) $request->plan_id,
        ]);
        return response()->json([
            'message' => 'Plan changes are temporarily unavailable. Your current subscription has not been changed.',
            'code' => 'SUBSCRIPTION_CHANGE_UNAVAILABLE',
        ], 503);
    }

    /**
     * Downgrade to a lower-priced plan (takes effect at end of current period).
     */
    public function downgradePlan(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);
        Log::warning('Subscription downgrade unavailable; refusing unsupported schedule', [
            'user_id' => $request->user()->id,
            'target_plan_id' => (int) $request->plan_id,
        ]);
        return response()->json([
            'message' => 'Plan changes are temporarily unavailable. Your current subscription has not been changed.',
            'code' => 'SUBSCRIPTION_CHANGE_UNAVAILABLE',
        ], 503);
    }

    public function cancelSubscription(Request $request): JsonResponse
    {
        $subscription = $request->user()->activeSubscription();

        if (!$subscription) {
            return response()->json(['message' => 'No active subscription found.'], 400);
        }

        try {
            if ($subscription->gateway === 'stripe') {
                $stripeSettings = PaymentSetting::getStripe();
                if ($stripeSettings && $stripeSettings->secret_key && !str_starts_with($subscription->gateway_subscription_id, 'mock_')) {
                    \Stripe\Stripe::setApiKey($stripeSettings->secret_key);
                    \Stripe\Subscription::update($subscription->gateway_subscription_id, [
                        'cancel_at_period_end' => true
                    ]);
                }
            } elseif ($subscription->gateway === 'paypal') {
                $paypalSettings = PaymentSetting::getPaypal();
                if ($paypalSettings && $paypalSettings->public_key && $paypalSettings->secret_key && !str_starts_with($subscription->gateway_subscription_id, 'mock_')) {
                    $baseUrl = $paypalSettings->is_sandbox
                        ? 'https://api-m.sandbox.paypal.com'
                        : 'https://api-m.paypal.com';

                    $tokenResponse = Http::withBasicAuth($paypalSettings->public_key, $paypalSettings->secret_key)
                        ->asForm()
                        ->post("{$baseUrl}/v1/oauth2/token", [
                            'grant_type' => 'client_credentials',
                        ]);

                    if ($tokenResponse->successful()) {
                        $accessToken = $tokenResponse->json('access_token');
                        Http::withToken($accessToken)
                            ->post("{$baseUrl}/v1/billing/subscriptions/{$subscription->gateway_subscription_id}/cancel", [
                                'reason' => 'User canceled subscription'
                            ]);
                    }
                }
            }

            $subscription->update([
                'status' => 'canceled',
                'canceled_at' => now(),
            ]);

            ActivityLog::log(
                action: 'subscription_canceled_by_user',
                userId: $request->user()->id,
                entityType: 'Subscription',
                entityId: $subscription->id
            );

            return response()->json([
                'message' => 'Subscription canceled successfully.',
                'subscription' => $subscription->fresh()
            ]);
        } catch (\Exception $e) {
            Log::error('Cancel subscription error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Cancellation error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get user's invoices.
     */
    public function invoices(Request $request): JsonResponse
    {
        $invoices = $request->user()
            ->invoices()
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($invoices);
    }

    /**
     * Download/view a single invoice.
     */
    public function downloadInvoice(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json(['invoice' => $invoice->load('subscription.plan')]);
    }

    /**
     * Create an invoice when a subscription is created.
     */
    private function createSubscriptionInvoice($user, $subscription, $plan, string $gateway): void
    {
        $invoice = Invoice::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'amount' => $plan->price,
            'currency' => 'USD',
            'status' => 'paid',
            'items' => [
                [
                    'name' => $plan->name . ' Plan (' . ucfirst($plan->billing_period) . ')',
                    'price' => $plan->price,
                    'type' => 'subscription',
                    'slug' => $plan->slug,
                ]
            ],
            'gateway' => $gateway,
            'issued_at' => now(),
            'paid_at' => now(),
        ]);

        $this->sendInvoiceEmail($user, $invoice);
    }

    /**
     * Send invoice email using the editable mail template system.
     */
    private function sendInvoiceEmail($user, Invoice $invoice): void
    {
        try {
            $template = MailTemplate::findByKey('invoice_created');
            if (!$template) {
                return;
            }

            $data = [
                'user_name' => $user->name,
                'invoice_number' => $invoice->invoice_number,
                'amount' => '$' . number_format($invoice->amount, 2),
                'plan_name' => $invoice->items[0]['name'] ?? 'N/A',
                'date' => $invoice->issued_at->format('M d, Y'),
                'status' => ucfirst($invoice->status),
            ];

            $subject = $template->renderSubject($data);
            $html = $template->renderHtml($data);

            Mail::html($html, function ($message) use ($user, $subject) {
                $message->to($user->email, $user->name)
                    ->subject($subject);
            });

            \App\Models\MailLog::create([
                'template_key' => 'invoice_created',
                'to_email' => $user->email,
                'subject' => $subject,
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Invoice email failed', ['error' => $e->getMessage(), 'invoice' => $invoice->id]);
        }
    }
}
