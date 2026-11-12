<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\Plan;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $stats = Cache::remember('dashboard_stats', 60, function () {
            $now = Carbon::now();
            $startOfMonth = $now->copy()->startOfMonth();
            $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
            $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

            $totalUsers = User::count();
            $newUsersThisMonth = User::where('created_at', '>=', $startOfMonth)->count();
            $newUsersLastMonth = User::whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count();
            $activeUsers = User::where('status', 'active')->count();

            $activeSubscriptions = Subscription::where('status', 'active')->count();
            $totalSubscriptions = Subscription::count();

            $sales = Transaction::where('status', 'completed')->where('type', '!=', 'refund');
            $revenueThisMonthByCurrency = (clone $sales)
                ->where('created_at', '>=', $startOfMonth)
                ->select('currency', DB::raw('SUM(amount) as total'))
                ->groupBy('currency')->get();
            $revenueLastMonthByCurrency = (clone $sales)
                ->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
                ->select('currency', DB::raw('SUM(amount) as total'))
                ->groupBy('currency')->get();
            $totalRevenueByCurrency = (clone $sales)
                ->select('currency', DB::raw('SUM(amount) as total'))
                ->groupBy('currency')->get();

            $singleCurrencyTotal = static fn ($rows) => $rows->count() === 1 ? (string) $rows->first()->total : null;
            $growthPercentage = static fn ($current, $previous) => $previous > 0
                ? round((($current - $previous) / $previous) * 100, 1)
                : null;
            $yearExpression = DB::connection()->getDriverName() === 'sqlite'
                ? "CAST(strftime('%Y', created_at) AS INTEGER)"
                : 'YEAR(created_at)';
            $monthExpression = DB::connection()->getDriverName() === 'sqlite'
                ? "CAST(strftime('%m', created_at) AS INTEGER)"
                : 'MONTH(created_at)';

            $monthlyRevenue = (clone $sales)
                ->where('created_at', '>=', $now->copy()->subMonths(12))
                ->select(
                    DB::raw("{$yearExpression} as year"),
                    DB::raw("{$monthExpression} as month"),
                    'currency',
                    DB::raw('SUM(amount) as total')
                )
                ->groupBy('year', 'month', 'currency')
                ->orderBy('year')
                ->orderBy('month')
                ->get();

            $userGrowth = User::where('created_at', '>=', $now->copy()->subMonths(12))
                ->select(
                    DB::raw("{$yearExpression} as year"),
                    DB::raw("{$monthExpression} as month"),
                    DB::raw('COUNT(*) as total')
                )
                ->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get();

            $subscriptionsByPlan = Plan::withCount(['activeSubscriptions'])
                ->where('is_active', true)
                ->get(['id', 'name', 'price', 'billing_period']);

            $revenueByGateway = (clone $sales)
                ->select('gateway', 'currency', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
                ->groupBy('gateway', 'currency')
                ->get();

            $refundsByCurrency = Transaction::where(function ($query) {
                $query->where('type', 'refund')->orWhere('status', 'refunded');
            })->select('currency', DB::raw('SUM(ABS(amount)) as total'), DB::raw('COUNT(*) as count'))
                ->groupBy('currency')->get();

            $recentActivity = ActivityLog::with('user:id,name,email')
                ->latest()
                ->take(10)
                ->get();

            return [
                'users' => [
                    'total' => $totalUsers,
                    'active' => $activeUsers,
                    'new_this_month' => $newUsersThisMonth,
                    'new_last_month' => $newUsersLastMonth,
                    'growth_percentage' => $growthPercentage($newUsersThisMonth, $newUsersLastMonth),
                ],
                'subscriptions' => [
                    'active' => $activeSubscriptions,
                    'total' => $totalSubscriptions,
                    'by_plan' => $subscriptionsByPlan,
                ],
                'revenue' => [
                    // Scalar values are available only if all included payments share one currency.
                    'total' => $singleCurrencyTotal($totalRevenueByCurrency),
                    'this_month' => $singleCurrencyTotal($revenueThisMonthByCurrency),
                    'last_month' => $singleCurrencyTotal($revenueLastMonthByCurrency),
                    'growth_percentage' => $revenueLastMonthByCurrency->count() === 1 && $revenueThisMonthByCurrency->count() === 1
                        && $revenueLastMonthByCurrency->first()->currency === $revenueThisMonthByCurrency->first()->currency
                            ? $growthPercentage((float) $revenueThisMonthByCurrency->first()->total, (float) $revenueLastMonthByCurrency->first()->total)
                            : null,
                    'total_by_currency' => $totalRevenueByCurrency,
                    'this_month_by_currency' => $revenueThisMonthByCurrency,
                    'last_month_by_currency' => $revenueLastMonthByCurrency,
                    'refunds_by_currency' => $refundsByCurrency,
                    'by_gateway' => $revenueByGateway,
                ],
                'charts' => [
                    'monthly_revenue' => $monthlyRevenue,
                    'user_growth' => $userGrowth,
                ],
                'recent_activity' => $recentActivity,
            ];
        });

        return response()->json($stats);
    }
}
