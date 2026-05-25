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
  ChevronRight,
  Loader2
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
    if (action.includes('created')) return { bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400', icon: 'text-green-500 dark:text-green-400' };
    if (action.includes('deleted')) return { bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400', icon: 'text-red-500 dark:text-red-400' };
    if (action.includes('updated') || action.includes('activated')) return { bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500 dark:text-blue-400' };
    if (action.includes('suspended') || action.includes('canceled')) return { bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500 dark:text-amber-400' };
    return { bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-500 dark:text-gray-400', icon: 'text-gray-400 dark:text-gray-500' };
  };

  const getActionLabel = (action: string) => {
    return t.actions[action as keyof typeof t.actions] || action.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer outline-none transition-all"
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : logs?.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 text-gray-500 dark:text-gray-400">
            <AlertCircle size={48} className="mb-4 opacity-50" />
            <p className="text-lg">{t.noLogs}</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
            {logs?.data.map((log) => {
              const style = getActionStyle(log.action);
              return (
                <div key={log.id} className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.icon}`}
                  >
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {log.user?.name || 'System'}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/50 ${style.color}`}>
                        {getActionLabel(log.action)}
                      </span>
                      {log.entity_type && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {t.on} <span className="font-medium text-gray-700 dark:text-gray-300">{log.entity_type} #{log.entity_id}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        {new Date(log.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </span>
                      {log.ip_address && (
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                          {t.ip}: <span className="font-mono">{log.ip_address}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {logs && logs.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.page} <span className="font-medium text-gray-900 dark:text-white">{logs.current_page}</span> {t.of} <span className="font-medium text-gray-900 dark:text-white">{logs.last_page}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                {t.previous}
              </button>
              <button
                onClick={() => setPage(p => Math.min(logs.last_page, p + 1))}
                disabled={page === logs.last_page}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {t.next}
                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
