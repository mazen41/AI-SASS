'use client';

import { useEffect, useState } from 'react';
import { apiGetBackupSettings, apiUpdateBackupSettings, apiRunBackup, apiGetDownloadBackupUrl, BackupSettings } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import {
  Database,
  Download,
  Settings,
  Server,
  Cloud,
  FolderOpen,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';

export default function BackupPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'إدارة النسخ الاحتياطي لقاعدة البيانات' : 'Database Backup Manager',
    subtitle: isRTL ? 'تكوين وجدولة النسخ الاحتياطية اليومية وتنزيل قاعدة البيانات يدوياً.' : 'Configure daily automated backups and download database snapshots manually.',
    manualSection: isRTL ? 'نسخ احتياطي فوري' : 'On-Demand Database Actions',
    manualDesc: isRTL ? 'قم بإنشاء نسخة احتياطية فورية أو تنزيل ملف SQL مضغوط بقفل Gzip مباشرة إلى جهازك.' : 'Generate an immediate backup or download a gzipped SQL file directly to your system.',
    downloadBtn: isRTL ? 'تحميل نسخة قاعدة البيانات' : 'Download DB Snapshot',
    runBtn: isRTL ? 'تشغيل نسخة احتياطية سحابية' : 'Trigger Cloud Backup',
    running: isRTL ? 'جاري التشغيل...' : 'Running...',
    runSuccess: isRTL ? 'تم إنشاء النسخة الاحتياطية ورفعها بنجاح!' : 'Backup generated and uploaded successfully!',
    runError: isRTL ? 'فشل إنشاء النسخة الاحتياطية' : 'Backup generation failed',
    scheduleSection: isRTL ? 'جدولة النسخ الاحتياطي التلقائي' : 'Automated Backup Scheduler',
    enableBackup: isRTL ? 'تمكين النسخ الاحتياطي التلقائي اليومي' : 'Enable Daily Automated Backup',
    destination: isRTL ? 'وجهة النسخ الاحتياطي' : 'Backup Destination',
    time: isRTL ? 'وقت النسخ الاحتياطي (توقيت الخادم)' : 'Backup Time (Server Time)',
    localPath: isRTL ? 'المسار المحلي (داخل مجلد storage/app)' : 'Local Storage Path (inside storage/app)',
    saveSettings: isRTL ? 'حفظ إعدادات الجدولة' : 'Save Scheduler Settings',
    saving: isRTL ? 'جاري الحفظ...' : 'Saving...',
    saveSuccess: isRTL ? 'تم حفظ إعدادات النسخ الاحتياطي بنجاح!' : 'Backup settings saved successfully!',
    saveError: isRTL ? 'فشل حفظ إعدادات النسخ الاحتياطي' : 'Failed to save settings',
    googleFolder: isRTL ? 'معرف مجلد Google Drive' : 'Google Drive Folder ID',
    googleJson: isRTL ? 'مفتاح حساب الخدمة Google Service Account JSON' : 'Google Service Account JSON Key',
    s3Key: isRTL ? 'مفتاح S3 Access Key' : 'S3 Access Key ID',
    s3Secret: isRTL ? 'كلمة سر S3 Secret Key' : 'S3 Secret Access Key',
    s3Region: isRTL ? 'منطقة S3 Region' : 'S3 Region',
    s3Bucket: isRTL ? 'اسم الحاوية S3 Bucket' : 'S3 Bucket Name',
    s3Endpoint: isRTL ? 'رابط Endpoint مخصص (اختياري للـ S3، ومطلوب للـ Wasabi)' : 'Custom Endpoint URL (optional for S3, required for Wasabi)',
    destinations: {
      local: isRTL ? 'مخزن محلي' : 'Local Disk',
      s3: isRTL ? 'أمازون Amazon S3' : 'Amazon S3',
      wasabi: isRTL ? 'وسابي Wasabi Storage' : 'Wasabi Cloud',
      google_drive: isRTL ? 'جوجل درايف Google Drive' : 'Google Drive',
    },
    secNotice: isRTL ? 'تنبيه أمني: يتم تشفير جميع المفاتيح والمستندات المخزنة لقاعدة البيانات بشكل كامل عند الحفظ.' : 'Security Notice: All API keys and Google Drive JSON credentials are encrypted at rest using Laravel\'s secure Crypt wrapper.',
  };

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [showJsonKey, setShowJsonKey] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);

  const [form, setForm] = useState({
    is_enabled: false,
    destination: 'local',
    local_path: 'backups',
    region: '',
    bucket: '',
    endpoint: '',
    google_folder_id: '',
    backup_time: '00:00',
    s3_key: '',
    s3_secret: '',
    google_json_key: '',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { settings } = await apiGetBackupSettings();
        setSettings(settings);
        setForm({
          is_enabled: settings.is_enabled,
          destination: settings.destination,
          local_path: settings.local_path || 'backups',
          region: settings.region || '',
          bucket: settings.bucket || '',
          endpoint: settings.endpoint || '',
          google_folder_id: settings.google_folder_id || '',
          backup_time: settings.backup_time || '00:00',
          s3_key: '',
          s3_secret: '',
          google_json_key: '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Record<string, any> = {
        is_enabled: form.is_enabled,
        destination: form.destination,
        local_path: form.local_path,
        region: form.region,
        bucket: form.bucket,
        endpoint: form.endpoint,
        google_folder_id: form.google_folder_id,
        backup_time: form.backup_time,
      };

      if (form.s3_key) data.s3_key = form.s3_key;
      if (form.s3_secret) data.s3_secret = form.s3_secret;
      if (form.google_json_key) data.google_json_key = form.google_json_key;

      const response = await apiUpdateBackupSettings(data);
      alert(t.saveSuccess);
      setSettings(response.settings);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleRunBackup = async () => {
    setBackingUp(true);
    try {
      const result = await apiRunBackup();
      alert(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.runError);
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = () => {
    const url = apiGetDownloadBackupUrl();
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none";
  const labelClass = "flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Database className="text-indigo-600 dark:text-indigo-400" size={28} />
          {t.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400">
        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">{t.secNotice}</p>
      </div>

      {/* Manual Actions Row */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Server size={18} className="text-indigo-500" />
          {t.manualSection}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t.manualDesc}</p>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={16} />
            {t.downloadBtn}
          </button>
          
          <button
            onClick={handleRunBackup}
            disabled={backingUp}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {backingUp ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {backingUp ? t.running : t.runBtn}
          </button>
        </div>
      </div>

      {/* Configuration Scheduler Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock size={18} className="text-indigo-500" />
          {t.scheduleSection}
        </h3>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Enabled Switch */}
          <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer group w-fit">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {t.enableBackup}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Destination Selection */}
            <div>
              <label className={labelClass}>{t.destination}</label>
              <select
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className={inputClass}
              >
                <option value="local">{t.destinations.local}</option>
                <option value="s3">{t.destinations.s3}</option>
                <option value="wasabi">{t.destinations.wasabi}</option>
                <option value="google_drive">{t.destinations.google_drive}</option>
              </select>
            </div>

            {/* Time Picker */}
            <div>
              <label className={labelClass}>{t.time}</label>
              <input
                type="time"
                value={form.backup_time}
                onChange={(e) => setForm({ ...form, backup_time: e.target.value })}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Conditional Fields based on Destination */}
          
          {form.destination === 'local' && (
            <div className="p-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FolderOpen size={16} />
                {t.destinations.local} Configuration
              </h4>
              <div>
                <label className={labelClass}>{t.localPath}</label>
                <input
                  type="text"
                  value={form.local_path}
                  onChange={(e) => setForm({ ...form, local_path: e.target.value })}
                  placeholder="backups"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {(form.destination === 's3' || form.destination === 'wasabi') && (
            <div className="p-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Cloud size={16} />
                {form.destination === 's3' ? t.destinations.s3 : t.destinations.wasabi} Configuration
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t.s3Key}</label>
                  <input
                    type="text"
                    value={form.s3_key}
                    onChange={(e) => setForm({ ...form, s3_key: e.target.value })}
                    placeholder={settings?.has_s3_key ? 'Encrypted (leave empty to keep current)' : 'Access Key ID'}
                    className={inputClass}
                  />
                </div>
                
                <div>
                  <label className={labelClass}>
                    {t.s3Secret}
                    {settings?.has_s3_secret && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Configured</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showS3Secret ? 'text' : 'password'}
                      value={form.s3_secret}
                      onChange={(e) => setForm({ ...form, s3_secret: e.target.value })}
                      placeholder={settings?.has_s3_secret ? '•••••••••••••••• (leave empty to keep current)' : 'Secret Access Key'}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowS3Secret(!showS3Secret)}
                      className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showS3Secret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t.s3Region}</label>
                  <input
                    type="text"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="us-east-1"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t.s3Bucket}</label>
                  <input
                    type="text"
                    value={form.bucket}
                    onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                    placeholder="bucket-name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>{t.s3Endpoint}</label>
                <input
                  type="text"
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder={form.destination === 'wasabi' ? 'https://s3.us-east-1.wasabisys.com' : 'https://custom-endpoint.com'}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {form.destination === 'google_drive' && (
            <div className="p-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Cloud size={16} />
                {t.destinations.google_drive} Configuration
              </h4>
              
              <div>
                <label className={labelClass}>{t.googleFolder}</label>
                <input
                  type="text"
                  value={form.google_folder_id}
                  onChange={(e) => setForm({ ...form, google_folder_id: e.target.value })}
                  placeholder="Google Drive Folder ID (e.g. 1a2b3c4d5e...)"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t.googleJson}
                  {settings?.has_google_json_key && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Configured</span>
                  )}
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={form.google_json_key}
                    onChange={(e) => setForm({ ...form, google_json_key: e.target.value })}
                    placeholder={settings?.has_google_json_key ? 'JSON key configured. Paste new JSON contents to update.' : 'Paste full Google Cloud Service Account Credentials JSON contents here...'}
                    className={`${inputClass} font-mono text-xs`}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-medium transition-colors shadow-sm w-fit"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={16} />}
              {saving ? t.saving : t.saveSettings}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
