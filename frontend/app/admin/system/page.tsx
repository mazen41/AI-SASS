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
      <div className="loading-container">
        <div className="spinner" />
        <style jsx>{`
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
        `}</style>
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
    <div className="system-health" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="header">
        <div className="status-badge" style={{ background: getStatusColor(health.status) }}>
          {renderStatusIcon(health.status, 16)}
          <span>{t[health.status as keyof typeof t]}</span>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          {t.refresh}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="overview-grid">
        <div className="overview-card">
          <Clock size={20} color="#6366f1" />
          <div>
            <p className="label">{t.uptime}</p>
            <p className="value">{health.uptime}</p>
          </div>
        </div>
        <div className="overview-card">
          <Zap size={20} color="#6366f1" />
          <div>
            <p className="label">{t.phpVersion}</p>
            <p className="value">{health.php_version}</p>
          </div>
        </div>
        <div className="overview-card">
          <Server size={20} color="#6366f1" />
          <div>
            <p className="label">{t.laravelVersion}</p>
            <p className="value">{health.laravel_version}</p>
          </div>
        </div>
      </div>

      {/* System Components */}
      <div className="components-grid">
        {/* Database */}
        <div className="component-card">
          <div className="component-header">
            <Database size={18} />
            <span>{t.database}</span>
            <span className="status-dot" style={{ background: getStatusColor(health.database.status) }} />
          </div>
          <div className="component-details">
            <p><strong>{t.status}:</strong> {t[health.database.status as keyof typeof t]}</p>
            <p><strong>{t.type}:</strong> {health.database.type}</p>
            <p><strong>{t.size}:</strong> {health.database.size}</p>
          </div>
        </div>

        {/* Cache */}
        <div className="component-card">
          <div className="component-header">
            <HardDrive size={18} />
            <span>{t.cache}</span>
            <span className="status-dot" style={{ background: getStatusColor(health.cache.status) }} />
          </div>
          <div className="component-details">
            <p><strong>{t.status}:</strong> {t[health.cache.status as keyof typeof t]}</p>
            <p><strong>{t.driver}:</strong> {health.cache.driver}</p>
          </div>
        </div>

        {/* Queue */}
        <div className="component-card">
          <div className="component-header">
            <Activity size={18} />
            <span>{t.queue}</span>
            <span className="status-dot" style={{ background: getStatusColor(health.queue.status) }} />
          </div>
          <div className="component-details">
            <p><strong>{t.status}:</strong> {t[health.queue.status as keyof typeof t]}</p>
            <p><strong>{t.pendingJobs}:</strong> {health.queue.pending_jobs}</p>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="resources-grid">
        <div className="resource-card">
          <div className="resource-header">
            <HardDrive size={18} />
            <span>{t.storage}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${health.storage.percentage}%` }} />
          </div>
          <p className="resource-text">{health.storage.used} / {health.storage.total} ({health.storage.percentage}%)</p>
        </div>

        <div className="resource-card">
          <div className="resource-header">
            <MemoryStick size={18} />
            <span>{t.memory}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${health.memory.percentage}%` }} />
          </div>
          <p className="resource-text">{health.memory.used} / {health.memory.limit} ({health.memory.percentage}%)</p>
        </div>
      </div>

      {/* Services */}
      <div className="card">
        <h3 className="card-title">
          <Globe size={18} />
          {t.services}
        </h3>
        <div className="services-list">
          {health.services.map((service, index) => (
            <div key={index} className="service-item">
              <div className="service-info">
                {renderStatusIcon(service.status, 16)}
                <span className="service-name">{service.name}</span>
              </div>
              <div className="service-status">
                {service.latency && <span className="latency">{service.latency} {t.ms}</span>}
                <span className="status-text" style={{ color: getStatusColor(service.status) }}>
                  {t[service.status as keyof typeof t]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="card">
        <h3 className="card-title">
          <AlertTriangle size={18} />
          {t.recentErrors}
        </h3>
        {health.recent_errors.length > 0 ? (
          <div className="errors-list">
            {health.recent_errors.map((error, index) => (
              <div key={index} className="error-item">
                <span className={`error-level ${error.level}`}>{error.level}</span>
                <span className="error-message">{error.message}</span>
                <span className="error-time">{error.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">{t.noErrors}</p>
        )}
      </div>

      <style jsx>{`
        .system-health {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-btn :global(.spinning) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .overview-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .overview-card .label {
          color: #64748b;
          font-size: 0.8rem;
          margin: 0;
        }

        .overview-card .value {
          color: #1e293b;
          font-weight: 600;
          margin: 0;
        }

        .components-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .component-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
        }

        .component-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1e293b;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-left: auto;
        }

        [dir="rtl"] .status-dot {
          margin-left: 0;
          margin-right: auto;
        }

        .component-details p {
          color: #64748b;
          font-size: 0.85rem;
          margin: 0.25rem 0;
        }

        .component-details strong {
          color: #1e293b;
        }

        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .resource-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
        }

        .resource-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1e293b;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .progress-bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #6366f1;
          border-radius: 4px;
          transition: width 0.3s;
        }

        .resource-text {
          color: #64748b;
          font-size: 0.8rem;
          margin: 0.5rem 0 0;
        }

        .card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1e293b;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0 0 1rem;
        }

        .services-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .service-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .service-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .service-name {
          color: #1e293b;
          font-weight: 500;
        }

        .service-status {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .latency {
          color: #64748b;
          font-size: 0.8rem;
        }

        .status-text {
          font-weight: 500;
          font-size: 0.85rem;
        }

        .empty-text {
          color: #94a3b8;
          text-align: center;
          padding: 1rem;
          margin: 0;
        }

        .errors-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .error-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #fef2f2;
          border-radius: 8px;
        }

        .error-level {
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .error-level.error {
          background: #fee2e2;
          color: #dc2626;
        }

        .error-level.warning {
          background: #fef3c7;
          color: #d97706;
        }

        .error-message {
          flex: 1;
          color: #1e293b;
          font-size: 0.85rem;
        }

        .error-time {
          color: #64748b;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
