'use client';

import { useEffect, useState } from 'react';
import { apiGetActivityLogs, ActivityLog, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { 
  LogIn, 
  User, 
  RefreshCw, 
  CreditCard, 
  Settings, 
  FileText, 
  Edit3, 
  Trash2, 
  UserPlus, 
  UserX, 
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ActivityLogsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  
  const t = {
    title: isRTL ? 'سجل النشاط' : 'Activity Logs',
    allActions: isRTL ? 'جميع الإجراءات' : 'All Actions',
    noLogs: isRTL ? 'لا توجد سجلات نشاط' : 'No activity logs found',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
    page: isRTL ? 'صفحة' : 'Page',
    of: isRTL ? 'من' : 'of',
    actions: {
      user_created: isRTL ? 'إنشاء مستخدم' : 'User Created',
      user_updated: isRTL ? 'تحديث مستخدم' : 'User Updated',
      user_deleted: isRTL ? 'حذف مستخدم' : 'User Deleted',
      user_suspended: isRTL ? 'تعليق مستخدم' : 'User Suspended',
      user_activated: isRTL ? 'تفعيل مستخدم' : 'User Activated',
      subscription_created: isRTL ? 'إنشاء اشتراك' : 'Subscription Created',
      subscription_canceled: isRTL ? 'إلغاء اشتراك' : 'Subscription Canceled',
      payment_received: isRTL ? 'استلام دفعة' : 'Payment Received',
      payment_failed: isRTL ? 'فشل دفعة' : 'Payment Failed',
      payment_refunded: isRTL ? 'استرداد دفعة' : 'Payment Refunded',
      plan_created: isRTL ? 'إنشاء خطة' : 'Plan Created',
      plan_updated: isRTL ? 'تحديث خطة' : 'Plan Updated',
      payment_settings_updated: isRTL ? 'تحديث إعدادات الدفع' : 'Payment Settings Updated',
      login: isRTL ? 'تسجيل دخول' : 'Login',
      logout: isRTL ? 'تسجيل خروج' : 'Logout',
    },
    on: isRTL ? 'على' : 'on',
    ip: isRTL ? 'الآي بي' : 'IP',
  };

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
    if (action.includes('login')) return <LogIn size={18} />;
    if (action.includes('user_created')) return <UserPlus size={18} />;
    if (action.includes('user_deleted')) return <Trash2 size={18} />;
    if (action.includes('user_suspended')) return <UserX size={18} />;
    if (action.includes('user_activated')) return <UserCheck size={18} />;
    if (action.includes('user')) return <User size={18} />;
    if (action.includes('subscription')) return <RefreshCw size={18} />;
    if (action.includes('payment')) return <CreditCard size={18} />;
    if (action.includes('plan')) return <FileText size={18} />;
    if (action.includes('settings')) return <Settings size={18} />;
    return <Edit3 size={18} />;
  };

  const getActionStyle = (action: string) => {
    if (action.includes('created')) return { bg: '#dcfce7', color: '#16a34a', icon: '#22c55e' };
    if (action.includes('deleted')) return { bg: '#fee2e2', color: '#dc2626', icon: '#ef4444' };
    if (action.includes('updated') || action.includes('activated')) return { bg: '#dbeafe', color: '#2563eb', icon: '#3b82f6' };
    if (action.includes('suspended') || action.includes('canceled')) return { bg: '#fef3c7', color: '#d97706', icon: '#f59e0b' };
    return { bg: '#f3f4f6', color: '#6b7280', icon: '#9ca3af' };
  };

  const getActionLabel = (action: string) => {
    return t.actions[action as keyof typeof t.actions] || action.replace(/_/g, ' ');
  };

  return (
    <div className="activity-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="filters-card">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        >
          <option value="">{t.allActions}</option>
          <option value="user_created">{t.actions.user_created}</option>
          <option value="user_updated">{t.actions.user_updated}</option>
          <option value="user_deleted">{t.actions.user_deleted}</option>
          <option value="user_suspended">{t.actions.user_suspended}</option>
          <option value="user_activated">{t.actions.user_activated}</option>
          <option value="subscription_created">{t.actions.subscription_created}</option>
          <option value="subscription_canceled">{t.actions.subscription_canceled}</option>
          <option value="payment_received">{t.actions.payment_received}</option>
          <option value="payment_failed">{t.actions.payment_failed}</option>
          <option value="payment_refunded">{t.actions.payment_refunded}</option>
          <option value="plan_created">{t.actions.plan_created}</option>
          <option value="plan_updated">{t.actions.plan_updated}</option>
          <option value="payment_settings_updated">{t.actions.payment_settings_updated}</option>
        </select>
      </div>

      {/* Activity Logs */}
      <div className="logs-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : logs?.data.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={32} />
            <p>{t.noLogs}</p>
          </div>
        ) : (
          <div className="logs-list">
            {logs?.data.map((log) => {
              const style = getActionStyle(log.action);
              return (
                <div key={log.id} className="log-item">
                  <div 
                    className="log-icon"
                    style={{ background: style.bg, color: style.icon }}
                  >
                    {getActionIcon(log.action)}
                  </div>
                  <div className="log-content">
                    <div className="log-header">
                      <span className="log-user">{log.user?.name || 'System'}</span>
                      <span className="log-action" style={{ color: style.color }}>
                        {getActionLabel(log.action)}
                      </span>
                      {log.entity_type && (
                        <span className="log-entity">
                          {t.on} {log.entity_type} #{log.entity_id}
                        </span>
                      )}
                    </div>
                    <div className="log-meta">
                      <span>{new Date(log.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</span>
                      {log.ip_address && <span>• {t.ip}: {log.ip_address}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {logs && logs.last_page > 1 && (
          <div className="pagination">
            <p className="pagination-info">
              {t.page} {logs.current_page} {t.of} {logs.last_page}
            </p>
            <div className="pagination-btns">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                {t.previous}
              </button>
              <button
                onClick={() => setPage(p => Math.min(logs.last_page, p + 1))}
                disabled={page === logs.last_page}
              >
                {t.next}
                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .activity-page {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .filters-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
        }

        .filters-card select {
          padding: 0.5rem 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #1e293b;
          font-size: 0.9rem;
          cursor: pointer;
          outline: none;
        }

        .logs-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .empty-state svg {
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .logs-list {
          display: flex;
          flex-direction: column;
        }

        .log-item {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .log-item:last-child {
          border-bottom: none;
        }

        .log-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .log-content {
          flex: 1;
          min-width: 0;
        }

        .log-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .log-user {
          font-weight: 600;
          color: #1e293b;
        }

        .log-action {
          font-weight: 500;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          background: rgba(0,0,0,0.05);
        }

        .log-entity {
          color: #64748b;
          font-size: 0.85rem;
        }

        .log-meta {
          display: flex;
          gap: 1rem;
          color: #94a3b8;
          font-size: 0.8rem;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-top: 1px solid #e2e8f0;
        }

        @media (max-width: 640px) {
          .pagination {
            flex-direction: column;
            gap: 0.75rem;
          }
        }

        .pagination-info {
          color: #64748b;
          font-size: 0.85rem;
          margin: 0;
        }

        .pagination-btns {
          display: flex;
          gap: 0.5rem;
        }

        .pagination-btns button {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #64748b;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btns button:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1e293b;
        }

        .pagination-btns button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
