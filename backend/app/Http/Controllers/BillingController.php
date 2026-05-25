<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\PaymentSetting;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BillingController extends Controller
{
    public function plans(): JsonResponse
    {
        $plans = Plan::where('is_active', true)->orderBy('sort_order')->get();
        return response()->json(['plans' => $plans]);
    }

    public function activeSubscription(Request $request): JsonResponse
    {
        $subscription = $request->user()->activeSubscription();
        return response()->json([
            'subscription' => $subscription ? $subscription->load('plan') : null
        ]);
    }

    public function subscribeStripe(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $plan = Plan::find($request->plan_id);
        $user = $request->user();

        if (!$plan->stripe_price_id) {
            return response()->json(['message' => 'Stripe is not configured for this plan.'], 400);
        }

        $stripeSettings = PaymentSetting::getStripe();
        if (!$stripeSettings || !$stripeSettings->is_enabled || !$stripeSettings->secret_key) {
            return response()->json(['message' => 'Stripe checkout is currently unavailable.'], 400);
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
                'success_url' => 'http://localhost:3000/billing/success?gateway=stripe&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => 'http://localhost:3000/billing?status=cancel',
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

        if (!$plan->paypal_plan_id) {
            return response()->json(['message' => 'PayPal is not configured for this plan.'], 400);
        }

        $paypalSettings = PaymentSetting::getPaypal();
        if (!$paypalSettings || !$paypalSettings->is_enabled || !$paypalSettings->public_key || !$paypalSettings->secret_key) {
            return response()->json(['message' => 'PayPal checkout is currently unavailable.'], 400);
        }

        $baseUrl = $paypalSettings->is_sandbox
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        try {
            // 1. Get Access Token
            $tokenResponse = Http::withBasicAuth($paypalSettings->public_key, $paypalSettings->secret_key)
                ->asForm()
                ->post("{$baseUrl}/v1/oauth2/token", [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$tokenResponse->successful()) {
                throw new \Exception("PayPal OAuth authentication failed.");
            }

            $accessToken = $tokenResponse->json('access_token');

            // 2. Create Billing Subscription
            $subscriptionResponse = Http::withToken($accessToken)
                ->post("{$baseUrl}/v1/billing/subscriptions", [
                    'plan_id' => $plan->paypal_plan_id,
                    'custom_id' => (string) $user->id,
                    'application_context' => [
                        'brand_name' => 'StoryHero',
                        'locale' => 'en-US',
                        'shipping_preference' => 'NO_SHIPPING',
                        'user_action' => 'SUBSCRIBE_NOW',
                        'return_url' => 'http://localhost:3000/billing/success?gateway=paypal',
                        'cancel_url' => 'http://localhost:3000/billing?status=cancel',
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

    public function cancelSubscription(Request $request): JsonResponse
    {
        $subscription = $request->user()->activeSubscription();

        if (!$subscription) {
            return response()->json(['message' => 'No active subscription found.'], 400);
        }

        try {
            if ($subscription->gateway === 'stripe') {
                $stripeSettings = PaymentSetting::getStripe();
                if ($stripeSettings && $stripeSettings->secret_key) {
                    \Stripe\Stripe::setApiKey($stripeSettings->secret_key);
                    
                    // Cancel at period end to keep plan active until end of month
                    \Stripe\Subscription::update($subscription->gateway_subscription_id, [
                        'cancel_at_period_end' => true
                    ]);
                }
            } elseif ($subscription->gateway === 'paypal') {
                $paypalSettings = PaymentSetting::getPaypal();
                if ($paypalSettings && $paypalSettings->public_key && $paypalSettings->secret_key) {
                    $baseUrl = $paypalSettings->is_sandbox
                        ? 'https://api-m.sandbox.paypal.com'
                        : 'https://api-m.paypal.com';

                    // Obtain OAuth Token
                    $tokenResponse = Http::withBasicAuth($paypalSettings->public_key, $paypalSettings->secret_key)
                        ->asForm()
                        ->post("{$baseUrl}/v1/oauth2/token", [
                            'grant_type' => 'client_credentials',
                        ]);

                    if ($tokenResponse->successful()) {
                        $accessToken = $tokenResponse->json('access_token');
                        
                        // Cancel PayPal Subscription
                        Http::withToken($accessToken)
                            ->post("{$baseUrl}/v1/billing/subscriptions/{$subscription->gateway_subscription_id}/cancel", [
                                'reason' => 'User canceled subscription'
                            ]);
                    }
                }
            }

            // Update in local database
            $subscription->update([
                'status' => 'canceled',
                'canceled_at' => now(),
            ]);

            ActivityLog::log(
                userId: $request->user()->id,
                action: 'subscription_canceled_by_user',
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
}
