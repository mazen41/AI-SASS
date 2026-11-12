<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Plan::withCount(['subscriptions', 'activeSubscriptions']);

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('slug', 'like', $search)
                  ->orWhere('description', 'like', $search);
            });
        }

        $plans = $query->orderBy('sort_order')->orderBy('id')->get();

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
            'slug' => ['required', 'string', 'max:255', 'unique:plans,slug'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'yearly_price' => ['nullable', 'numeric', 'min:0'],
            'monthly_credits' => ['required', 'integer', 'min:0'],
            'story_limit' => ['nullable', 'integer', 'min:0'],
            'video_limit' => ['nullable', 'integer', 'min:0'],
            'daily_story_limit' => ['nullable', 'integer', 'min:0'],
            'daily_video_limit' => ['nullable', 'integer', 'min:0'],
            'billing_period' => ['required', Rule::in(['monthly', 'yearly'])],
            'icon' => ['nullable', 'string', 'max:50'],
            'badge' => ['nullable', 'string', 'max:50'],
            'trial_days' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string'],
            'capabilities' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'is_public' => ['boolean'],
            'is_featured' => ['boolean'],
            'sort_order' => ['nullable', 'integer'],
            'stripe_price_id' => ['nullable', 'string', 'max:255'],
            'paypal_plan_id' => ['nullable', 'string', 'max:255'],
            'moyasar_product_id' => ['nullable', 'string', 'max:255'],
            'myfatoorah_product_id' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['sort_order'] = $validated['sort_order'] ?? ((int)Plan::max('sort_order') + 1);
        $validated['story_limit'] = $validated['story_limit'] ?? 0;
        $validated['video_limit'] = $validated['video_limit'] ?? 0;
        $validated['daily_story_limit'] = $validated['daily_story_limit'] ?? 0;
        $validated['daily_video_limit'] = $validated['daily_video_limit'] ?? 0;

        $plan = Plan::create($validated);

        Cache::forget('active_plans');

        ActivityLog::log('plan_created', auth()->id(), 'Plan', $plan->id, null, $plan->toArray());

        return response()->json([
            'message' => 'Plan created successfully.',
            'plan' => $plan->fresh()->loadCount(['subscriptions', 'activeSubscriptions']),
        ], 201);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('plans', 'slug')->ignore($plan->id)],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'yearly_price' => ['nullable', 'numeric', 'min:0'],
            'monthly_credits' => ['sometimes', 'integer', 'min:0'],
            'story_limit' => ['nullable', 'integer', 'min:0'],
            'video_limit' => ['nullable', 'integer', 'min:0'],
            'daily_story_limit' => ['nullable', 'integer', 'min:0'],
            'daily_video_limit' => ['nullable', 'integer', 'min:0'],
            'billing_period' => ['sometimes', Rule::in(['monthly', 'yearly'])],
            'icon' => ['nullable', 'string', 'max:50'],
            'badge' => ['nullable', 'string', 'max:50'],
            'trial_days' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string'],
            'capabilities' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'is_public' => ['boolean'],
            'is_featured' => ['boolean'],
            'sort_order' => ['nullable', 'integer'],
            'stripe_price_id' => ['nullable', 'string', 'max:255'],
            'paypal_plan_id' => ['nullable', 'string', 'max:255'],
            'moyasar_product_id' => ['nullable', 'string', 'max:255'],
            'myfatoorah_product_id' => ['nullable', 'string', 'max:255'],
        ]);

        $oldValues = $plan->toArray();
        $plan->update($validated);

        Cache::forget('active_plans');

        ActivityLog::log('plan_updated', auth()->id(), 'Plan', $plan->id, $oldValues, $plan->fresh()->toArray());

        return response()->json([
            'message' => 'Plan updated successfully.',
            'plan' => $plan->fresh()->loadCount(['subscriptions', 'activeSubscriptions']),
        ]);
    }

    public function duplicate(Plan $plan): JsonResponse
    {
        $baseSlug = $plan->slug . '-copy';
        $slug = $baseSlug;
        $counter = 1;
        while (Plan::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $data = $plan->replicate(['subscriptions_count', 'active_subscriptions_count'])->toArray();
        $data['name'] = $plan->name . ' (Copy)';
        $data['slug'] = $slug;
        $data['is_public'] = false; // Keep unpublished until admin activates
        $data['sort_order'] = (int)Plan::max('sort_order') + 1;
        unset($data['id'], $data['created_at'], $data['updated_at']);

        $copy = Plan::create($data);

        Cache::forget('active_plans');

        ActivityLog::log('plan_duplicated', auth()->id(), 'Plan', $copy->id, ['source_plan_id' => $plan->id], $copy->toArray());

        return response()->json([
            'message' => 'Plan duplicated successfully.',
            'plan' => $copy->fresh()->loadCount(['subscriptions', 'activeSubscriptions']),
        ], 201);
    }

    public function updateOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'orders' => ['required', 'array'],
            'orders.*.id' => ['required', 'integer', 'exists:plans,id'],
            'orders.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['orders'] as $item) {
                Plan::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });

        Cache::forget('active_plans');

        ActivityLog::log('plan_reordered', auth()->id(), 'Plan', null, null, $validated['orders']);

        $plans = Plan::withCount(['subscriptions', 'activeSubscriptions'])->orderBy('sort_order')->get();

        return response()->json([
            'message' => 'Plan display order updated successfully.',
            'plans' => $plans,
        ]);
    }

    public function archive(Plan $plan): JsonResponse
    {
        $oldValues = $plan->toArray();
        $plan->update([
            'is_active' => false,
            'is_public' => false,
        ]);

        Cache::forget('active_plans');

        ActivityLog::log('plan_archived', auth()->id(), 'Plan', $plan->id, $oldValues, $plan->fresh()->toArray());

        return response()->json([
            'message' => 'Plan archived successfully. Existing subscribers will retain their access.',
            'plan' => $plan->fresh()->loadCount(['subscriptions', 'activeSubscriptions']),
        ]);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        // Safe deletion guard: check if ANY subscription records exist
        if ($plan->subscriptions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete plan with subscription history. Please archive or deactivate the plan instead to preserve historical billing integrity.',
            ], 422);
        }

        $oldValues = $plan->toArray();
        ActivityLog::log('plan_deleted', auth()->id(), 'Plan', $plan->id, $oldValues, null);

        $plan->delete();
        Cache::forget('active_plans');

        return response()->json([
            'message' => 'Plan deleted successfully.',
        ]);
    }
}
