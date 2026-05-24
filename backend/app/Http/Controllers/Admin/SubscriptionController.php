<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Subscription::with(['user:id,name,email', 'plan:id,name,price']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('gateway')) {
            $query->where('gateway', $request->gateway);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $subscriptions = $query->latest()->paginate($request->get('per_page', 15));

        return response()->json($subscriptions);
    }

    public function show(Subscription $subscription): JsonResponse
    {
        $subscription->load(['user', 'plan', 'transactions']);

        return response()->json(['subscription' => $subscription]);
    }

    public function cancel(Subscription $subscription): JsonResponse
    {
        if ($subscription->status === 'canceled') {
            return response()->json([
                'message' => 'Subscription is already canceled.',
            ], 422);
        }

        $oldStatus = $subscription->status;
        $subscription->update([
            'status' => 'canceled',
            'canceled_at' => now(),
        ]);

        ActivityLog::log(
            'subscription_canceled',
            auth()->id(),
            'Subscription',
            $subscription->id,
            ['status' => $oldStatus],
            ['status' => 'canceled']
        );

        return response()->json([
            'message' => 'Subscription canceled successfully.',
            'subscription' => $subscription->fresh(),
        ]);
    }

    public function reactivate(Subscription $subscription): JsonResponse
    {
        if ($subscription->status !== 'canceled') {
            return response()->json([
                'message' => 'Only canceled subscriptions can be reactivated.',
            ], 422);
        }

        $oldStatus = $subscription->status;
        $subscription->update([
            'status' => 'active',
            'canceled_at' => null,
        ]);

        ActivityLog::log(
            'subscription_reactivated',
            auth()->id(),
            'Subscription',
            $subscription->id,
            ['status' => $oldStatus],
            ['status' => 'active']
        );

        return response()->json([
            'message' => 'Subscription reactivated successfully.',
            'subscription' => $subscription->fresh(),
        ]);
    }
}
