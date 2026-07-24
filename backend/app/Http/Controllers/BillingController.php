<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanAddon;
use App\Models\Subscription;
use App\Models\Invoice;
use App\Models\PaymentSetting;
use App\Models\ActivityLog;
use App\Models\MailTemplate;
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
            return Plan::where('is_active', true)->orderBy('sort_order')->get();
        });

        $stripe  = PaymentSetting::getStripe();
        $paypal  = PaymentSetting::getPaypal();
        $moyasar = PaymentSetting::getMoyasar();
        $gateways = [];
        if ($stripe  && $stripe->is_enabled  && $stripe->secret_key)  $gateways[] = 'stripe';
        if ($paypal  && $paypal->is_enabled  && $paypal->secret_key)  $gateways[] = 'paypal';
        if ($moyasar && $moyasar->is_enabled && $moyasar->secret_key) $gateways[] = 'moyasar';

        return response()->json([
            'plans'    => $plans,
            'gateways' => $gateways,
        ]);
    }

    public function activeSubscription(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->activeSubscription();

        $stripe  = PaymentSetting::getStripe();
        $paypal  = PaymentSetting::getPaypal();
        $moyasar = PaymentSetting::getMoyasar();
        $gateways = [];
        if ($stripe  && $stripe->is_enabled  && $stripe->secret_key)  $gateways[] = 'stripe';
        if ($paypal  && $paypal->is_enabled  && $paypal->secret_key)  $gateways[] = 'paypal';
        if ($moyasar && $moyasar->is_enabled && $moyasar->secret_key) $gateways[] = 'moyasar';

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

        $addon = PlanAddon::findOrFail($request->addon_id);
        $user = $request->user();

        // Create invoice for addon purchase
        $invoice = Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'amount' => $addon->price,
            'currency' => 'USD',
            'status' => 'paid',
            'items' => [
                ['name' => $addon->name, 'price' => $addon->price, 'type' => 'addon', 'slug' => $addon->slug]
            ],
            'gateway' => 'mock',
            'issued_at' => now(),
            'paid_at' => now(),
        ]);

        $this->sendInvoiceEmail($user, $invoice);

        ActivityLog::log(
            action: 'addon_purchased',
            userId: $user->id,
            entityType: 'PlanAddon',
            entityId: $addon->id
        );

        return response()->json([
            'message' => 'Add-on purchased successfully.',
            'invoice' => $invoice,
        ]);
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
            // Mock Fallback Activation for Dev/Test environments
            $user->subscriptions()->where('status', 'active')->update(['status' => 'canceled', 'canceled_at' => now()]);

            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'gateway' => 'stripe',
                'gateway_subscription_id' => 'mock_stripe_sub_' . uniqid(),
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addDays(30),
            ]);

            $this->createSubscriptionInvoice($user, $subscription, $plan, 'stripe');

            return response()->json([
                'url' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/billing/success?gateway=stripe&mock=true'
            ]);
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
            // Mock Fallback Activation for Dev/Test environments
            $user->subscriptions()->where('status', 'active')->update(['status' => 'canceled', 'canceled_at' => now()]);

            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'gateway' => 'paypal',
                'gateway_subscription_id' => 'mock_paypal_sub_' . uniqid(),
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => now()->addDays(30),
            ]);

            $this->createSubscriptionInvoice($user, $subscription, $plan, 'paypal');

            return response()->json([
                'url' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/billing/success?gateway=paypal&mock=true'
            ]);
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

        // Fallback / mock when Moyasar is not configured
        if (!$setting || !$setting->is_enabled || !$setting->secret_key || !$setting->public_key) {
            $user->subscriptions()->where('status', 'active')->update([
                'status'      => 'canceled',
                'canceled_at' => now(),
            ]);

            $subscription = Subscription::create([
                'user_id'                 => $user->id,
                'plan_id'                 => $plan->id,
                'gateway'                 => 'moyasar',
                'gateway_subscription_id' => 'mock_moyasar_' . uniqid(),
                'status'                  => 'active',
                'current_period_start'    => now(),
                'current_period_end'      => now()->addDays(30),
            ]);

            $this->createSubscriptionInvoice($user, $subscription, $plan, 'moyasar');

            return response()->json([
                'url' => $frontendUrl . '/billing/success?gateway=moyasar&mock=true',
            ]);
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

            $payment     = $response->json();
            $paymentUrl  = null;

            // Moyasar returns links array — find the payment URL
            foreach ($payment['source']['transaction_url'] ?? [] as $link) {
                $paymentUrl = $link;
                break;
            }

            // Newer Moyasar API: payment URL is in source.transaction_url directly
            if (!$paymentUrl && isset($payment['source']['transaction_url'])) {
                $paymentUrl = $payment['source']['transaction_url'];
            }

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

    /**
     * Upgrade to a higher-priced plan.
     */
    public function upgradePlan(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $user = $request->user();
        $newPlan = Plan::findOrFail($request->plan_id);
        $currentSub = $user->activeSubscription();

        if (!$currentSub) {
            return response()->json(['message' => 'No active subscription to upgrade from.'], 400);
        }

        $currentPlan = $currentSub->plan;

        if ((float) $newPlan->price <= (float) $currentPlan->price) {
            return response()->json(['message' => 'New plan must be higher-priced for an upgrade. Use downgrade instead.'], 400);
        }

        // Cancel old subscription
        $currentSub->update(['status' => 'canceled', 'canceled_at' => now()]);

        // Create new subscription immediately
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $newPlan->id,
            'gateway' => $currentSub->gateway,
            'gateway_subscription_id' => 'upgrade_' . uniqid(),
            'status' => 'active',
            'current_period_start' => now(),
            'current_period_end' => now()->addDays(30),
        ]);

        $this->createSubscriptionInvoice($user, $subscription, $newPlan, $currentSub->gateway);

        ActivityLog::log(
            action: 'subscription_upgraded',
            userId: $user->id,
            entityType: 'Subscription',
            entityId: $subscription->id,
            oldValues: ['plan' => $currentPlan->name, 'price' => $currentPlan->price],
            newValues: ['plan' => $newPlan->name, 'price' => $newPlan->price]
        );

        return response()->json([
            'message' => 'Plan upgraded successfully to ' . $newPlan->name,
            'subscription' => $subscription->load('plan'),
        ]);
    }

    /**
     * Downgrade to a lower-priced plan (takes effect at end of current period).
     */
    public function downgradePlan(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $user = $request->user();
        $newPlan = Plan::findOrFail($request->plan_id);
        $currentSub = $user->activeSubscription();

        if (!$currentSub) {
            return response()->json(['message' => 'No active subscription to downgrade from.'], 400);
        }

        $currentPlan = $currentSub->plan;

        if ((float) $newPlan->price >= (float) $currentPlan->price) {
            return response()->json(['message' => 'New plan must be lower-priced for a downgrade. Use upgrade instead.'], 400);
        }

        // Schedule downgrade: cancel current at period end, create pending new one
        $currentSub->update([
            'status' => 'canceled',
            'canceled_at' => $currentSub->current_period_end ?? now(),
        ]);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $newPlan->id,
            'gateway' => $currentSub->gateway,
            'gateway_subscription_id' => 'downgrade_' . uniqid(),
            'status' => 'active',
            'current_period_start' => $currentSub->current_period_end ?? now(),
            'current_period_end' => ($currentSub->current_period_end ?? now())->copy()->addDays(30),
        ]);

        $this->createSubscriptionInvoice($user, $subscription, $newPlan, $currentSub->gateway);

        ActivityLog::log(
            action: 'subscription_downgraded',
            userId: $user->id,
            entityType: 'Subscription',
            entityId: $subscription->id,
            oldValues: ['plan' => $currentPlan->name, 'price' => $currentPlan->price],
            newValues: ['plan' => $newPlan->name, 'price' => $newPlan->price]
        );

        return response()->json([
            'message' => 'Plan downgraded to ' . $newPlan->name . '. Changes take effect at end of current billing period.',
            'subscription' => $subscription->load('plan'),
        ]);
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
