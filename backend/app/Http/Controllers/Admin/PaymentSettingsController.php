<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = PaymentSetting::all()->keyBy('gateway');

        // Ensure both gateways exist
        $gateways = ['stripe', 'paypal'];
        foreach ($gateways as $gateway) {
            if (!isset($settings[$gateway])) {
                $settings[$gateway] = PaymentSetting::create([
                    'gateway' => $gateway,
                    'is_enabled' => false,
                    'is_sandbox' => true,
                ]);
            }
        }

        // Mask sensitive data for display
        $response = [];
        foreach ($settings as $gateway => $setting) {
            $response[$gateway] = [
                'id' => $setting->id,
                'gateway' => $setting->gateway,
                'is_enabled' => $setting->is_enabled,
                'is_sandbox' => $setting->is_sandbox,
                'public_key' => $setting->public_key,
                'has_secret_key' => !empty($setting->getRawOriginal('secret_key')),
                'has_webhook_secret' => !empty($setting->getRawOriginal('webhook_secret')),
                'webhook_url' => $setting->webhook_url ?? url("/api/webhooks/{$gateway}"),
                'additional_settings' => $setting->additional_settings,
            ];
        }

        return response()->json(['settings' => $response]);
    }

    public function update(Request $request, string $gateway): JsonResponse
    {
        if (!in_array($gateway, ['stripe', 'paypal'])) {
            return response()->json(['message' => 'Invalid gateway.'], 422);
        }

        $validated = $request->validate([
            'is_enabled' => ['boolean'],
            'is_sandbox' => ['boolean'],
            'public_key' => ['nullable', 'string'],
            'secret_key' => ['nullable', 'string'],
            'webhook_secret' => ['nullable', 'string'],
            'additional_settings' => ['nullable', 'array'],
        ]);

        $setting = PaymentSetting::firstOrCreate(
            ['gateway' => $gateway],
            ['is_enabled' => false, 'is_sandbox' => true]
        );

        $oldValues = [
            'is_enabled' => $setting->is_enabled,
            'is_sandbox' => $setting->is_sandbox,
            'public_key' => $setting->public_key,
        ];

        // Only update secret fields if provided
        $updateData = array_filter($validated, fn($v) => $v !== null);
        
        $setting->update($updateData);

        ActivityLog::log(
            'payment_settings_updated',
            auth()->id(),
            'PaymentSetting',
            $setting->id,
            $oldValues,
            [
                'is_enabled' => $setting->is_enabled,
                'is_sandbox' => $setting->is_sandbox,
                'gateway' => $gateway,
            ]
        );

        return response()->json([
            'message' => ucfirst($gateway) . ' settings updated successfully.',
            'setting' => [
                'id' => $setting->id,
                'gateway' => $setting->gateway,
                'is_enabled' => $setting->is_enabled,
                'is_sandbox' => $setting->is_sandbox,
                'public_key' => $setting->public_key,
                'has_secret_key' => !empty($setting->getRawOriginal('secret_key')),
                'has_webhook_secret' => !empty($setting->getRawOriginal('webhook_secret')),
                'webhook_url' => $setting->webhook_url ?? url("/api/webhooks/{$gateway}"),
            ],
        ]);
    }

    public function testConnection(string $gateway): JsonResponse
    {
        $setting = PaymentSetting::where('gateway', $gateway)->first();

        if (!$setting || !$setting->is_enabled) {
            return response()->json([
                'success' => false,
                'message' => ucfirst($gateway) . ' is not configured or enabled.',
            ]);
        }

        try {
            if ($gateway === 'stripe') {
                return $this->testStripeConnection($setting);
            } elseif ($gateway === 'paypal') {
                return $this->testPaypalConnection($setting);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unknown gateway.',
        ]);
    }

    private function testStripeConnection(PaymentSetting $setting): JsonResponse
    {
        \Stripe\Stripe::setApiKey($setting->secret_key);

        try {
            $account = \Stripe\Account::retrieve();
            return response()->json([
                'success' => true,
                'message' => 'Stripe connection successful.',
                'account' => [
                    'id' => $account->id,
                    'email' => $account->email,
                    'country' => $account->country,
                ],
            ]);
        } catch (\Stripe\Exception\AuthenticationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Stripe API key.',
            ]);
        }
    }

    private function testPaypalConnection(PaymentSetting $setting): JsonResponse
    {
        $baseUrl = $setting->is_sandbox
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        $response = \Illuminate\Support\Facades\Http::withBasicAuth(
            $setting->public_key,
            $setting->secret_key
        )->asForm()->post("{$baseUrl}/v1/oauth2/token", [
            'grant_type' => 'client_credentials',
        ]);

        if ($response->successful()) {
            return response()->json([
                'success' => true,
                'message' => 'PayPal connection successful.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'PayPal authentication failed.',
        ]);
    }
}
