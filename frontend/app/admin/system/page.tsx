'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { apiGetSystemHealth, SystemHealth } from '@/lib/api';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  Server,
  Database,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  Globe,
  Zap,
  Loader2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export default function SystemHealthPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    title: isRTL ? 'صحة النظام والبنية التحتية' : 'System Health & Infrastructure',
    subtitle: isRTL ? 'مراقبة حية لقاعدة البيانات، وخوادم Redis، والذاكرة' : 'Real-time telemetry across database, Redis cache, queue workers, and storage',
    refresh: isRTL ? 'تحديث البيانات' : 'Refresh Telemetry',
    status: isRTL ? 'الحالة' : 'Status',
    healthy: isRTL ? 'سليم تماماً' : 'Healthy',
    warning: isRTL ? 'تحذير' : 'Warning',
    critical: isRTL ? 'حرج' : 'Critical',
    uptime: isRTL ? 'وقت تشغيل الخادم' : 'System Uptime',
    phpVersion: isRTL ? 'إصدار PHP' : 'PHP Version',
    laravelVersion: isRTL ? 'إصدار Laravel' : 'Laravel Version',
    database: isRTL ? 'قاعدة البيانات (MySQL)' : 'Database (MySQL)',
    connected: isRTL ? 'متصل' : 'Connected',
    disconnected: isRTL ? 'غير متصل' : 'Disconnected',
    cache: isRTL ? 'التخزين المؤقت (Redis)' : 'Cache Engine (Redis)',
    active: isRTL ? 'نشط' : 'Active',
    inactive: isRTL ? 'غير نشط' : 'Inactive',
    queue: isRTL ? 'طابور المهام (Queue Worker)' : 'Queue Workers',
    running: isRTL ? 'يعمل' : 'Running',
    stopped: isRTL ? 'متوقف' : 'Stopped',
    pendingJobs: isRTL ? 'المهام المعلقة' : 'Pending Jobs',
    storage: isRTL ? 'سعة التخزين' : 'Disk Storage',
    memory: isRTL ? 'استهلاك الذاكرة' : 'Memory Usage',
    services: isRTL ? 'الخدمات الخارجية والذكاء الاصطناعي' : 'External AI Services',
    online: isRTL ? 'متصل' : 'Online',
    offline: isRTL ? 'غير متصل' : 'Offline',
    recentErrors: isRTL ? 'سجل الأخطاء الأخير' : 'Recent Error Log',
    noErrors: isRTL ? 'لا توجد أخطاء مسجلة' : 'Zero system errors detected',
  };

  const loadHealth = useCallback(async () => {
    try {
      const data = await apiGetSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHealth();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 size={36} className="animate-spin text-[var(--k-blue)]" />
        <span className="text-xs font-mono text-[var(--text-3)] uppercase">DIAGNOSING SYSTEM TELEMETRY...</span>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--k-blue)] uppercase tracking-wider mb-1">
            <Server size={14} />
            <span>INFRASTRUCTURE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {t.title}
            </SplitTextReveal>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
              health.status === 'healthy'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{t[health.status as keyof typeof t] || health.status}</span>
          </span>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="studio-btn-secondary px-4 py-2 text-xs font-bold"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{t.refresh}</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="studio-card-glass p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-3)] mb-2 font-mono">
            <span>UPTIME</span>
            <Clock size={16} className="text-[var(--k-blue)]" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-display text-[var(--text)]">{health.uptime}</div>
          <div className="text-[10px] text-[var(--text-3)] mt-1">Continuous operation</div>
        </div>

        <div className="studio-card-glass p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-3)] mb-2 font-mono">
            <span>DATABASE</span>
            <Database size={16} className="text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-display text-[var(--text)]">
            {health.database.status === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
          <div className="text-[10px] text-[var(--text-3)] mt-1">{health.database.type} · Size: {health.database.size}</div>
        </div>

        <div className="studio-card-glass p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-3)] mb-2 font-mono">
            <span>QUEUE WORKER</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-display text-[var(--text)]">
            {health.queue.pending_jobs} Pending
          </div>
          <div className="text-[10px] text-[var(--text-3)] mt-1">Status: {health.queue.status}</div>
        </div>

        <div className="studio-card-glass p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-3)] mb-2 font-mono">
            <span>RUNTIME</span>
            <Cpu size={16} className="text-[var(--k-navy)]" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-display text-[var(--text)]">
            PHP {health.php_version}
          </div>
          <div className="text-[10px] text-[var(--text-3)] mt-1">Laravel v{health.laravel_version}</div>
        </div>
      </div>

      {/* Storage and Memory Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="studio-card-glass p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
            <span className="font-bold text-sm text-[var(--text)]">{t.storage}</span>
            <span className="text-xs font-mono text-[var(--text-3)]">
              {health.storage.used} / {health.storage.total}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-[var(--k-blue)] to-[var(--k-mint)] rounded-full"
              style={{ width: `${health.storage.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-3)] font-mono">
            <span>Disk Usage</span>
            <span>{health.storage.percentage}%</span>
          </div>
        </div>

        <div className="studio-card-glass p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
            <span className="font-bold text-sm text-[var(--text)]">{t.memory}</span>
            <span className="text-xs font-mono text-[var(--text-3)]">
              {health.memory.used} / {health.memory.limit}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-[var(--k-navy)] to-[var(--k-pink)] rounded-full"
              style={{ width: `${health.memory.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-3)] font-mono">
            <span>RAM Usage</span>
            <span>{health.memory.percentage}%</span>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="studio-card-glass p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
          <span className="font-bold text-sm text-[var(--text)]">{t.recentErrors}</span>
          <span className="text-xs font-mono text-[var(--text-3)]">
            {health.recent_errors.length} {isRTL ? 'سجلات' : 'LOG ENTRIES'}
          </span>
        </div>

        {health.recent_errors.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            <span>{t.noErrors}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {health.recent_errors.map((err, i) => (
              <div key={i} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-center justify-between">
                <span>{err.message}</span>
                <span className="text-[10px] opacity-75">{err.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
