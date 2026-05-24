<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Plan::withCount(['subscriptions', 'activeSubscriptions']);

        if ($request->has('active_only') && $request->active_only) {
            $query->where('is_active', true);
        }

        $plans = $query->orderBy('sort_order')->get();

        return response()->json(['plans' => $plans]);
    }

    public function show(Plan $plan): JsonResponse
    {
        $plan->loadCount(['subscriptions', 'activeSubscriptions']);

        return response()->json(['plan' => $plan]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:plans'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'billing_period' => ['required', Rule::in(['monthly', 'yearly'])],
            'features' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'is_featured' => ['boolean'],
            'sort_order' => ['integer'],
            'stripe_price_id' => ['nullable', 'string'],
            'paypal_plan_id' => ['nullable', 'string'],
        ]);

        $plan = Plan::create($validated);

        ActivityLog::log('plan_created', auth()->id(), 'Plan', $plan->id, null, $plan->toArray());

        return response()->json([
            'message' => 'Plan created successfully.',
            'plan' => $plan,
        ], 201);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('plans')->ignore($plan->id)],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'billing_period' => ['sometimes', Rule::in(['monthly', 'yearly'])],
            'features' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'is_featured' => ['boolean'],
            'sort_order' => ['integer'],
            'stripe_price_id' => ['nullable', 'string'],
            'paypal_plan_id' => ['nullable', 'string'],
        ]);

        $oldValues = $plan->toArray();
        $plan->update($validated);

        ActivityLog::log('plan_updated', auth()->id(), 'Plan', $plan->id, $oldValues, $plan->fresh()->toArray());

        return response()->json([
            'message' => 'Plan updated successfully.',
            'plan' => $plan->fresh(),
        ]);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        if ($plan->subscriptions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete plan with active subscriptions.',
            ], 422);
        }

        ActivityLog::log('plan_deleted', auth()->id(), 'Plan', $plan->id, $plan->toArray(), null);

        $plan->delete();

        return response()->json([
            'message' => 'Plan deleted successfully.',
        ]);
    }
}
