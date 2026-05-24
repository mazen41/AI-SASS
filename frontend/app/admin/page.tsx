'use client';

import { useEffect, useState } from 'react';
import { apiGetAdminStats, DashboardStats } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiGetAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.users.total, icon: '👥', color: 'from-blue-500 to-cyan-500' },
    { label: 'Active Users', value: stats.users.active, icon: '✅', color: 'from-green-500 to-emerald-500' },
    { label: 'New This Month', value: stats.users.new_this_month, icon: '📈', color: 'from-purple-500 to-pink-500', change: stats.users.growth_percentage },
    { label: 'Active Subscriptions', value: stats.subscriptions.active, icon: '🔄', color: 'from-orange-500 to-yellow-500' },
    { label: 'Total Revenue', value: `$${parseFloat(stats.revenue.total || '0').toLocaleString()}`, icon: '💰', color: 'from-emerald-500 to-teal-500' },
    { label: 'Revenue This Month', value: `$${parseFloat(stats.revenue.this_month || '0').toLocaleString()}`, icon: '📊', color: 'from-pink-500 to-rose-500', change: stats.revenue.growth_percentage },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                {card.change !== undefined && (
                  <p className={`text-sm mt-1 ${card.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {card.change >= 0 ? '↑' : '↓'} {Math.abs(card.change)}% from last month
                  </p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Gateway */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Revenue by Gateway</h3>
          <div className="space-y-4">
            {stats.revenue.by_gateway.length > 0 ? (
              stats.revenue.by_gateway.map((gateway, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      gateway.gateway === 'stripe' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {gateway.gateway === 'stripe' ? '💳' : '🅿️'}
                    </div>
                    <div>
                      <p className="text-white capitalize">{gateway.gateway}</p>
                      <p className="text-gray-400 text-sm">{gateway.count} transactions</p>
                    </div>
                  </div>
                  <p className="text-white font-semibold">${parseFloat(gateway.total || '0').toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No transactions yet</p>
            )}
          </div>
        </div>

        {/* Subscriptions by Plan */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Subscriptions by Plan</h3>
          <div className="space-y-4">
            {stats.subscriptions.by_plan.length > 0 ? (
              stats.subscriptions.by_plan.map((plan, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-white">{plan.name}</p>
                    <p className="text-gray-400 text-sm">${plan.price}/mo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${Math.min((plan.active_subscriptions_count / Math.max(stats.subscriptions.active, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold w-8 text-right">{plan.active_subscriptions_count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No plans configured</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {stats.recent_activity.length > 0 ? (
            stats.recent_activity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  {activity.action.includes('login') ? '🔐' : 
                   activity.action.includes('user') ? '👤' :
                   activity.action.includes('subscription') ? '🔄' :
                   activity.action.includes('payment') ? '💳' : '📝'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className="font-medium">{activity.user?.name || 'System'}</span>
                    {' '}<span className="text-gray-400">{activity.action.replace(/_/g, ' ')}</span>
                  </p>
                  <p className="text-gray-500 text-xs">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
