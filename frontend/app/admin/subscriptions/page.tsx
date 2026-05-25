'use client';

import { useEffect, useState } from 'react';
import { apiGetSubscriptions, apiCancelSubscription, Subscription, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { RefreshCw, CreditCard, Calendar, User, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function SubscriptionsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  
  const t = {
    title: isRTL ? 'الاشتراكات' : 'Subscriptions',
    allStatus: isRTL ? 'جميع الحالات' : 'All Status',
    allGateways: isRTL ? 'جميع البوابات' : 'All Gateways',
    status: {
      active: isRTL ? 'نشط' : 'Active',
      canceled: isRTL ? 'ملغى' : 'Canceled',
      past_due: isRTL ? 'متأخر' : 'Past Due',
      paused: isRTL ? 'متوقف' : 'Paused',
      trialing: isRTL ? 'تجريبي' : 'Trialing',
    },
    user: isRTL ? 'المستخدم' : 'User',
    plan: isRTL ? 'الخطة' : 'Plan',
    gateway: isRTL ? 'البوابة' : 'Gateway',
    statusLabel: isRTL ? 'الحالة' : 'Status',
    periodEnd: isRTL ? 'نهاية الفترة' : 'Period End',
    actions: isRTL ? 'الإجراءات' : 'Actions',
    noSubscriptions: isRTL ? 'لا توجد اشتراكات' : 'No subscriptions found',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    cancelConfirm: isRTL ? 'هل أنت متأكد من إلغاء هذا الاشتراك؟' : 'Are you sure you want to cancel this subscription?',
    cancelError: isRTL ? 'فشل إلغاء الاشتراك' : 'Failed to cancel subscription',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
    page: isRTL ? 'صفحة' : 'Page',
    of: isRTL ? 'من' : 'of',
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

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      canceled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      paused: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return classes[status] || classes.active;
  };

  const getStatusLabel = (status: string) => {
    return t.status[status as keyof typeof t.status] || status;
  };

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h2>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <RefreshCw size={16} className="text-gray-500 dark:text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-gray-900 dark:text-white text-sm outline-none cursor-pointer w-full min-w-[140px]"
            >
              <option value="">{t.allStatus}</option>
              <option value="active">{t.status.active}</option>
              <option value="canceled">{t.status.canceled}</option>
              <option value="past_due">{t.status.past_due}</option>
              <option value="paused">{t.status.paused}</option>
              <option value="trialing">{t.status.trialing}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <CreditCard size={16} className="text-gray-500 dark:text-gray-400" />
            <select
              value={gatewayFilter}
              onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-gray-900 dark:text-white text-sm outline-none cursor-pointer w-full min-w-[140px]"
            >
              <option value="">{t.allGateways}</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  <div className="flex items-center gap-1.5"><User size={14} /> {t.user}</div>
                </th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t.plan}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t.gateway}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t.statusLabel}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> {t.periodEnd}</div>
                </th>
                <th className={`p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <div className="flex justify-center">
                      <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </td>
                </tr>
              ) : subscriptions?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <AlertCircle size={32} className="mb-3 opacity-50" />
                      <p className="text-lg">{t.noSubscriptions}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions?.data.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-inner">
                          {sub.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white leading-none mb-1">{sub.user?.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{sub.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white leading-none mb-1">{sub.plan?.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">${sub.plan?.price}/mo</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider
                        ${sub.gateway === 'stripe' 
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' 
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800'
                        }
                      `}>
                        {sub.gateway}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(sub.status)}`}>
                        {getStatusLabel(sub.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td className={`p-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                      {sub.status === 'active' && (
                        <button 
                          onClick={() => handleCancel(sub.id)} 
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-100 dark:border-red-800"
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
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 gap-4 bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {t.page} {subscriptions.current_page} {t.of} {subscriptions.last_page}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                {t.previous}
              </button>
              <button
                onClick={() => setPage(p => Math.min(subscriptions.last_page, p + 1))}
                disabled={page === subscriptions.last_page}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
