'use client';

import { useEffect, useState } from 'react';
import { apiGetActivityActions, apiGetActivityLogs, ActivityLog, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import SplitTextReveal from '@/components/SplitTextReveal';
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
} from 'lucide-react';

export default function ActivityLogsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'سجل النشاط والأحداث' : 'Audit Trail & Activity Logs',
    subtitle: isRTL ? 'سجل زمني لجميع عمليات الدخول، والتعديلات، والمدفوعات' : 'Chronological audit trail of admin actions, user sessions, and updates',
    allActions: isRTL ? 'جميع الإجراءات' : 'All Actions',
    noLogs: isRTL ? 'لا توجد سجلات مسجلة' : 'No activity logs found',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
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
    ip: isRTL ? 'عنوان IP' : 'IP Address',
    reason: isRTL ? 'السبب' : 'Reason',
    requestId: isRTL ? 'معرف الطلب' : 'Request ID',
    failed: isRTL ? 'فشل' : 'Failed',
  };

  const [logs, setLogs] = useState<PaginatedResponse<ActivityLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [requestIdFilter, setRequestIdFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGetActivityActions().then(({ actions: values }) => setActions(values)).catch(() => setActions([]));
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { ...appliedFilters, page: page.toString() };
        const data = await apiGetActivityLogs(params);
        setLogs(data);
      } catch (err) {
        setFilterError(err instanceof Error ? err.message : (isRTL ? 'تعذر تحميل سجل النشاط.' : 'Could not load audit events.'));
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [page, appliedFilters, isRTL]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (actionFilter) next.action = actionFilter;
    if (searchText.trim()) next.q = searchText.trim();
    if (userIdFilter.trim()) next.user_id = userIdFilter.trim();
    if (entityFilter.trim()) next.entity_type = entityFilter.trim();
    if (requestIdFilter.trim()) next.request_id = requestIdFilter.trim();
    if (resultFilter) next.result = resultFilter;
    if (dateFrom) next.date_from = dateFrom;
    if (dateTo) next.date_to = dateTo;
    setFilterError('');
    setPage(1);
    setAppliedFilters(next);
  };

  const clearFilters = () => {
    setActionFilter(''); setSearchText(''); setUserIdFilter(''); setEntityFilter(''); setRequestIdFilter(''); setResultFilter(''); setDateFrom(''); setDateTo(''); setAppliedFilters({}); setPage(1); setFilterError('');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return LogIn;
      case 'logout':
        return LogIn;
      case 'user_created':
        return UserPlus;
      case 'user_updated':
        return Edit3;
      case 'user_deleted':
        return Trash2;
      case 'user_suspended':
        return UserX;
      case 'user_activated':
        return UserCheck;
      case 'subscription_created':
      case 'subscription_canceled':
        return RefreshCw;
      case 'payment_received':
      case 'payment_failed':
      case 'payment_refunded':
        return CreditCard;
      case 'payment_settings_updated':
        return Settings;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--k-blue)] uppercase tracking-wider mb-1">
            <Activity size={14} />
            <span>AUDIT TRAIL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {t.title}
            </SplitTextReveal>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1">{t.subtitle}</p>
        </div>

        {logs && (
          <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border)] shrink-0">
            {logs.total} {isRTL ? 'حدث مسجل' : 'LOG EVENTS'}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <form onSubmit={applyFilters} className="studio-card-glass grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
        <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={isRTL ? 'بحث بالحدث أو المستخدم أو السبب' : 'Search event, actor, email, or reason'} className="studio-input h-12 text-sm" />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="studio-input h-12 text-sm font-semibold"><option value="">{t.allActions}</option>{[...new Set([...Object.keys(t.actions), ...actions])].sort().map((key) => <option key={key} value={key}>{t.actions[key as keyof typeof t.actions] || key.replace(/_/g, ' ')}</option>)}</select>
        <input inputMode="numeric" value={userIdFilter} onChange={(e) => setUserIdFilter(e.target.value.replace(/\D/g, ''))} placeholder={isRTL ? 'رقم المستخدم' : 'User ID'} className="studio-input h-12 text-sm" />
        <input value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} placeholder={isRTL ? 'نوع السجل (مثل User)' : 'Entity type (e.g. User)'} className="studio-input h-12 text-sm" />
        <input value={requestIdFilter} onChange={(e) => setRequestIdFilter(e.target.value)} placeholder={isRTL ? 'معرف الطلب' : 'Request ID'} className="studio-input h-12 text-sm font-mono" />
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="studio-input h-12 text-sm font-semibold"><option value="">{isRTL ? 'كل النتائج' : 'All results'}</option><option value="success">{isRTL ? 'نجاح' : 'Success'}</option><option value="failure">{isRTL ? 'فشل' : 'Failure'}</option></select>
        <label className="text-xs text-[var(--text-3)]">{isRTL ? 'من تاريخ' : 'From'}<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="studio-input mt-1 h-11 w-full text-sm" /></label>
        <label className="text-xs text-[var(--text-3)]">{isRTL ? 'إلى تاريخ' : 'To'}<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="studio-input mt-1 h-11 w-full text-sm" /></label>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-4"><button type="submit" className="studio-btn-primary px-5 py-2.5 text-xs font-bold">{isRTL ? 'تطبيق البحث' : 'Apply filters'}</button><button type="button" onClick={clearFilters} className="studio-btn-secondary px-5 py-2.5 text-xs font-bold">{isRTL ? 'مسح' : 'Clear'}</button>{filterError && <span role="alert" className="text-xs text-red-400">{filterError}</span>}</div>
      </form>

      {/* Activity List */}
      <div className="studio-card-glass p-6">
        {loading ? (
          <div className="py-16 text-center text-[var(--text-3)] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--k-blue)]" />
            <span className="text-xs font-mono">{isRTL ? 'جارٍ التحميل...' : 'LOADING AUDIT STREAM...'}</span>
          </div>
        ) : !logs || logs.data.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-3)]">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t.noLogs}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.data.map((log) => {
              const ActionIcon = getActionIcon(log.action);
              const actionLabel = t.actions[log.action as keyof typeof t.actions] || log.action.replace(/_/g, ' ');

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--k-blue)] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--k-blue)] shrink-0 shadow-sm">
                      <ActionIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[var(--text)]">
                        <span>{log.user?.name || (isRTL ? 'النظام' : 'System')}</span>
                        <span className="text-[var(--k-blue)] ml-2 rtl:mr-2 capitalize">
                          {actionLabel}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-3)] mt-0.5 flex flex-wrap items-center gap-3">
                        <span className="font-mono">{new Date(log.created_at).toLocaleString()}</span>
                        {log.entity_type && (
                          <span className="font-mono">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</span>
                        )}
                        {log.result === 'failure' && <span className="text-red-400 font-bold">{t.failed}</span>}
                        {log.ip_address && (
                          <span className="font-mono text-[11px] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)]">
                            IP: {log.ip_address}
                          </span>
                        )}
                        {log.request_id && <span className="font-mono">{t.requestId}: {log.request_id}</span>}
                      </div>
                      {log.reason && <p className="text-xs text-[var(--text-2)] mt-2 break-words">{t.reason}: {log.reason}</p>}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--text-3)] border border-[var(--border)] shrink-0 self-start sm:self-auto">
                    {log.action}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {logs && logs.last_page > 1 && (
          <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-3)]">
            <div>
              Page <span className="font-bold text-[var(--text)]">{page}</span> of{' '}
              <span className="font-bold text-[var(--text)]">{logs.last_page}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] disabled:opacity-40"
              >
                <ChevronLeft size={14} className="rtl:rotate-180" />
              </button>
              <button
                disabled={page >= logs.last_page}
                onClick={() => setPage((p) => Math.min(logs.last_page, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] disabled:opacity-40"
              >
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
