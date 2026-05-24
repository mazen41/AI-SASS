'use client';

import { useEffect, useState } from 'react';
import { apiGetActivityLogs, ActivityLog, PaginatedResponse } from '@/lib/api';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<PaginatedResponse<ActivityLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page: page.toString() };
        if (actionFilter) params.action = actionFilter;
        const data = await apiGetActivityLogs(params);
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [page, actionFilter]);

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return '🔐';
    if (action.includes('user')) return '👤';
    if (action.includes('subscription')) return '🔄';
    if (action.includes('payment')) return '💳';
    if (action.includes('plan')) return '📋';
    if (action.includes('settings')) return '⚙️';
    return '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'text-green-400';
    if (action.includes('deleted')) return 'text-red-400';
    if (action.includes('updated') || action.includes('activated')) return 'text-blue-400';
    if (action.includes('suspended') || action.includes('canceled')) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap gap-4">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">All Actions</option>
            <option value="user_created">User Created</option>
            <option value="user_updated">User Updated</option>
            <option value="user_deleted">User Deleted</option>
            <option value="user_suspended">User Suspended</option>
            <option value="user_activated">User Activated</option>
            <option value="subscription_created">Subscription Created</option>
            <option value="subscription_canceled">Subscription Canceled</option>
            <option value="payment_received">Payment Received</option>
            <option value="payment_failed">Payment Failed</option>
            <option value="payment_refunded">Payment Refunded</option>
            <option value="plan_created">Plan Created</option>
            <option value="plan_updated">Plan Updated</option>
            <option value="payment_settings_updated">Payment Settings Updated</option>
          </select>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-700">
          {loading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : logs?.data.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">No activity logs found</div>
          ) : (
            logs?.data.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-700/50">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{log.user?.name || 'System'}</span>
                      <span className={`${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      {log.entity_type && (
                        <span className="text-gray-500">
                          on {log.entity_type} #{log.entity_id}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                    </div>
                    {(log.old_values || log.new_values) && (
                      <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs font-mono">
                        {log.old_values && (
                          <div className="text-red-400">
                            - {JSON.stringify(log.old_values, null, 0).slice(0, 100)}
                          </div>
                        )}
                        {log.new_values && (
                          <div className="text-green-400">
                            + {JSON.stringify(log.new_values, null, 0).slice(0, 100)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {logs && logs.last_page > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Page {logs.current_page} of {logs.last_page}
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
                onClick={() => setPage(p => Math.min(logs.last_page, p + 1))}
                disabled={page === logs.last_page}
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
