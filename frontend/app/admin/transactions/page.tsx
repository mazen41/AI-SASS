'use client';

import { useEffect, useState } from 'react';
import { apiGetTransactions, Transaction, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function TransactionsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  
  const t = {
    title: isRTL ? 'المعاملات' : 'Transactions',
    allStatus: isRTL ? 'جميع الحالات' : 'All Status',
    allGateways: isRTL ? 'جميع البوابات' : 'All Gateways',
    status: {
      completed: isRTL ? 'مكتمل' : 'Completed',
      pending: isRTL ? 'معلق' : 'Pending',
      failed: isRTL ? 'فاشل' : 'Failed',
      refunded: isRTL ? 'مسترد' : 'Refunded',
    },
    id: isRTL ? 'الرقم' : 'ID',
    user: isRTL ? 'المستخدم' : 'User',
    amount: isRTL ? 'المبلغ' : 'Amount',
    gateway: isRTL ? 'البوابة' : 'Gateway',
    statusLabel: isRTL ? 'الحالة' : 'Status',
    type: isRTL ? 'النوع' : 'Type',
    date: isRTL ? 'التاريخ' : 'Date',
    noTransactions: isRTL ? 'لا توجد معاملات' : 'No transactions found',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
    page: isRTL ? 'صفحة' : 'Page',
    of: isRTL ? 'من' : 'of',
  };

  const [transactions, setTransactions] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page: page.toString() };
        if (statusFilter) params.status = statusFilter;
        if (gatewayFilter) params.gateway = gatewayFilter;
        const data = await apiGetTransactions(params);
        setTransactions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, [page, statusFilter, gatewayFilter]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
      completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-700 dark:text-emerald-400', icon: <CheckCircle size={14} /> },
      pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-700 dark:text-amber-400', icon: <Clock size={14} /> },
      failed: { bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-700 dark:text-red-400', icon: <XCircle size={14} /> },
      refunded: { bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-700 dark:text-purple-400', icon: <RotateCcw size={14} /> },
    };
    return badges[status] || { bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-700 dark:text-gray-400', icon: <AlertCircle size={14} /> };
  };

  const getStatusLabel = (status: string) => {
    return t.status[status as keyof typeof t.status] || status;
  };

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h2>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-gray-900 dark:text-white text-sm outline-none cursor-pointer w-full min-w-[140px]"
            >
              <option value="">{t.allStatus}</option>
              <option value="completed">{t.status.completed}</option>
              <option value="pending">{t.status.pending}</option>
              <option value="failed">{t.status.failed}</option>
              <option value="refunded">{t.status.refunded}</option>
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

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap rtl:text-right">{t.id}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap rtl:text-right">{t.user}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap rtl:text-right">{t.amount}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap rtl:text-right">{t.gateway}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap rtl:text-right">{t.statusLabel}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap rtl:text-right">{t.type}</th>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap rtl:text-right">{t.date}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <div className="flex justify-center">
                      <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </td>
                </tr>
              ) : transactions?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <AlertCircle size={32} className="mb-3 opacity-50" />
                      <p className="text-lg">{t.noTransactions}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions?.data.map((tx) => {
                  const status = getStatusBadge(tx.status);
                  const isNegative = parseFloat(tx.amount) < 0;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400 font-mono">#{tx.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-inner shrink-0">
                            {tx.user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white leading-none mb-1">{tx.user?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{tx.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-lg font-bold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isNegative ? '-' : '+'}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                          </span>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{tx.currency}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                            tx.gateway === 'stripe' 
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' 
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800'
                          }`}>
                          {tx.gateway}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                          {status.icon}
                          {getStatusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">
                        {tx.type.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {transactions && transactions.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 gap-4 bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {t.page} {transactions.current_page} {t.of} {transactions.last_page}
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
                onClick={() => setPage(p => Math.min(transactions.last_page, p + 1))}
                disabled={page === transactions.last_page}
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
