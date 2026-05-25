'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { apiGetSystemHealth, SystemHealth } from '@/lib/api';
import {
  Server,
  Database,
  HardDrive,
  MemoryStick,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  Globe,
  Zap,
  Loader2
} from 'lucide-react';

export default function SystemHealthPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    title: isRTL ? 'صحة النظام' : 'System Health',
    refresh: isRTL ? 'تحديث' : 'Refresh',
    status: isRTL ? 'الحالة' : 'Status',
    healthy: isRTL ? 'سليم' : 'Healthy',
    warning: isRTL ? 'تحذير' : 'Warning',
    critical: isRTL ? 'حرج' : 'Critical',
    uptime: isRTL ? 'وقت التشغيل' : 'Uptime',
    phpVersion: isRTL ? 'إصدار PHP' : 'PHP Version',
    laravelVersion: isRTL ? 'إصدار Laravel' : 'Laravel Version',
    database: isRTL ? 'قاعدة البيانات' : 'Database',
    connected: isRTL ? 'متصل' : 'Connected',
    disconnected: isRTL ? 'غير متصل' : 'Disconnected',
    cache: isRTL ? 'التخزين المؤقت' : 'Cache',
    active: isRTL ? 'نشط' : 'Active',
    inactive: isRTL ? 'غير نشط' : 'Inactive',
    queue: isRTL ? 'قائمة الانتظار' : 'Queue',
    running: isRTL ? 'يعمل' : 'Running',
    stopped: isRTL ? 'متوقف' : 'Stopped',
    pendingJobs: isRTL ? 'المهام المعلقة' : 'Pending Jobs',
    storage: isRTL ? 'التخزين' : 'Storage',
    memory: isRTL ? 'الذاكرة' : 'Memory',
    services: isRTL ? 'الخدمات' : 'Services',
    online: isRTL ? 'متصل' : 'Online',
    offline: isRTL ? 'غير متصل' : 'Offline',
    recentErrors: isRTL ? 'الأخطاء الأخيرة' : 'Recent Errors',
    noErrors: isRTL ? 'لا توجد أخطاء' : 'No errors',
    ms: isRTL ? 'مللي ثانية' : 'ms',
    type: isRTL ? 'النوع' : 'Type',
    size: isRTL ? 'الحجم' : 'Size',
    driver: isRTL ? 'المشغل' : 'Driver',
  };

  const loadHealth = async () => {
    try {
      const data = await apiGetSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadHealth();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHealth();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'active':
      case 'running':
      case 'online':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'critical':
      case 'disconnected':
      case 'inactive':
      case 'stopped':
      case 'offline':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!health) return null;

  const renderStatusIcon = (status: string, size: number) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'active':
      case 'running':
      case 'online':
        return <CheckCircle size={size} color={getStatusColor(status)} />;
      case 'warning':
        return <AlertTriangle size={size} color={getStatusColor(status)} />;
      default:
        return <XCircle size={size} color={getStatusColor(status)} />;
    }
  };

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium text-sm shadow-sm" style={{ background: getStatusColor(health.status) }}>
          {renderStatusIcon(health.status, 16)}
          <span>{t[health.status as keyof typeof t]}</span>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm" 
          onClick={handleRefresh} 
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {t.refresh}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">{t.uptime}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{health.uptime}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">{t.phpVersion}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{health.php_version}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Server size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">{t.laravelVersion}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{health.laravel_version}</p>
          </div>
        </div>
      </div>

      {/* System Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Database */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold mb-4">
            <Database size={18} className="text-gray-400 dark:text-gray-500" />
            <span>{t.database}</span>
            <span className="w-2.5 h-2.5 rounded-full ml-auto rtl:ml-0 rtl:mr-auto shadow-sm" style={{ background: getStatusColor(health.database.status) }} />
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200 font-medium">{t.status}:</strong> 
              <span>{t[health.database.status as keyof typeof t]}</span>
            </p>
            <p className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200 font-medium">{t.type}:</strong> 
              <span>{health.database.type}</span>
            </p>
            <p className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200 font-medium">{t.size}:</strong> 
              <span>{health.database.size}</span>
            </p>
          </div>
        </div>

        {/* Cache */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold mb-4">
            <HardDrive size={18} className="text-gray-400 dark:text-gray-500" />
            <span>{t.cache}</span>
            <span className="w-2.5 h-2.5 rounded-full ml-auto rtl:ml-0 rtl:mr-auto shadow-sm" style={{ background: getStatusColor(health.cache.status) }} />
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200 font-medium">{t.status}:</strong> 
              <span>{t[health.cache.status as keyof typeof t]}</span>
            </p>
            <p className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200 font-medium">{t.driver}:</strong> 
              <span>{health.cache.driver}</span>
            </p>
          </div>
        </div>

        {/* Queue */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold mb-4">
            <Activity size={18} className="text-gray-400 dark:text-gray-500" />
            <span>{t.queue}</span>
            <span className="w-2.5 h-2.5 rounded-full ml-auto rtl:ml-0 rtl:mr-auto shadow-sm" style={{ background: getStatusColor(health.queue.status) }} />
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200 font-medium">{t.status}:</strong> 
              <span>{t[health.queue.status as keyof typeof t]}</span>
            </p>
            <p className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200 font-medium">{t.pendingJobs}:</strong> 
              <span>{health.queue.pending_jobs}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold mb-4">
            <HardDrive size={18} className="text-gray-400 dark:text-gray-500" />
            <span>{t.storage}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500" 
              style={{ width: `${health.storage.percentage}%` }} 
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
            <span className="font-medium text-gray-700 dark:text-gray-300">{health.storage.used}</span> / {health.storage.total} ({health.storage.percentage}%)
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold mb-4">
            <MemoryStick size={18} className="text-gray-400 dark:text-gray-500" />
            <span>{t.memory}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500" 
              style={{ width: `${health.memory.percentage}%` }} 
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
            <span className="font-medium text-gray-700 dark:text-gray-300">{health.memory.used}</span> / {health.memory.limit} ({health.memory.percentage}%)
          </p>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-gray-900 dark:text-white font-bold mb-4">
          <Globe size={18} className="text-gray-400 dark:text-gray-500" />
          {t.services}
        </h3>
        <div className="flex flex-col gap-2">
          {health.services.map((service, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                {renderStatusIcon(service.status, 16)}
                <span className="font-medium text-gray-900 dark:text-gray-200 text-sm">{service.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {service.latency && <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{service.latency} {t.ms}</span>}
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: getStatusColor(service.status) }}>
                  {t[service.status as keyof typeof t]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-gray-900 dark:text-white font-bold mb-4">
          <AlertTriangle size={18} className="text-gray-400 dark:text-gray-500" />
          {t.recentErrors}
        </h3>
        {health.recent_errors.length > 0 ? (
          <div className="flex flex-col gap-2">
            {health.recent_errors.map((error, index) => (
              <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                  ${error.level === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                `}>
                  {error.level}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 break-all sm:break-normal">{error.message}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono shrink-0 w-full sm:w-auto text-right sm:text-left mt-1 sm:mt-0">{error.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noErrors}</p>
          </div>
        )}
      </div>
    </div>
  );
}
