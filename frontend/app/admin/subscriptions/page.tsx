'use client';

import { useEffect, useState } from 'react';
import { apiGetSubscriptions, apiCancelSubscription, Subscription, PaginatedResponse } from '@/lib/api';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<PaginatedResponse<Subscription> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadSubscriptions = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page: page.toString() };
        if (statusFilter) params.status = statusFilter;
        if (gatewayFilter) params.gateway = gatewayFilter;
        const data = await apiGetSubscriptions(params);
        setSubscriptions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSubscriptions();
  }, [page, statusFilter, gatewayFilter]);

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      await apiCancelSubscription(id);
      setPage(1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/50',
      canceled: 'bg-red-500/20 text-red-400 border-red-500/50',
      past_due: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      paused: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      trialing: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      expired: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };
    return colors[status] || colors.active;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
            <option value="paused">Paused</option>
            <option value="trialing">Trialing</option>
          </select>
          <select
            value={gatewayFilter}
            onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">All Gateways</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Gateway</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Period End</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                  </td>
                </tr>
              ) : subscriptions?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No subscriptions found</td>
                </tr>
              ) : (
                subscriptions?.data.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{sub.user?.name}</p>
                        <p className="text-gray-400 text-sm">{sub.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{sub.plan?.name}</p>
                      <p className="text-gray-400 text-sm">${sub.plan?.price}/mo</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        sub.gateway === 'stripe' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {sub.gateway}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sub.status === 'active' && (
                        <button
                          onClick={() => handleCancel(sub.id)}
                          className="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {subscriptions && subscriptions.last_page > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Page {subscriptions.current_page} of {subscriptions.last_page}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(subscriptions.last_page, p + 1))}
                disabled={page === subscriptions.last_page}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
