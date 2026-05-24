'use client';

import { useEffect, useState } from 'react';
import { apiGetAdminStats, DashboardStats } from '@/lib/api';
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiGetAdminStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <span>{error}</span>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.users.total, icon: Users, color: 'blue' },
    { label: 'Active Users', value: stats.users.active, icon: UserCheck, color: 'green' },
    { label: 'New This Month', value: stats.users.new_this_month, icon: TrendingUp, color: 'purple', change: stats.users.growth_percentage },
    { label: 'Active Subscriptions', value: stats.subscriptions.active, icon: RefreshCw, color: 'orange' },
    { label: 'Total Revenue', value: `$${parseFloat(stats.revenue.total || '0').toLocaleString()}`, icon: DollarSign, color: 'emerald' },
    { label: 'Revenue This Month', value: `$${parseFloat(stats.revenue.this_month || '0').toLocaleString()}`, icon: BarChart3, color: 'pink', change: stats.revenue.growth_percentage },
  ];

  const getActivityIcon = (action: string) => {
    if (action.includes('login')) return LogIn;
    if (action.includes('user')) return User;
    if (action.includes('subscription')) return RefreshCw;
    if (action.includes('payment')) return CreditCard;
    return FileText;
  };

  return (
    <div className="admin-dashboard">
      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`admin-stat-card admin-stat-card--${card.color}`}>
              <div className="admin-stat-content">
                <p className="admin-stat-label">{card.label}</p>
                <p className="admin-stat-value">{card.value}</p>
                {card.change !== undefined && (
                  <p className={`admin-stat-change ${card.change >= 0 ? 'positive' : 'negative'}`}>
                    {card.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(card.change)}% from last month
                  </p>
                )}
              </div>
              <div className={`admin-stat-icon admin-stat-icon--${card.color}`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="admin-charts-row">
        {/* Revenue by Gateway */}
        <div className="admin-card">
          <h3 className="admin-card-title">Revenue by Gateway</h3>
          <div className="admin-card-content">
            {stats.revenue.by_gateway.length > 0 ? (
              stats.revenue.by_gateway.map((gateway, index) => (
                <div key={index} className="admin-gateway-item">
                  <div className="admin-gateway-info">
                    <div className={`admin-gateway-icon ${gateway.gateway === 'stripe' ? 'stripe' : 'paypal'}`}>
                      {gateway.gateway === 'stripe' ? <CreditCard size={18} /> : <Wallet size={18} />}
                    </div>
                    <div>
                      <p className="admin-gateway-name">{gateway.gateway}</p>
                      <p className="admin-gateway-count">{gateway.count} transactions</p>
                    </div>
                  </div>
                  <p className="admin-gateway-total">${parseFloat(gateway.total || '0').toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="admin-empty">No transactions yet</p>
            )}
          </div>
        </div>

        {/* Subscriptions by Plan */}
        <div className="admin-card">
          <h3 className="admin-card-title">Subscriptions by Plan</h3>
          <div className="admin-card-content">
            {stats.subscriptions.by_plan.length > 0 ? (
              stats.subscriptions.by_plan.map((plan, index) => (
                <div key={index} className="admin-plan-item">
                  <div className="admin-plan-info">
                    <p className="admin-plan-name">{plan.name}</p>
                    <p className="admin-plan-price">${plan.price}/mo</p>
                  </div>
                  <div className="admin-plan-bar-wrap">
                    <div className="admin-plan-bar">
                      <div 
                        className="admin-plan-bar-fill"
                        style={{ width: `${Math.min((plan.active_subscriptions_count / Math.max(stats.subscriptions.active, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="admin-plan-count">{plan.active_subscriptions_count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="admin-empty">No plans configured</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <h3 className="admin-card-title">Recent Activity</h3>
        <div className="admin-activity-list">
          {stats.recent_activity.length > 0 ? (
            stats.recent_activity.map((activity, index) => {
              const ActivityIcon = getActivityIcon(activity.action);
              return (
                <div key={index} className="admin-activity-item">
                  <div className="admin-activity-icon">
                    <ActivityIcon size={18} />
                  </div>
                  <div className="admin-activity-content">
                    <p className="admin-activity-text">
                      <span className="admin-activity-user">{activity.user?.name || 'System'}</span>
                      {' '}<span className="admin-activity-action">{activity.action.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="admin-activity-time">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="admin-empty">No recent activity</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .admin-page-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
        }

        .admin-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .admin-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          color: #f87171;
        }

        /* Stats Grid */
        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .admin-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .admin-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .admin-stat-card {
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.1);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s;
        }

        .admin-stat-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }

        .admin-stat-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .admin-stat-label {
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .admin-stat-value {
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .admin-stat-change {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
        }

        .admin-stat-change.positive {
          color: #34d399;
        }

        .admin-stat-change.negative {
          color: #f87171;
        }

        .admin-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .admin-stat-icon--blue { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
        .admin-stat-icon--green { background: linear-gradient(135deg, #22c55e, #10b981); }
        .admin-stat-icon--purple { background: linear-gradient(135deg, #8b5cf6, #ec4899); }
        .admin-stat-icon--orange { background: linear-gradient(135deg, #f97316, #eab308); }
        .admin-stat-icon--emerald { background: linear-gradient(135deg, #10b981, #14b8a6); }
        .admin-stat-icon--pink { background: linear-gradient(135deg, #ec4899, #f43f5e); }

        /* Charts Row */
        .admin-charts-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .admin-charts-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Card */
        .admin-card {
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.1);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .admin-card-title {
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .admin-card-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .admin-empty {
          color: #64748b;
          text-align: center;
          padding: 1.5rem;
        }

        /* Gateway Item */
        .admin-gateway-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .admin-gateway-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-gateway-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-gateway-icon.stripe {
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
        }

        .admin-gateway-icon.paypal {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .admin-gateway-name {
          color: #fff;
          font-weight: 500;
          text-transform: capitalize;
        }

        .admin-gateway-count {
          color: #64748b;
          font-size: 0.8rem;
        }

        .admin-gateway-total {
          color: #fff;
          font-weight: 600;
        }

        /* Plan Item */
        .admin-plan-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .admin-plan-info {
          display: flex;
          flex-direction: column;
        }

        .admin-plan-name {
          color: #fff;
          font-weight: 500;
        }

        .admin-plan-price {
          color: #64748b;
          font-size: 0.8rem;
        }

        .admin-plan-bar-wrap {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-plan-bar {
          width: 120px;
          height: 8px;
          background: rgba(100, 116, 139, 0.3);
          border-radius: 4px;
          overflow: hidden;
        }

        .admin-plan-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #ec4899);
          border-radius: 4px;
        }

        .admin-plan-count {
          color: #fff;
          font-weight: 600;
          min-width: 24px;
          text-align: right;
        }

        /* Activity */
        .admin-activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .admin-activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(100, 116, 139, 0.1);
          border-radius: 10px;
        }

        .admin-activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .admin-activity-content {
          flex: 1;
          min-width: 0;
        }

        .admin-activity-text {
          font-size: 0.9rem;
        }

        .admin-activity-user {
          color: #fff;
          font-weight: 500;
        }

        .admin-activity-action {
          color: #94a3b8;
        }

        .admin-activity-time {
          color: #64748b;
          font-size: 0.75rem;
          margin-top: 0.15rem;
        }
      `}</style>
    </div>
  );
}
