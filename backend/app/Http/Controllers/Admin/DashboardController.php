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
        $stats = Cache::remember('dashboard_stats', 300, function () {
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

            $revenueThisMonth = Transaction::where('status', 'completed')
                ->where('created_at', '>=', $startOfMonth)
                ->sum('amount');
            $revenueLastMonth = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
                ->sum('amount');
            $totalRevenue = Transaction::where('status', 'completed')->sum('amount');

            $monthlyRevenue = Transaction::where('status', 'completed')
                ->where('created_at', '>=', $now->copy()->subMonths(12))
                ->select(
                    DB::raw('YEAR(created_at) as year'),
                    DB::raw('MONTH(created_at) as month'),
                    DB::raw('SUM(amount) as total')
                )
                ->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get();

            $userGrowth = User::where('created_at', '>=', $now->copy()->subMonths(12))
                ->select(
                    DB::raw('YEAR(created_at) as year'),
                    DB::raw('MONTH(created_at) as month'),
                    DB::raw('COUNT(*) as total')
                )
                ->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get();

            $subscriptionsByPlan = Plan::withCount(['activeSubscriptions'])
                ->where('is_active', true)
                ->get(['id', 'name', 'price']);

            $revenueByGateway = Transaction::where('status', 'completed')
                ->select('gateway', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
                ->groupBy('gateway')
                ->get();

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
                    'growth_percentage' => $newUsersLastMonth > 0
                        ? round((($newUsersThisMonth - $newUsersLastMonth) / $newUsersLastMonth) * 100, 1)
                        : 100,
                ],
                'subscriptions' => [
                    'active' => $activeSubscriptions,
                    'total' => $totalSubscriptions,
                    'by_plan' => $subscriptionsByPlan,
                ],
                'revenue' => [
                    'total' => $totalRevenue,
                    'this_month' => $revenueThisMonth,
                    'last_month' => $revenueLastMonth,
                    'growth_percentage' => $revenueLastMonth > 0
                        ? round((($revenueThisMonth - $revenueLastMonth) / $revenueLastMonth) * 100, 1)
                        : 100,
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
