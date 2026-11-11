<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class CentralPaymentClientService
{
    public function createHostedPayment(string $orderId, string $idempotencyKey): array
    {
        $body = [
            'external_order_id' => $orderId,
            'idempotency_key' => $idempotencyKey,
        ];
        $response = $this->signedRequest('POST', '/api/v1/payments', $body);
        if (!$response->successful() || !is_string($response->json('checkout_url'))) {
            throw new RuntimeException('Central payment service did not return a checkout URL.');
        }
        return [
            'payment_url' => $response->json('checkout_url'),
            'central_payment_id' => $response->json('payment_id'),
            'status' => $response->json('status'),
        ];
    }

    public function getPayment(string $paymentUuid): array
    {
        $path = '/api/v1/payments/' . rawurlencode($paymentUuid);
        $response = $this->signedRequest('GET', $path);
        if (!$response->successful()) {
            throw new RuntimeException('Central payment status could not be retrieved.');
        }
        return (array) $response->json();
    }

    private function signedRequest(string $method, string $path, ?array $payload = null)
    {
        $clientId = (string) config('services.central_payments.client_id');
        $apiKey = (string) config('services.central_payments.api_key');
        $secret = (string) config('services.central_payments.hmac_secret');
        $baseUrl = rtrim((string) config('services.central_payments.api_url', ''), '/');
        if (in_array('', [$clientId, $apiKey, $secret, $baseUrl], true)) {
            throw new RuntimeException('Central payment client credentials are not configured.');
        }

        $body = $payload === null
            ? ''
            : json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $timestamp = (string) now()->timestamp;
        $nonce = Str::random(48);
        $canonical = implode("\n", [strtoupper($method), $path, $timestamp, $nonce, hash('sha256', $body)]);

        $request = Http::timeout(20)->withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'X-Payment-Client' => $clientId,
            'X-Payment-Timestamp' => $timestamp,
            'X-Payment-Nonce' => $nonce,
            'X-Payment-Signature' => hash_hmac('sha256', $canonical, $secret),
        ]);
        if ($payload !== null) $request = $request->withBody($body, 'application/json');

        return $request->send(strtoupper($method), $baseUrl . $path);
    }
}
