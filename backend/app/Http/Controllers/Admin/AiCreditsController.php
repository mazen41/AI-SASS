<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiCreditPackage;
use App\Models\AiCreditTransaction;
use App\Models\AiCreditWallet;
use App\Models\AiGenerationPricing;
use App\Models\Plan;
use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AiCreditsController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()->with([
            'aiCreditWallet',
            'aiCreditTransactions' => fn ($query) => $query->limit(3),
            'subscriptions' => fn ($query) => $query->with('plan')->latest()->limit(1),
        ])
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', '%' . $request->q . '%')->orWhere('email', 'like', '%' . $request->q . '%')))
            ->latest()->paginate(25);
        return response()->json([
            'plans' => Plan::orderBy('sort_order')->get(['id', 'name', 'slug', 'price', 'monthly_credits', 'is_active']),
            'pricing' => AiGenerationPricing::orderBy('operation')->get(),
            'packages' => AiCreditPackage::orderBy('sort_order')->get(),
            'users' => $users,
            'analytics' => [
                'credits_consumed' => (int)AiCreditTransaction::where('type', 'consumed')->sum(DB::raw('ABS(amount)')),
                'credits_reserved' => (int)AiCreditWallet::sum('reserved_credits'),
                'credits_refunded' => (int)AiCreditTransaction::where('type', 'refund')->sum('amount'),
                'successful_generations' => AiCreditTransaction::where('type', 'consumed')->distinct('story_id')->count('story_id'),
                'failed_or_refunded_outputs' => AiCreditTransaction::where('type', 'refund')->count(),
                'subscription_revenue' => (float)\App\Models\Transaction::where('status', 'completed')->where('type', 'subscription')->sum('amount'),
                'credit_revenue' => (float)\App\Models\Transaction::where('status', 'completed')->where('type', 'one_time')->where('gateway_response', 'like', '%credit_package_id%')->sum('amount'),
            ],
            'recent_transactions' => AiCreditTransaction::with('user:id,name,email')->latest()->limit(50)->get(),
        ]);
    }

    public function updatePricing(Request $request, string $operation)
    {
        $data = $request->validate([
            'base_credits' => ['required', 'integer', 'min:0'],
            'per_unit_credits' => ['required', 'integer', 'min:0'],
            'unit' => ['required', 'string', 'max:32'],
            'is_enabled' => ['required', 'boolean'],
            'metadata' => ['nullable', 'array'],
        ]);
        $rule = AiGenerationPricing::where('operation', $operation)->firstOrFail();
        $rule->update([...$data, 'version' => $rule->version + 1]);
        \App\Models\ActivityLog::log('ai_generation_pricing_updated', auth()->id(), 'AiGenerationPricing', $rule->id, null, $rule->fresh()->toArray());
        return response()->json(['pricing' => $rule->fresh()]);
    }

    public function storePackage(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'], 'slug' => ['required', 'string', 'max:120', 'unique:ai_credit_packages,slug'],
            'credits' => ['required', 'integer', 'min:1'], 'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'], 'is_active' => ['required', 'boolean'], 'sort_order' => ['integer', 'min:0'],
        ]);
        return response()->json(['package' => AiCreditPackage::create($data)], 201);
    }

    public function updatePackage(Request $request, AiCreditPackage $package)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'slug' => ['sometimes', 'string', 'max:120', Rule::unique('ai_credit_packages', 'slug')->ignore($package->id)],
            'credits' => ['sometimes', 'integer', 'min:1'], 'price' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'], 'is_active' => ['sometimes', 'boolean'], 'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
        $package->update($data);
        return response()->json(['package' => $package->fresh()]);
    }

    public function adjust(Request $request, User $user, AiCreditService $credits)
    {
        $data = $request->validate(['amount' => ['required', 'integer', 'not_in:0'], 'reason' => ['required', 'string', 'max:500']]);
        try {
            $credits->adjust($user, $data['amount'], $data['reason'], $request->user());
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        return response()->json(['credits' => $credits->summarize($user)]);
    }
}
