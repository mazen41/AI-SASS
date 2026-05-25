'use client';

import { useEffect, useState } from 'react';
import { apiGetSubscriptions, apiCancelSubscription, Subscription, PaginatedResponse } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { RefreshCw, CreditCard, Calendar, User, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      active: { bg: '#dcfce7', color: '#16a34a' },
      canceled: { bg: '#fee2e2', color: '#dc2626' },
      past_due: { bg: '#fef3c7', color: '#d97706' },
      paused: { bg: '#f3f4f6', color: '#6b7280' },
      trialing: { bg: '#dbeafe', color: '#2563eb' },
    };
    return colors[status] || colors.active;
  };

  const getStatusLabel = (status: string) => {
    return t.status[status as keyof typeof t.status] || status;
  };

  return (
    <div className="subscriptions-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <RefreshCw size={16} className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t.allStatus}</option>
              <option value="active">{t.status.active}</option>
              <option value="canceled">{t.status.canceled}</option>
              <option value="past_due">{t.status.past_due}</option>
              <option value="paused">{t.status.paused}</option>
              <option value="trialing">{t.status.trialing}</option>
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

      {/* Subscriptions Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><User size={14} /> {t.user}</th>
                <th>{t.plan}</th>
                <th>{t.gateway}</th>
                <th>{t.statusLabel}</th>
                <th><Calendar size={14} /> {t.periodEnd}</th>
                <th className="actions-col">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="loading-cell">
                    <div className="spinner" />
                  </td>
                </tr>
              ) : subscriptions?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    <AlertCircle size={32} />
                    <p>{t.noSubscriptions}</p>
                  </td>
                </tr>
              ) : (
                subscriptions?.data.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{sub.user?.name?.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="user-name">{sub.user?.name}</p>
                          <p className="user-email">{sub.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="plan-name">{sub.plan?.name}</span>
                      <span className="plan-price">${sub.plan?.price}/mo</span>
                    </td>
                    <td>
                      <span className={`gateway-badge ${sub.gateway}`}>{sub.gateway}</span>
                    </td>
                    <td>
                      <span 
                        className="status-badge" 
                        style={{ 
                          background: getStatusBadge(sub.status).bg, 
                          color: getStatusBadge(sub.status).color 
                        }}
                      >
                        {getStatusLabel(sub.status)}
                      </span>
                    </td>
                    <td className="date-cell">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}
                    </td>
                    <td className="actions-col">
                      {sub.status === 'active' && (
                        <button onClick={() => handleCancel(sub.id)} className="cancel-btn">
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
          <div className="pagination">
            <p className="pagination-info">
              {t.page} {subscriptions.current_page} {t.of} {subscriptions.last_page}
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
                onClick={() => setPage(p => Math.min(subscriptions.last_page, p + 1))}
                disabled={page === subscriptions.last_page}
              >
                {t.next}
                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .subscriptions-page {
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

        th svg {
          vertical-align: middle;
          margin: 0 0.25rem;
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

        .plan-name {
          display: block;
          font-weight: 500;
          color: #1e293b;
        }

        .plan-price {
          display: block;
          color: #64748b;
          font-size: 0.8rem;
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
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .date-cell {
          color: #64748b;
          font-size: 0.85rem;
        }

        .actions-col {
          text-align: right;
        }

        [dir="rtl"] .actions-col {
          text-align: left;
        }

        .cancel-btn {
          padding: 0.4rem 0.75rem;
          background: #fef2f2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #fee2e2;
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
