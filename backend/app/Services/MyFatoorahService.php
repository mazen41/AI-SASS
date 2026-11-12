<?php

namespace App\Services;

use App\Models\PaymentSetting;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MyFatoorahService
{
    public function __construct(private readonly PaymentSetting $setting) {}

    public static function configured(): ?self
    {
        $setting = PaymentSetting::getMyfatoorah();
        return $setting && $setting->is_enabled && $setting->secret_key && $setting->webhook_secret ? new self($setting) : null;
    }

    /** API-only operations (such as read-only status verification) do not require a webhook secret. */
    public static function apiConfigured(): ?self
    {
        $setting = PaymentSetting::getMyfatoorah();
        return $setting && $setting->is_enabled && $setting->secret_key ? new self($setting) : null;
    }

    public function setting(): PaymentSetting { return $this->setting; }

    public function baseUrl(): string
    {
        if ($this->setting->is_sandbox) return 'https://apitest.myfatoorah.com';
        $country = strtoupper((string) data_get($this->setting->additional_settings, 'country', 'SA'));
        return match ($country) {
            'KW' => 'https://api-kw.myfatoorah.com', 'BH' => 'https://api-bh.myfatoorah.com',
            'AE' => 'https://api-ae.myfatoorah.com', 'QA' => 'https://api-qa.myfatoorah.com',
            'OM' => 'https://api-om.myfatoorah.com', 'EG' => 'https://api-eg.myfatoorah.com',
            default => 'https://api-sa.myfatoorah.com',
        };
    }

    public function sendPayment(array $payload): array
    {
        $response = Http::withToken($this->setting->secret_key)->acceptJson()->asJson()->timeout(25)
            ->post($this->baseUrl() . '/v2/SendPayment', $payload);
        if (!$response->successful() || $response->json('IsSuccess') !== true) {
            throw new RuntimeException('MyFatoorah invoice creation was rejected.');
        }
        $data = $response->json('Data', []);
        if (empty($data['InvoiceId']) || empty($data['InvoiceURL'])) {
            throw new RuntimeException('MyFatoorah did not return an invoice ID and checkout URL.');
        }
        return $data;
    }

    public function getInvoiceStatus(string $invoiceId): array
    {
        $response = Http::withToken($this->setting->secret_key)->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl() . '/v2/GetPaymentStatus', ['Key' => $invoiceId, 'KeyType' => 'InvoiceId']);
        if (!$response->successful() || $response->json('IsSuccess') !== true) {
            throw new RuntimeException('MyFatoorah payment status could not be verified.');
        }
        return (array) $response->json('Data', []);
    }

    public static function validPaymentStatusSignature(array $payload, string $secret, string $signature): bool
    {
        $data = (array) data_get($payload, 'Data', []);
        $invoice = (array) ($data['Invoice'] ?? []);
        $transaction = (array) ($data['Transaction'] ?? []);
        $ordered = [
            'Invoice.Id' => $invoice['Id'] ?? '',
            'Invoice.Status' => $invoice['Status'] ?? '',
            'Transaction.Status' => $transaction['Status'] ?? '',
            'Transaction.PaymentId' => $transaction['PaymentId'] ?? '',
            'Invoice.ExternalIdentifier' => $invoice['ExternalIdentifier'] ?? '',
        ];
        $message = implode(',', array_map(static fn ($key, $value) => $key . '=' . (string) $value, array_keys($ordered), array_values($ordered)));
        return hash_equals(base64_encode(hash_hmac('sha256', $message, $secret, true)), trim($signature));
    }
}
