<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateCentralPaymentRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $clientId = (string) config('services.central_payments.client_id');
        $secret = $request->header('X-Central-Payment-Notification') === '1'
            ? (string) config('services.central_payments.notification_secret')
            : (string) config('services.central_payments.hmac_secret');
        $timestamp = (string) $request->header('X-Central-Payment-Timestamp', '');
        $nonce = (string) $request->header('X-Central-Payment-Nonce', '');
        $signature = strtolower((string) $request->header('X-Central-Payment-Signature', ''));
        if ($clientId === '' || $secret === ''
            || !hash_equals($clientId, (string) $request->header('X-Central-Payment-Client', ''))
            || !ctype_digit($timestamp) || abs(now()->timestamp - (int) $timestamp) > 300
            || !preg_match('/^[A-Za-z0-9_-]{40,80}$/', $nonce)
            || !preg_match('/^[a-f0-9]{64}$/', $signature)) {
            return response()->json(['message' => 'Unauthenticated payment service request.'], 401);
        }

        $canonical = implode("\n", [
            strtoupper($request->method()),
            $request->getRequestUri(),
            $timestamp,
            $nonce,
            hash('sha256', $request->getContent()),
        ]);
        if (!hash_equals(hash_hmac('sha256', $canonical, $secret), $signature)) {
            return response()->json(['message' => 'Invalid payment service signature.'], 401);
        }
        if (!Cache::add('central-payment-nonce:' . hash('sha256', $nonce), true, now()->addMinutes(10))) {
            return response()->json(['message' => 'Request nonce has already been used.'], 409);
        }

        return $next($request);
    }
}
