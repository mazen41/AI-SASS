'use client';

import { useEffect, useState } from 'react';
import {
  apiGetBackupSettings,
  apiUpdateBackupSettings,
  apiRunBackup,
  apiGetDownloadBackupUrl,
  BackupSettings,
} from '@/lib/api';
import { useLang } from '@/context/LangContext';
import StudioInput from '@/components/StudioInput';
import {
  Database,
  Download,
  Server,
  Cloud,
  FolderOpen,
  Clock,
  Check,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  Sparkles,
  HardDrive,
  Lock,
  Globe2,
  Play,
  Save,
} from 'lucide-react';

export default function BackupPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'مركز النسخ الاحتياطي' : 'Backup Control Center',
    subtitle: isRTL
      ? 'إنشاء نسخ احتياطية فورية، جدولة نسخ تلقائية يومية، وتحميل لقطات قاعدة البيانات'
      : 'Create on-demand snapshots, schedule daily automated backups, and download database exports',
    manualSection: isRTL ? 'إجراءات فورية' : 'On-Demand Actions',
    manualDesc: isRTL
      ? 'إنشاء نسخة احتياطية فورية للرفع السحابي، أو تنزيل ملف SQL مضغوط (Gzip) مباشرة.'
      : 'Generate an immediate cloud backup or download a compressed SQL snapshot to your local machine.',
    downloadBtn: isRTL ? 'تنزيل لقطة قاعدة البيانات' : 'Download DB Snapshot',
    runBtn: isRTL ? 'تشغيل نسخة احتياطية سحابية' : 'Trigger Cloud Backup',
    running: isRTL ? 'جاري النسخ الاحتياطي...' : 'Backing up...',
    runSuccess: isRTL ? 'تم إنشاء النسخة الاحتياطية بنجاح!' : 'Backup completed successfully!',
    runError: isRTL ? 'فشل النسخ الاحتياطي' : 'Backup generation failed',
    scheduleSection: isRTL ? 'جدولة النسخ التلقائي' : 'Automated Backup Scheduler',
    enableBackup: isRTL ? 'تمكين النسخ الاحتياطي التلقائي اليومي' : 'Enable Daily Automated Backups',
    destination: isRTL ? 'وجهة التخزين' : 'Storage Destination',
    time: isRTL ? 'وقت النسخ (توقيت الخادم)' : 'Backup Time (Server Timezone)',
    localPath: isRTL ? 'المسار المحلي (داخل storage/app)' : 'Local Path (inside storage/app)',
    saveSettings: isRTL ? 'حفظ إعدادات الجدولة' : 'Save Scheduler Config',
    saving: isRTL ? 'جاري الحفظ...' : 'Saving...',
    saveSuccess: isRTL ? 'تم حفظ الإعدادات بنجاح!' : 'Scheduler settings saved!',
    saveError: isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings',
    googleFolder: isRTL ? 'معرف مجلد Google Drive' : 'Google Drive Folder ID',
    googleJson: isRTL ? 'مفتاح حساب الخدمة (JSON)' : 'Service Account JSON Key',
    s3Key: isRTL ? 'مفتاح Access Key ID' : 'S3 Access Key ID',
    s3Secret: isRTL ? 'المفتاح السري (Secret Key)' : 'S3 Secret Access Key',
    s3Region: isRTL ? 'منطقة الخادم (Region)' : 'S3 Region',
    s3Bucket: isRTL ? 'اسم الحاوية (Bucket)' : 'S3 Bucket Name',
    s3Endpoint: isRTL
      ? 'رابط Endpoint (اختياري لـ S3، مطلوب لـ Wasabi)'
      : 'Custom Endpoint URL (optional for S3, required for Wasabi)',
    destinations: {
      local: isRTL ? 'القرص المحلي' : 'Local Disk',
      s3: isRTL ? 'Amazon S3' : 'Amazon S3',
      wasabi: isRTL ? 'Wasabi Cloud' : 'Wasabi Cloud',
      google_drive: isRTL ? 'Google Drive' : 'Google Drive',
    },
    secNotice: isRTL
      ? 'جميع مفاتيح الـ API والمستندات السرية مشفرة بالكامل عند الحفظ في قاعدة البيانات (AES-256).'
      : 'All API keys, secrets, and Google Drive JSON credentials are encrypted at rest using AES-256.',
  };

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
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
      const data: Record<string, unknown> = {
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
      <div className="flex flex-col items-center justify-center min-h-[480px] gap-4">
        <Loader2 size={36} className="animate-spin text-brand-blue" />
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          Loading backup configuration...
        </p>
      </div>
    );
  }

  const destIcons: Record<string, typeof Server> = {
    local: HardDrive,
    s3: Cloud,
    wasabi: Cloud,
    google_drive: Globe2,
  };
  const DestIcon = destIcons[form.destination] || Server;

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3">
          <Sparkles size={13} />
          {isRTL ? 'حماية البيانات' : 'Data Protection'}
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{t.subtitle}</p>
      </div>

      {/* Security Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-amber-800 dark:text-amber-300">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert size={18} />
          </div>
          <p className="text-xs leading-relaxed">{t.secNotice}</p>
        </div>
      </div>

      {/* On-Demand Actions */}
      <div className="studio-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.manualSection}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.manualDesc}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadBackup}
            className="py-3 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2"
          >
            <Download size={16} />
            {t.downloadBtn}
          </button>

          <button
            onClick={handleRunBackup}
            disabled={backingUp}
            className="py-3 px-6 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {backingUp ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {backingUp ? t.running : t.runBtn}
          </button>
        </div>
      </div>

      {/* Scheduler Configuration */}
      <div className="studio-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-brand-purple/10 text-brand-purple">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.scheduleSection}
            </h3>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Enable Toggle */}
          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t.enableBackup}
              </span>
              {form.is_enabled && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
                  ACTIVE
                </span>
              )}
            </div>
            <input
              type="checkbox"
              checked={form.is_enabled}
              onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
            />
          </label>

          {/* Destination & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t.destination}
              </label>
              <select
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-brand-blue"
              >
                <option value="local">{t.destinations.local}</option>
                <option value="s3">{t.destinations.s3}</option>
                <option value="wasabi">{t.destinations.wasabi}</option>
                <option value="google_drive">{t.destinations.google_drive}</option>
              </select>
            </div>

            <StudioInput
              label={t.time}
              type="time"
              value={form.backup_time}
              onChange={(e) => setForm({ ...form, backup_time: e.target.value })}
              leadIcon={<Clock size={16} />}
            />
          </div>

          {/* Destination-specific fields */}
          {form.destination === 'local' && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <HardDrive size={15} className="text-slate-500" />
                {t.destinations.local} Configuration
              </div>
              <StudioInput
                label={t.localPath}
                type="text"
                value={form.local_path}
                onChange={(e) => setForm({ ...form, local_path: e.target.value })}
                placeholder="backups"
                leadIcon={<FolderOpen size={16} />}
              />
            </div>
          )}

          {(form.destination === 's3' || form.destination === 'wasabi') && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <DestIcon size={15} className="text-orange-500" />
                {form.destination === 's3' ? t.destinations.s3 : t.destinations.wasabi} Configuration
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StudioInput
                  label={t.s3Key}
                  type="text"
                  value={form.s3_key}
                  onChange={(e) => setForm({ ...form, s3_key: e.target.value })}
                  placeholder={
                    settings?.has_s3_key ? 'Encrypted (leave empty to keep)' : 'Access Key ID'
                  }
                  leadIcon={<Database size={16} />}
                />

                <StudioInput
                  label={t.s3Secret}
                  type={showS3Secret ? 'text' : 'password'}
                  value={form.s3_secret}
                  onChange={(e) => setForm({ ...form, s3_secret: e.target.value })}
                  placeholder={
                    settings?.has_s3_secret ? '•••••••••••••••• (leave empty to keep)' : 'Secret Key'
                  }
                  leadIcon={<Lock size={16} />}
                  trailIcon={
                    <button
                      type="button"
                      onClick={() => setShowS3Secret(!showS3Secret)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showS3Secret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                <StudioInput
                  label={t.s3Region}
                  type="text"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="us-east-1"
                />

                <StudioInput
                  label={t.s3Bucket}
                  type="text"
                  value={form.bucket}
                  onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                  placeholder="my-backup-bucket"
                />
              </div>

              <StudioInput
                label={t.s3Endpoint}
                type="text"
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder={
                  form.destination === 'wasabi'
                    ? 'https://s3.us-east-1.wasabisys.com'
                    : 'https://custom-endpoint.com'
                }
                leadIcon={<Globe2 size={16} />}
              />
            </div>
          )}

          {form.destination === 'google_drive' && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Globe2 size={15} className="text-blue-500" />
                {t.destinations.google_drive} Configuration
              </div>

              <StudioInput
                label={t.googleFolder}
                type="text"
                value={form.google_folder_id}
                onChange={(e) => setForm({ ...form, google_folder_id: e.target.value })}
                placeholder="1a2b3c4d5e..."
                leadIcon={<FolderOpen size={16} />}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t.googleJson}
                  </label>
                  {settings?.has_google_json_key && (
                    <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                      <Check size={12} /> Configured
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={form.google_json_key}
                  onChange={(e) => setForm({ ...form, google_json_key: e.target.value })}
                  placeholder={
                    settings?.has_google_json_key
                      ? 'JSON key configured. Paste new contents to update.'
                      : 'Paste full Google Service Account JSON here...'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 dark:bg-black/40 border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-brand-blue resize-y"
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="py-3 px-8 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t.saving : t.saveSettings}
          </button>
        </form>
      </div>
    </div>
  );
}
