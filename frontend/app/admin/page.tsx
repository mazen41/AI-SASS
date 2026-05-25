'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Loader2,
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
        <span>{error}</span>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: isRTL ? 'إجمالي المستخدمين' : 'Total Users', value: stats.users.total, icon: Users, color: 'bg-indigo-600', href: '/admin/users' },
    { label: isRTL ? 'المستخدمين النشطين' : 'Active Users', value: stats.users.active, icon: UserCheck, color: 'bg-emerald-500', href: '/admin/users?status=active' },
    { label: isRTL ? 'الجدد هذا الشهر' : 'New This Month', value: stats.users.new_this_month, icon: TrendingUp, color: 'bg-purple-500', change: stats.users.growth_percentage, href: '/admin/users?filter=new' },
    { label: isRTL ? 'الاشتراكات النشطة' : 'Active Subscriptions', value: stats.subscriptions.active, icon: RefreshCw, color: 'bg-amber-500', href: '/admin/subscriptions' },
    { label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue', value: `$${parseFloat(stats.revenue.total || '0').toLocaleString()}`, icon: DollarSign, color: 'bg-teal-500', href: '/admin/transactions' },
    { label: isRTL ? 'إيرادات الشهر' : 'Revenue This Month', value: `$${parseFloat(stats.revenue.this_month || '0').toLocaleString()}`, icon: BarChart3, color: 'bg-pink-500', change: stats.revenue.growth_percentage, href: '/admin/transactions?period=month' },
  ];

  const getActivityIcon = (action: string) => {
    if (action.includes('login')) return LogIn;
    if (action.includes('user')) return User;
    if (action.includes('subscription')) return RefreshCw;
    if (action.includes('payment')) return CreditCard;
    return FileText;
  };

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isRTL ? 'لوحة التحكم' : 'Dashboard Overview'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isRTL ? 'نظرة عامة على أداء النظام' : 'System performance overview'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index} 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group"
              onClick={() => router.push(card.href)}
              role="button"
              tabIndex={0}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-white ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 truncate">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{card.value}</p>
                {card.change !== undefined && (
                  <p className={`flex items-center gap-1 text-xs mt-1.5 font-medium ${card.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {card.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(card.change)}% {isRTL ? 'من الشهر الماضي' : 'from last month'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Gateway */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Wallet size={18} className="text-gray-400" />
            {isRTL ? 'الإيرادات حسب البوابة' : 'Revenue by Gateway'}
          </h3>
          <div className="space-y-4">
            {stats.revenue.by_gateway.length > 0 ? (
              stats.revenue.by_gateway.map((gateway, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      gateway.gateway === 'stripe' 
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {gateway.gateway === 'stripe' ? <CreditCard size={20} /> : <Wallet size={20} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{gateway.gateway}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{gateway.count} {isRTL ? 'معاملة' : 'transactions'}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">${parseFloat(gateway.total || '0').toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CreditCard size={32} className="mx-auto mb-3 opacity-50" />
                <p>{isRTL ? 'لا توجد معاملات بعد' : 'No transactions yet'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscriptions by Plan */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <RefreshCw size={18} className="text-gray-400" />
            {isRTL ? 'الاشتراكات حسب الخطة' : 'Subscriptions by Plan'}
          </h3>
          <div className="space-y-5">
            {stats.subscriptions.by_plan.length > 0 ? (
              stats.subscriptions.by_plan.map((plan, index) => {
                const percentage = Math.min((plan.active_subscriptions_count / Math.max(stats.subscriptions.active, 1)) * 100, 100);
                return (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900 dark:text-white">{plan.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">${plan.price}/{isRTL ? 'شهر' : 'mo'}</p>
                    </div>
                    <div className="flex items-center gap-3 w-1/2">
                      <div className="h-2 flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500 group-hover:bg-indigo-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white min-w-[2rem] text-right">
                        {plan.active_subscriptions_count}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText size={32} className="mx-auto mb-3 opacity-50" />
                <p>{isRTL ? 'لا توجد خطط' : 'No plans configured'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <TrendingUp size={18} className="text-gray-400" />
          {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
        </h3>
        <div className="space-y-4">
          {stats.recent_activity.length > 0 ? (
            stats.recent_activity.map((activity, index) => {
              const ActivityIcon = getActivityIcon(activity.action);
              return (
                <div key={index} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <ActivityIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      <span className="font-semibold">{activity.user?.name || 'System'}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">{activity.action.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <RefreshCw size={32} className="mx-auto mb-3 opacity-50" />
              <p>{isRTL ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
