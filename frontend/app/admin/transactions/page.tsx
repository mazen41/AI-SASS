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
  ChevronRight
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
    const colors: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
      completed: { bg: '#dcfce7', color: '#16a34a', icon: <CheckCircle size={14} /> },
      pending: { bg: '#fef3c7', color: '#d97706', icon: <Clock size={14} /> },
      failed: { bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={14} /> },
      refunded: { bg: '#f3e8ff', color: '#9333ea', icon: <RotateCcw size={14} /> },
    };
    return colors[status] || { bg: '#f3f4f6', color: '#6b7280', icon: <AlertCircle size={14} /> };
  };

  const getStatusLabel = (status: string) => {
    return t.status[status as keyof typeof t.status] || status;
  };

  return (
    <div className="transactions-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t.allStatus}</option>
              <option value="completed">{t.status.completed}</option>
              <option value="pending">{t.status.pending}</option>
              <option value="failed">{t.status.failed}</option>
              <option value="refunded">{t.status.refunded}</option>
            </select>
          </div>
          <div className="filter-group">
            <CreditCard size={16} className="filter-icon" />
            <select
              value={gatewayFilter}
              onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t.allGateways}</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.id}</th>
                <th>{t.user}</th>
                <th>{t.amount}</th>
                <th>{t.gateway}</th>
                <th>{t.statusLabel}</th>
                <th>{t.type}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="loading-cell">
                    <div className="spinner" />
                  </td>
                </tr>
              ) : transactions?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    <AlertCircle size={32} />
                    <p>{t.noTransactions}</p>
                  </td>
                </tr>
              ) : (
                transactions?.data.map((tx) => {
                  const status = getStatusBadge(tx.status);
                  return (
                    <tr key={tx.id}>
                      <td className="id-cell">#{tx.id}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{tx.user?.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <p className="user-name">{tx.user?.name}</p>
                            <p className="user-email">{tx.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`amount ${parseFloat(tx.amount) < 0 ? 'negative' : 'positive'}`}>
                          {parseFloat(tx.amount) < 0 ? '-' : '+'}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                        </span>
                        <span className="currency">{tx.currency}</span>
                      </td>
                      <td>
                        <span className={`gateway-badge ${tx.gateway}`}>{tx.gateway}</span>
                      </td>
                      <td>
                        <span className="status-badge" style={{ background: status.bg, color: status.color }}>
                          {status.icon}
                          {getStatusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="type-cell">{tx.type.replace('_', ' ')}</td>
                      <td className="date-cell">
                        {new Date(tx.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
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
          <div className="pagination">
            <p className="pagination-info">
              {t.page} {transactions.current_page} {t.of} {transactions.last_page}
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
                onClick={() => setPage(p => Math.min(transactions.last_page, p + 1))}
                disabled={page === transactions.last_page}
              >
                {t.next}
                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .transactions-page {
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

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .filter-icon {
          color: #64748b;
        }

        .filter-group select {
          border: none;
          background: transparent;
          color: #1e293b;
          font-size: 0.9rem;
          cursor: pointer;
          outline: none;
        }

        .table-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: #f8fafc;
        }

        th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          white-space: nowrap;
        }

        [dir="rtl"] th {
          text-align: right;
        }

        td {
          padding: 0.75rem 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .empty-cell svg {
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

        .id-cell {
          color: #64748b;
          font-size: 0.85rem;
          font-family: monospace;
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .user-name {
          font-weight: 500;
          color: #1e293b;
          margin: 0;
        }

        .user-email {
          color: #64748b;
          font-size: 0.8rem;
          margin: 0;
        }

        .amount {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .amount.positive {
          color: #16a34a;
        }

        .amount.negative {
          color: #dc2626;
        }

        .currency {
          color: #64748b;
          font-size: 0.85rem;
          margin-left: 0.25rem;
        }

        .gateway-badge {
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .gateway-badge.stripe {
          background: #f3f0ff;
          color: #6366f1;
        }

        .gateway-badge.paypal {
          background: #eff6ff;
          color: #3b82f6;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .type-cell {
          color: #64748b;
          font-size: 0.85rem;
          text-transform: capitalize;
        }

        .date-cell {
          color: #64748b;
          font-size: 0.85rem;
          white-space: nowrap;
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
