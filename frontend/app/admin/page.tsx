'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiGetAdminStats, DashboardStats } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import StudioCanvas3D from '@/components/StudioCanvas3D';
import SplitTextReveal from '@/components/SplitTextReveal';
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
  Sparkles,
  ShoppingBag,
  Package,
  Activity,
  Server,
  ShieldCheck,
  ChevronRight,
  Zap,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.06,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const formatCurrencyRows = (rows: Array<{ currency: string; total: string }>) => {
    if (!rows?.length) return '—';
    if (rows.length > 1) return isRTL ? `${rows.length} عملات` : `${rows.length} currencies`;
    const row = rows[0];
    try {
      return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
        style: 'currency', currency: row.currency, maximumFractionDigits: 2,
      }).format(Number(row.total));
    } catch {
      return `${Number(row.total).toLocaleString()} ${row.currency}`;
    }
  };

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiGetAdminStats();
        setStats(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isRTL
            ? 'فشل تحميل بيانات لوحة التحكم'
            : 'Failed to load dashboard metrics'
        );
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [isRTL]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--k-blue)]" />
        <span className="text-xs font-mono tracking-widest text-[var(--text-3)] uppercase">
          {isRTL ? 'جارٍ تحميل مؤشرات الأداء...' : 'LOADING STUDIO TELEMETRY...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 font-bold text-xs"
        >
          {isRTL ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: isRTL ? 'إجمالي المستخدمين' : 'Total Registered Users',
      value: stats.users.total,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      href: '/admin/users',
      tag: isRTL ? 'المجتمع' : 'Platform',
    },
    {
      label: isRTL ? 'المستخدمين النشطين' : 'Active Storytellers',
      value: stats.users.active,
      icon: UserCheck,
      color: 'from-emerald-500 to-teal-600',
      href: '/admin/users?status=active',
      tag: isRTL ? 'نشط الآن' : 'Active',
    },
    {
      label: isRTL ? 'المستخدمون الجدد' : 'New This Month',
      value: stats.users.new_this_month,
      icon: TrendingUp,
      color: 'from-purple-600 to-pink-600',
      change: stats.users.growth_percentage,
      href: '/admin/users?filter=new',
      tag: isRTL ? 'نمو شهري' : 'Growth',
    },
    {
      label: isRTL ? 'الاشتراكات الفعالة' : 'Active Subscriptions',
      value: stats.subscriptions.active,
      icon: RefreshCw,
      color: 'from-amber-500 to-orange-600',
      href: '/admin/subscriptions',
      tag: isRTL ? 'الخطط' : 'Recurring',
    },
    {
      label: isRTL ? 'إجمالي الإيرادات' : 'Lifetime Revenue',
      value: formatCurrencyRows(stats.revenue.total_by_currency),
      icon: DollarSign,
      color: 'from-cyan-500 to-blue-600',
      href: '/admin/transactions',
      tag: isRTL ? 'الإيرادات' : 'Revenue',
    },
    {
      label: isRTL ? 'إيرادات هذا الشهر' : 'Revenue This Month',
      value: formatCurrencyRows(stats.revenue.this_month_by_currency),
      icon: BarChart3,
      color: 'from-pink-500 to-rose-600',
      change: stats.revenue.growth_percentage,
      href: '/admin/transactions?period=month',
      tag: isRTL ? 'الشهر الحالي' : 'MTD',
    },
  ];

  const getActivityIcon = (action: string) => {
    if (action.includes('login')) return LogIn;
    if (action.includes('user')) return User;
    if (action.includes('subscription')) return RefreshCw;
    if (action.includes('payment')) return CreditCard;
    return FileText;
  };

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Welcome Studio Hero Banner ── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-white/10 text-white shadow-xl relative overflow-hidden"
      >
        {/* Micro 3D Visual in Background */}
        <div className="absolute -right-8 -top-8 w-48 h-48 sm:w-60 sm:h-60 opacity-50 pointer-events-none">
          <StudioCanvas3D variant="admin" />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{isRTL ? 'مركز التحكم والعمليات' : 'STUDIO COMMAND CENTER'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-2">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {isRTL
                ? `مرحباً بك، ${user?.name?.split(' ')[0] || 'المدير'}`
                : `Welcome, ${user?.name?.split(' ')[0] || 'Admin'}`}
            </SplitTextReveal>
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isRTL
              ? 'متابعة حية وشاملة لمؤشرات الأداء، والمستخدمين، وإيرادات البوابات، وحالة الذكاء الاصطناعي.'
              : 'Live telemetry across active storytellers, revenue gateways, neural synthesis jobs, and system health.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="text-slate-400 font-mono text-[11px]">
              {new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Key Metrics Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              variants={fadeUp}
              custom={idx}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -4 }}
              onClick={() => router.push(card.href)}
              className="studio-card-glass p-5 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-3)]">
                  {card.tag}
                </span>
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                >
                  <Icon size={20} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text-2)] mb-1 truncate">
                  {card.label}
                </p>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
                    {card.value}
                  </h3>

                  {card.change !== undefined && card.change !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        card.change >= 0
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-red-500/15 text-red-500'
                      }`}
                    >
                      {card.change >= 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      <span>{Math.abs(card.change)}%</span>
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Data Breakdown Section: Gateways & Subscriptions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gateway Revenue Distribution */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 studio-card-glass p-6"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-[var(--k-blue)]" />
              <h3 className="text-base font-bold text-[var(--text)] font-display">
                {isRTL ? 'الإيرادات حسب بوابة الدفع' : 'Revenue by Payment Gateway'}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-3)]">
              {stats.revenue.by_gateway.length} {isRTL ? 'بوابات' : 'GATEWAYS'}
            </span>
          </div>

          <div className="space-y-4">
            {stats.revenue.by_gateway.length > 0 ? (
              stats.revenue.by_gateway.map((gateway, index) => {
                const totalAmount = (stats.revenue.total_by_currency || [])
                  .filter((row) => row.currency === gateway.currency)
                  .reduce((sum, row) => sum + parseFloat(row.total || '0'), 0);
                const gwAmount = parseFloat(gateway.total || '0');
                const percent = totalAmount > 0 ? Math.min(Math.round((gwAmount / totalAmount) * 100), 100) : 0;
                const gatewayAmount = (() => {
                  try { return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { style: 'currency', currency: gateway.currency, maximumFractionDigits: 2 }).format(gwAmount); }
                  catch { return `${gwAmount.toLocaleString()} ${gateway.currency}`; }
                })();

                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--k-blue)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--k-blue)]">
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm capitalize">{gateway.gateway}</p>
                          <p className="text-[11px] text-[var(--text-3)]">
                            {gateway.count} {isRTL ? 'معاملة' : 'transactions'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right rtl:text-left">
                        <span className="font-extrabold text-sm sm:text-base gradient-text">
                          {gatewayAmount}
                        </span>
                        <span className="text-[10px] text-[var(--text-3)] block font-mono">
                          {percent}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--k-blue)] to-[var(--k-pink)] rounded-full transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-[var(--text-3)] text-xs">
                {isRTL ? 'لا توجد معاملات مسجلة بعد' : 'No gateway transactions recorded yet'}
              </div>
            )}
          </div>
        </motion.div>

        {/* Subscriptions by Plan */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 studio-card-glass p-6"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-[var(--k-navy)]" />
              <h3 className="text-base font-bold text-[var(--text)] font-display">
                {isRTL ? 'توزيع الاشتراكات بالخطة' : 'Subscriptions by Plan'}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-3)]">
              {stats.subscriptions.active} {isRTL ? 'نشط' : 'ACTIVE'}
            </span>
          </div>

          <div className="space-y-4">
            {stats.subscriptions.by_plan.length > 0 ? (
              stats.subscriptions.by_plan.map((plan, index) => {
                const percentage = Math.min(
                  Math.round(
                    (plan.active_subscriptions_count / Math.max(stats.subscriptions.active, 1)) * 100
                  ),
                  100
                );

                return (
                  <div key={index} className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-xs sm:text-sm">{plan.name}</span>
                        <span className="text-[11px] text-[var(--text-3)] ml-2 rtl:mr-2">
                          {Number(plan.price).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}/{plan.billing_period === 'yearly' ? (isRTL ? 'سنة' : 'yr') : (isRTL ? 'شهر' : 'mo')}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs sm:text-sm text-[var(--k-blue)]">
                        {plan.active_subscriptions_count} {isRTL ? 'مشترك' : 'users'}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--k-navy)] to-[var(--k-blue)] rounded-full transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-[var(--text-3)] text-xs">
                {isRTL ? 'لا توجد خطط اشتراك مضافة' : 'No subscription plans configured'}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Recent Activity Stream ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="studio-card-glass p-6"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[var(--k-pink)]" />
            <h3 className="text-base font-bold text-[var(--text)] font-display">
              {isRTL ? 'سجل النشاط المباشر' : 'Live Activity Stream'}
            </h3>
          </div>
          <button
            onClick={() => router.push('/admin/activity')}
            className="text-xs font-bold text-[var(--k-blue)] hover:underline flex items-center gap-1"
          >
            <span>{isRTL ? 'عرض الكل' : 'View Full Stream'}</span>
            <ChevronRight size={14} className="rtl:rotate-180" />
          </button>
        </div>

        <div className="space-y-3">
          {stats.recent_activity.length > 0 ? (
            stats.recent_activity.slice(0, 6).map((activity, index) => {
              const ActionIcon = getActivityIcon(activity.action);

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--k-blue)] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--k-blue)] shrink-0">
                      <ActionIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate">
                        <span className="text-[var(--text)] font-bold">
                          {activity.user?.name || (isRTL ? 'النظام' : 'System')}
                        </span>
                        <span className="text-[var(--text-2)] ml-2 rtl:mr-2 capitalize">
                          {activity.action.replace(/_/g, ' ')}
                        </span>
                      </p>
                      <span className="text-[10px] text-[var(--text-3)] font-mono">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-3)] border border-[var(--border)] shrink-0">
                    EVENT
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-[var(--text-3)] text-xs">
              {isRTL ? 'لا يوجد نشاط حديث مسجل' : 'No recent studio activity recorded'}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
