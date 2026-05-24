'use client';

import { useEffect, useState } from 'react';
import { apiGetAdminStats, DashboardStats } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import {
  Users,
  UserCheck,
  TrendingUp,
  RefreshCw,
  DollarSign,
  BarChart3,
  CreditCard,
  Wallet,
  LogIn,
  User,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function AdminDashboard() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiGetAdminStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : (isRTL ? 'فشل تحميل البيانات' : 'Failed to load stats'));
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [isRTL]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-box">
        <span>{error}</span>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: isRTL ? 'إجمالي المستخدمين' : 'Total Users', value: stats.users.total, icon: Users, color: '#6366f1' },
    { label: isRTL ? 'المستخدمين النشطين' : 'Active Users', value: stats.users.active, icon: UserCheck, color: '#22c55e' },
    { label: isRTL ? 'الجدد هذا الشهر' : 'New This Month', value: stats.users.new_this_month, icon: TrendingUp, color: '#8b5cf6', change: stats.users.growth_percentage },
    { label: isRTL ? 'الاشتراكات النشطة' : 'Active Subscriptions', value: stats.subscriptions.active, icon: RefreshCw, color: '#f59e0b' },
    { label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue', value: `$${parseFloat(stats.revenue.total || '0').toLocaleString()}`, icon: DollarSign, color: '#10b981' },
    { label: isRTL ? 'إيرادات الشهر' : 'Revenue This Month', value: `$${parseFloat(stats.revenue.this_month || '0').toLocaleString()}`, icon: BarChart3, color: '#ec4899', change: stats.revenue.growth_percentage },
  ];

  const getActivityIcon = (action: string) => {
    if (action.includes('login')) return LogIn;
    if (action.includes('user')) return User;
    if (action.includes('subscription')) return RefreshCw;
    if (action.includes('payment')) return CreditCard;
    return FileText;
  };

  return (
    <div className="dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ background: card.color }}>
                <Icon size={20} color="white" />
              </div>
              <div className="stat-info">
                <p className="stat-label">{card.label}</p>
                <p className="stat-value">{card.value}</p>
                {card.change !== undefined && (
                  <p className={`stat-change ${card.change >= 0 ? 'positive' : 'negative'}`}>
                    {card.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(card.change)}% {isRTL ? 'من الشهر الماضي' : 'from last month'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Revenue by Gateway */}
        <div className="card">
          <h3 className="card-title">{isRTL ? 'الإيرادات حسب البوابة' : 'Revenue by Gateway'}</h3>
          <div className="card-content">
            {stats.revenue.by_gateway.length > 0 ? (
              stats.revenue.by_gateway.map((gateway, index) => (
                <div key={index} className="gateway-item">
                  <div className="gateway-info">
                    <div className={`gateway-icon ${gateway.gateway}`}>
                      {gateway.gateway === 'stripe' ? <CreditCard size={16} /> : <Wallet size={16} />}
                    </div>
                    <div>
                      <p className="gateway-name">{gateway.gateway}</p>
                      <p className="gateway-count">{gateway.count} {isRTL ? 'معاملة' : 'transactions'}</p>
                    </div>
                  </div>
                  <p className="gateway-total">${parseFloat(gateway.total || '0').toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="empty-text">{isRTL ? 'لا توجد معاملات بعد' : 'No transactions yet'}</p>
            )}
          </div>
        </div>

        {/* Subscriptions by Plan */}
        <div className="card">
          <h3 className="card-title">{isRTL ? 'الاشتراكات حسب الخطة' : 'Subscriptions by Plan'}</h3>
          <div className="card-content">
            {stats.subscriptions.by_plan.length > 0 ? (
              stats.subscriptions.by_plan.map((plan, index) => (
                <div key={index} className="plan-item">
                  <div className="plan-info">
                    <p className="plan-name">{plan.name}</p>
                    <p className="plan-price">${plan.price}/{isRTL ? 'شهر' : 'mo'}</p>
                  </div>
                  <div className="plan-bar-wrap">
                    <div className="plan-bar">
                      <div 
                        className="plan-bar-fill"
                        style={{ width: `${Math.min((plan.active_subscriptions_count / Math.max(stats.subscriptions.active, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="plan-count">{plan.active_subscriptions_count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-text">{isRTL ? 'لا توجد خطط' : 'No plans configured'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="card-title">{isRTL ? 'النشاط الأخير' : 'Recent Activity'}</h3>
        <div className="activity-list">
          {stats.recent_activity.length > 0 ? (
            stats.recent_activity.map((activity, index) => {
              const ActivityIcon = getActivityIcon(activity.action);
              return (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    <ActivityIcon size={16} />
                  </div>
                  <div className="activity-content">
                    <p className="activity-text">
                      <span className="activity-user">{activity.user?.name || 'System'}</span>
                      {' '}<span className="activity-action">{activity.action.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="activity-time">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="empty-text">{isRTL ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 1rem;
          color: #dc2626;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .stat-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          color: #64748b;
          font-size: 0.8rem;
          margin: 0 0 0.25rem;
        }

        .stat-value {
          color: #1e293b;
          font-size: 1.35rem;
          font-weight: 700;
          margin: 0;
        }

        .stat-change {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.75rem;
          margin: 0.25rem 0 0;
        }

        .stat-change.positive {
          color: #22c55e;
        }

        .stat-change.negative {
          color: #ef4444;
        }

        /* Charts Row */
        .charts-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 1024px) {
          .charts-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Card */
        .card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
        }

        .card-title {
          color: #1e293b;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0 0 1rem;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .empty-text {
          color: #94a3b8;
          text-align: center;
          padding: 1rem;
          margin: 0;
        }

        /* Gateway Item */
        .gateway-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .gateway-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .gateway-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gateway-icon.stripe {
          background: #f3f0ff;
          color: #6366f1;
        }

        .gateway-icon.paypal {
          background: #eff6ff;
          color: #3b82f6;
        }

        .gateway-name {
          color: #1e293b;
          font-weight: 500;
          text-transform: capitalize;
          margin: 0;
        }

        .gateway-count {
          color: #94a3b8;
          font-size: 0.75rem;
          margin: 0;
        }

        .gateway-total {
          color: #1e293b;
          font-weight: 600;
          margin: 0;
        }

        /* Plan Item */
        .plan-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .plan-info {
          display: flex;
          flex-direction: column;
        }

        .plan-name {
          color: #1e293b;
          font-weight: 500;
          margin: 0;
        }

        .plan-price {
          color: #94a3b8;
          font-size: 0.75rem;
          margin: 0;
        }

        .plan-bar-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .plan-bar {
          width: 100px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .plan-bar-fill {
          height: 100%;
          background: #6366f1;
          border-radius: 3px;
        }

        .plan-count {
          color: #1e293b;
          font-weight: 600;
          font-size: 0.85rem;
          min-width: 20px;
          text-align: right;
        }

        /* Activity */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f3f0ff;
          color: #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-text {
          font-size: 0.85rem;
          margin: 0;
        }

        .activity-user {
          color: #1e293b;
          font-weight: 500;
        }

        .activity-action {
          color: #64748b;
        }

        .activity-time {
          color: #94a3b8;
          font-size: 0.7rem;
          margin: 0.15rem 0 0;
        }
      `}</style>
    </div>
  );
}
