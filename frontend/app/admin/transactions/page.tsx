'use client';

import { useEffect, useState } from 'react';
import { apiGetTransactions, Transaction, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
} from 'lucide-react';

export default function TransactionsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'سجل المعاملات والمدفوعات' : 'Payment Transactions',
    subtitle: isRTL ? 'تدقيق العمليات المالية، والرسوم، وفواتير الاشتراكات' : 'Audit ledger of charges, gateway checkouts, and invoices',
    allStatus: isRTL ? 'جميع الحالات' : 'All Statuses',
    allGateways: isRTL ? 'جميع البوابات' : 'All Gateways',
    status: {
      completed: isRTL ? 'مكتمل' : 'Completed',
      pending: isRTL ? 'معلق' : 'Pending',
      failed: isRTL ? 'فاشل' : 'Failed',
      refunded: isRTL ? 'مسترد' : 'Refunded',
    },
    id: isRTL ? 'رقم المعاملة' : 'Transaction ID',
    user: isRTL ? 'العميل' : 'Customer',
    amount: isRTL ? 'المبلغ' : 'Amount',
    gateway: isRTL ? 'البوابة' : 'Gateway',
    statusLabel: isRTL ? 'الحالة' : 'Status',
    type: isRTL ? 'النوع' : 'Type',
    date: isRTL ? 'التاريخ' : 'Date',
    noTransactions: isRTL ? 'لا توجد معاملات مسجلة' : 'No transactions recorded',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
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
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={12} />
          <span>{t.status.completed}</span>
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock size={12} />
          <span>{t.status.pending}</span>
        </span>
      );
    }
    if (status === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <RotateCcw size={12} />
          <span>{t.status.refunded}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle size={12} />
        <span>{t.status.failed}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--k-blue)] uppercase tracking-wider mb-1">
            <CreditCard size={14} />
            <span>FINANCIAL LEDGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {t.title}
            </SplitTextReveal>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1">{t.subtitle}</p>
        </div>

        {transactions && (
          <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border)] shrink-0">
            {transactions.total} {isRTL ? 'عملية مسجلة' : 'TRANSACTIONS'}
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
            <option value="completed">{t.status.completed}</option>
            <option value="pending">{t.status.pending}</option>
            <option value="failed">{t.status.failed}</option>
            <option value="refunded">{t.status.refunded}</option>
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

      {/* Table */}
      <div className="studio-card-glass overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-3)]">
                <th className="py-4 px-6">{t.id}</th>
                <th className="py-4 px-4">{t.user}</th>
                <th className="py-4 px-4">{t.amount}</th>
                <th className="py-4 px-4">{t.gateway}</th>
                <th className="py-4 px-4">{t.statusLabel}</th>
                <th className="py-4 px-6 text-right rtl:text-left">{t.date}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[var(--text-3)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[var(--k-blue)]" />
                      <span className="text-xs font-mono">{isRTL ? 'جارٍ التحميل...' : 'LOADING TRANSACTIONS...'}</span>
                    </div>
                  </td>
                </tr>
              ) : !transactions || transactions.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[var(--text-3)]">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t.noTransactions}</p>
                  </td>
                </tr>
              ) : (
                transactions.data.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-[var(--text-3)]">
                      #{tx.id}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-[var(--text)]">{tx.user?.name || 'Customer'}</div>
                      <div className="text-xs text-[var(--text-3)] font-mono">{tx.user?.email || '-'}</div>
                    </td>
                    <td className="py-4 px-4 font-mono font-extrabold text-base gradient-text">
                      ${parseFloat(tx.amount || '0').toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--surface-2)] text-[var(--k-blue)] border border-[var(--border)] uppercase">
                        {tx.gateway}
                      </span>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(tx.status)}</td>
                    <td className="py-4 px-6 text-right rtl:text-left text-xs font-mono text-[var(--text-3)]">
                      {new Date(tx.created_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {transactions && transactions.last_page > 1 && (
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-3)]">
            <div>
              Page <span className="font-bold text-[var(--text)]">{page}</span> of{' '}
              <span className="font-bold text-[var(--text)]">{transactions.last_page}</span>
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
                disabled={page >= transactions.last_page}
                onClick={() => setPage((p) => Math.min(transactions.last_page, p + 1))}
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
