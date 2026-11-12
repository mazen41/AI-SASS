<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request, true);
        $query = Transaction::query()
            ->select(['id', 'user_id', 'subscription_id', 'gateway', 'gateway_transaction_id', 'amount', 'currency', 'status', 'type', 'created_at', 'updated_at'])
            ->with(['user:id,name,email', 'subscription:id,plan_id,status', 'subscription.plan:id,name']);
        $this->applyFilters($query, $filters);

        $transactions = $query->latest()->paginate($filters['per_page'] ?? 15);

        return response()->json($transactions);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load(['user:id,name,email', 'subscription:id,plan_id,status', 'subscription.plan:id,name']);

        return response()->json(['transaction' => [
            'id' => $transaction->id,
            'user_id' => $transaction->user_id,
            'subscription_id' => $transaction->subscription_id,
            'gateway' => $transaction->gateway,
            'gateway_transaction_id' => $transaction->gateway_transaction_id,
            'amount' => $transaction->amount,
            'currency' => $transaction->currency,
            'status' => $transaction->status,
            'type' => $transaction->type,
            'created_at' => $transaction->created_at,
            'updated_at' => $transaction->updated_at,
            'user' => $transaction->user?->only(['id', 'name', 'email']),
            'subscription' => $transaction->subscription ? [
                'id' => $transaction->subscription->id,
                'status' => $transaction->subscription->status,
                'plan' => $transaction->subscription->plan?->only(['id', 'name']),
            ] : null,
        ]]);
    }

    public function export(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request, false);
        $query = Transaction::query()
            ->select(['id', 'user_id', 'gateway', 'amount', 'currency', 'status', 'type', 'created_at'])
            ->with('user:id,name,email');
        $this->applyFilters($query, $filters);

        $stream = fopen('php://temp', 'r+');
        fputcsv($stream, ['ID', 'User', 'Email', 'Amount', 'Currency', 'Gateway', 'Status', 'Type', 'Date']);
        foreach ($query->latest()->cursor() as $transaction) {
            fputcsv($stream, [
                $transaction->id,
                $this->safeSpreadsheetCell($transaction->user?->name ?? ''),
                $this->safeSpreadsheetCell($transaction->user?->email ?? ''),
                $transaction->amount,
                $transaction->currency,
                $transaction->gateway,
                $transaction->status,
                $transaction->type,
                $transaction->created_at?->toISOString(),
            ]);
        }
        rewind($stream);
        $csv = stream_get_contents($stream) ?: '';
        fclose($stream);

        return response()->json([
            'csv' => $csv,
            'filename' => 'transactions_' . now()->format('Y-m-d') . '.csv',
        ]);
    }

    /** Internal ledger summary. Amounts are grouped by currency and never combined across currencies. */
    public function reconciliation(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request, false);
        $query = Transaction::query();
        $this->applyFilters($query, $filters);

        $byCurrencyAndStatus = (clone $query)
            ->select('currency', 'status')
            ->selectRaw('COUNT(*) as transaction_count')
            ->selectRaw('COALESCE(SUM(amount), 0) as amount_total')
            ->groupBy('currency', 'status')
            ->orderBy('currency')
            ->orderBy('status')
            ->get();

        $stalePending = (clone $query)->where('status', 'pending')->where('created_at', '<', now()->subMinutes(30))->count();

        return response()->json([
            'source' => 'internal_transaction_ledger',
            'currency_status_totals' => $byCurrencyAndStatus,
            'stale_pending_count' => $stalePending,
            'generated_at' => now()->toISOString(),
            'note' => 'These totals summarize local transaction records. They do not confirm settlement against the payment provider or bank.',
        ]);
    }

    private function validatedFilters(Request $request, bool $includePagination): array
    {
        $rules = [
            'status' => ['sometimes', Rule::in(['pending', 'completed', 'failed', 'refunded'])],
            'gateway' => ['sometimes', 'string', 'max:40'],
            'type' => ['sometimes', Rule::in(['subscription', 'one_time', 'refund'])],
            'user_id' => ['sometimes', 'integer', 'min:1'],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
        ];
        if ($includePagination) $rules['per_page'] = ['sometimes', 'integer', 'min:1', 'max:100'];

        return $request->validate($rules);
    }

    private function applyFilters($query, array $filters): void
    {
        foreach (['status', 'gateway', 'type', 'user_id'] as $key) {
            if (array_key_exists($key, $filters)) $query->where($key, $filters[$key]);
        }
        if (isset($filters['date_from'])) $query->whereDate('created_at', '>=', $filters['date_from']);
        if (isset($filters['date_to'])) $query->whereDate('created_at', '<=', $filters['date_to']);
    }

    private function safeSpreadsheetCell(string $value): string
    {
        return preg_match('/^[\s]*[=+@\-]/u', $value) ? "'" . $value : $value;
    }
}
