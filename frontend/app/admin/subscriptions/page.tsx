'use client';

import { useEffect, useState } from 'react';
import { apiGetSubscriptions, apiCancelSubscription, Subscription, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  RefreshCw,
  CreditCard,
  Calendar,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SubscriptionsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'إدارة الاشتراكات' : 'Recurring Subscriptions',
    subtitle: isRTL ? 'متابعة الاشتراكات النشطة والملغية وتواريخ التجديد' : 'Monitor active, past due, and canceled subscriber plans',
    allStatus: isRTL ? 'جميع الحالات' : 'All Statuses',
    allGateways: isRTL ? 'جميع البوابات' : 'All Gateways',
    status: {
      active: isRTL ? 'نشط' : 'Active',
      canceled: isRTL ? 'ملغى' : 'Canceled',
      past_due: isRTL ? 'متأخر' : 'Past Due',
      paused: isRTL ? 'متوقف' : 'Paused',
      trialing: isRTL ? 'تجريبي' : 'Trialing',
    },
    user: isRTL ? 'المستخدم' : 'Subscriber',
    plan: isRTL ? 'الخطة' : 'Plan',
    gateway: isRTL ? 'البوابة' : 'Gateway',
    statusLabel: isRTL ? 'الحالة' : 'Status',
    periodEnd: isRTL ? 'نهاية الفترة' : 'Period End',
    actions: isRTL ? 'الإجراءات' : 'Actions',
    noSubscriptions: isRTL ? 'لا توجد اشتراكات مسجلة' : 'No subscriptions found',
    cancel: isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription',
    cancelConfirm: isRTL ? 'هل أنت متأكد من إلغاء هذا الاشتراك؟' : 'Are you sure you want to cancel this subscription?',
    cancelError: isRTL ? 'فشل إلغاء الاشتراك' : 'Failed to cancel subscription',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
  };

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
    if (!confirm(t.cancelConfirm)) return;
    try {
      await apiCancelSubscription(id);
      setPage(1);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.cancelError);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t.status.active}</span>
        </span>
      );
    }
    if (status === 'canceled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <span>{t.status.canceled}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <span>{t.status[status as keyof typeof t.status] || status}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--k-blue)] uppercase tracking-wider mb-1">
            <RefreshCw size={14} />
            <span>REVENUE & BILLING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {t.title}
            </SplitTextReveal>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1">{t.subtitle}</p>
        </div>

        {subscriptions && (
          <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border)] shrink-0">
            {subscriptions.total} {isRTL ? 'اشتراك مسجل' : 'SUBSCRIPTIONS'}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="studio-card-glass p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="studio-input flex-1 h-[3.25rem] text-xs sm:text-sm font-semibold"
          >
            <option value="">{t.allStatus}</option>
            <option value="active">{t.status.active}</option>
            <option value="canceled">{t.status.canceled}</option>
            <option value="past_due">{t.status.past_due}</option>
            <option value="paused">{t.status.paused}</option>
            <option value="trialing">{t.status.trialing}</option>
          </select>

          <select
            value={gatewayFilter}
            onChange={(e) => {
              setGatewayFilter(e.target.value);
              setPage(1);
            }}
            className="studio-input flex-1 h-[3.25rem] text-xs sm:text-sm font-semibold"
          >
            <option value="">{t.allGateways}</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="moyasar">Moyasar</option>
            <option value="myfatoorah">MyFatoorah</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="studio-card-glass overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-3)]">
                <th className="py-4 px-6">{t.user}</th>
                <th className="py-4 px-4">{t.plan}</th>
                <th className="py-4 px-4">{t.gateway}</th>
                <th className="py-4 px-4">{t.statusLabel}</th>
                <th className="py-4 px-4">{t.periodEnd}</th>
                <th className="py-4 px-6 text-right rtl:text-left">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[var(--text-3)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[var(--k-blue)]" />
                      <span className="text-xs font-mono">{isRTL ? 'جارٍ التحميل...' : 'LOADING SUBSCRIPTIONS...'}</span>
                    </div>
                  </td>
                </tr>
              ) : !subscriptions || subscriptions.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[var(--text-3)]">
                    <RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t.noSubscriptions}</p>
                  </td>
                </tr>
              ) : (
                subscriptions.data.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[var(--text)]">{sub.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-[var(--text-3)] font-mono">{sub.user?.email || '-'}</div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-[var(--text)]">
                      {sub.plan?.name || 'Default Plan'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--surface-2)] text-[var(--k-blue)] border border-[var(--border)] uppercase">
                        {sub.gateway}
                      </span>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(sub.status)}</td>
                    <td className="py-4 px-4 text-xs font-mono text-[var(--text-3)]">
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')
                        : '-'}
                    </td>
                    <td className="py-4 px-6 text-right rtl:text-left">
                      {sub.status === 'active' && (
                        <button
                          onClick={() => handleCancel(sub.id)}
                          className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all"
                        >
                          {t.cancel}
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
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-3)]">
            <div>
              Page <span className="font-bold text-[var(--text)]">{page}</span> of{' '}
              <span className="font-bold text-[var(--text)]">{subscriptions.last_page}</span>
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
                disabled={page >= subscriptions.last_page}
                onClick={() => setPage((p) => Math.min(subscriptions.last_page, p + 1))}
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
