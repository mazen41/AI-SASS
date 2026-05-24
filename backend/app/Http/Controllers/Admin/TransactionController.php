<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Transaction::with(['user:id,name,email', 'subscription.plan:id,name']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('gateway')) {
            $query->where('gateway', $request->gateway);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $transactions = $query->latest()->paginate($request->get('per_page', 15));

        return response()->json($transactions);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load(['user', 'subscription.plan']);

        return response()->json(['transaction' => $transaction]);
    }

    public function export(Request $request): JsonResponse
    {
        $query = Transaction::with(['user:id,name,email', 'subscription.plan:id,name']);

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $transactions = $query->get();

        $csv = "ID,User,Email,Amount,Currency,Gateway,Status,Type,Date\n";
        foreach ($transactions as $t) {
            $csv .= "{$t->id},{$t->user->name},{$t->user->email},{$t->amount},{$t->currency},{$t->gateway},{$t->status},{$t->type},{$t->created_at}\n";
        }

        return response()->json([
            'csv' => $csv,
            'filename' => 'transactions_' . now()->format('Y-m-d') . '.csv',
        ]);
    }
}
