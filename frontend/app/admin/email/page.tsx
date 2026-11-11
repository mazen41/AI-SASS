'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLang } from '@/context/LangContext';
import StudioInput from '@/components/StudioInput';
import {
  apiGetMailSettings,
  apiSaveMailSettings,
  apiTestMailConnection,
  apiGetMailTemplates,
  apiSaveMailTemplate,
  apiDeleteMailTemplate,
  apiPreviewMailTemplate,
  apiTestMailTemplate,
  apiSeedMailTemplates,
  apiGetMailLogs,
  type MailSetting,
  type MailTemplate,
  type MailLog,
} from '@/lib/api';
import {
  Mail,
  Settings,
  FileText,
  Eye,
  Send,
  Save,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Server,
  Code2,
  Lock,
  Inbox,
  X,
  Search,
} from 'lucide-react';

type Tab = 'settings' | 'templates' | 'logs';

export default function EmailPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const [activeTab, setActiveTab] = useState<Tab>('settings');

  const t = {
    title: isRTL ? 'محرك البريد الإلكتروني' : 'Email Delivery Engine',
    subtitle: isRTL
      ? 'تكوين خادم SMTP، إدارة قوالب البريد الإلكتروني، وسجل الرسائل المرسلة'
      : 'Configure SMTP transports, manage email templates, and inspect delivery logs',
    settings: isRTL ? 'إعدادات SMTP' : 'SMTP Transport',
    templates: isRTL ? 'قوالب البريد' : 'Email Templates',
    logs: isRTL ? 'سجل الإرسال' : 'Delivery Logs',
    driver: isRTL ? 'المشغل' : 'Driver',
    host: isRTL ? 'الخادم' : 'Host',
    port: isRTL ? 'المنفذ' : 'Port',
    encryption: isRTL ? 'التشفير' : 'Encryption',
    username: isRTL ? 'اسم المستخدم' : 'Username',
    password: isRTL ? 'كلمة المرور' : 'Password',
    fromAddress: isRTL ? 'عنوان المرسل' : 'From Address',
    fromName: isRTL ? 'اسم المرسل' : 'From Name',
    enabled: isRTL ? 'مفعّل' : 'Enabled',
    save: isRTL ? 'حفظ الإعدادات' : 'Save Settings',
    test: isRTL ? 'اختبار الاتصال' : 'Test Connection',
    testEmail: isRTL ? 'بريد الاختبار' : 'Test Email',
    sendTest: isRTL ? 'إرسال اختبار' : 'Send Test',
    templateName: isRTL ? 'اسم القالب' : 'Template Name',
    templateKey: isRTL ? 'مفتاح القالب' : 'Template Key',
    subject: isRTL ? 'الموضوع' : 'Subject',
    htmlContent: isRTL ? 'محتوى HTML' : 'HTML Content',
    textContent: isRTL ? 'محتوى نصي' : 'Text Content',
    description: isRTL ? 'الوصف' : 'Description',
    active: isRTL ? 'نشط' : 'Active',
    variables: isRTL ? 'المتغيرات' : 'Variables',
    preview: isRTL ? 'معاينة' : 'Preview',
    edit: isRTL ? 'تعديل' : 'Edit',
    delete: isRTL ? 'حذف' : 'Delete',
    addTemplate: isRTL ? 'قالب جديد' : 'New Template',
    seedDefaults: isRTL ? 'إضافة القوالب الافتراضية' : 'Seed Default Templates',
    close: isRTL ? 'إغلاق' : 'Close',
    toEmail: isRTL ? 'إلى البريد' : 'To Email',
    send: isRTL ? 'إرسال' : 'Send',
    status: isRTL ? 'الحالة' : 'Status',
    pending: isRTL ? 'قيد الانتظار' : 'Pending',
    sent: isRTL ? 'تم الإرسال' : 'Sent',
    failed: isRTL ? 'فشل' : 'Failed',
    bounced: isRTL ? 'مرتد' : 'Bounced',
    search: isRTL ? 'بحث...' : 'Search...',
    noLogs: isRTL ? 'لا توجد سجلات' : 'No logs found',
    loading: isRTL ? 'جار التحميل...' : 'Loading...',
    saved: isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully',
    error: isRTL ? 'حدث خطأ' : 'An error occurred',
    testSent: isRTL ? 'تم إرسال الاختبار' : 'Test sent successfully',
    confirmDelete: isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?',
    date: isRTL ? 'التاريخ' : 'Date',
  };

  const tabs: { key: Tab; label: string; icon: typeof Mail; count?: string }[] = [
    { key: 'settings', label: t.settings, icon: Settings },
    { key: 'templates', label: t.templates, icon: Code2 },
    { key: 'logs', label: t.logs, icon: Inbox },
  ];

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-purple/10 border border-brand-purple/20 text-brand-purple mb-3">
          <Sparkles size={13} />
          {isRTL ? 'نظام البريد الإلكتروني' : 'Mail Subsystem'}
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{t.subtitle}</p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg shadow-brand-blue/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="studio-card p-6 md:p-8">
        {activeTab === 'settings' && <SettingsTab t={t} isRTL={isRTL} />}
        {activeTab === 'templates' && <TemplatesTab t={t} isRTL={isRTL} />}
        {activeTab === 'logs' && <LogsTab t={t} isRTL={isRTL} />}
      </div>
    </div>
  );
}

/* ─── SMTP Settings Tab ─── */
function SettingsTab({ t, isRTL }: { t: Record<string, string>; isRTL: boolean }) {
  const [settings, setSettings] = useState<MailSetting>({
    driver: 'smtp',
    host: '',
    port: 587,
    encryption: 'tls',
    username: '',
    password: '',
    from_address: '',
    from_name: '',
    is_enabled: false,
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiGetMailSettings().then((res) => {
      if (res.settings) setSettings(res.settings);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await apiSaveMailSettings(settings);
      setMessage(t.saved);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.error);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTestLoading(true);
    setMessage('');
    setError('');
    try {
      await apiTestMailConnection(testEmail);
      setMessage(t.testSent);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.error);
      setTimeout(() => setError(''), 5000);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alerts */}
      {message && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
          <CheckCircle size={18} />
          <span className="text-xs font-semibold">{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/[0.06] border border-red-500/20 text-red-700 dark:text-red-400">
          <XCircle size={18} />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t.driver}
          </label>
          <select
            value={settings.driver}
            onChange={(e) => setSettings({ ...settings, driver: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-brand-blue"
          >
            <option value="smtp">SMTP</option>
            <option value="sendmail">Sendmail</option>
            <option value="mailgun">Mailgun</option>
            <option value="postmark">Postmark</option>
            <option value="ses">Amazon SES</option>
          </select>
        </div>

        <StudioInput
          label={t.host}
          type="text"
          value={settings.host}
          onChange={(e) => setSettings({ ...settings, host: e.target.value })}
          placeholder="smtp.example.com"
          leadIcon={<Server size={16} />}
        />

        <StudioInput
          label={t.port}
          type="number"
          value={settings.port}
          onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 0 })}
          placeholder="587"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t.encryption}
          </label>
          <select
            value={settings.encryption}
            onChange={(e) => setSettings({ ...settings, encryption: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-brand-blue"
          >
            <option value="tls">TLS (recommended)</option>
            <option value="ssl">SSL</option>
            <option value="none">None</option>
          </select>
        </div>

        <StudioInput
          label={t.username}
          type="text"
          value={settings.username}
          onChange={(e) => setSettings({ ...settings, username: e.target.value })}
          placeholder="user@example.com"
          leadIcon={<Mail size={16} />}
        />

        <StudioInput
          label={t.password}
          type="password"
          value={settings.password}
          onChange={(e) => setSettings({ ...settings, password: e.target.value })}
          placeholder="••••••••"
          leadIcon={<Lock size={16} />}
        />

        <StudioInput
          label={t.fromAddress}
          type="email"
          value={settings.from_address}
          onChange={(e) => setSettings({ ...settings, from_address: e.target.value })}
          placeholder="noreply@nazstudio.art"
          leadIcon={<Send size={16} />}
        />

        <StudioInput
          label={t.fromName}
          type="text"
          value={settings.from_name}
          onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
          placeholder="NazStudio"
        />
      </div>

      {/* Enable Toggle */}
      <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 cursor-pointer">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {t.enabled}
          </span>
          {settings.is_enabled && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
              ACTIVE
            </span>
          )}
        </div>
        <input
          type="checkbox"
          checked={settings.is_enabled}
          onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
          className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
        />
      </label>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="py-3 px-8 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {loading ? t.loading : t.save}
      </button>

      {/* Test Connection Block */}
      <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Send size={16} className="text-brand-blue" />
          {t.test}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <StudioInput
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={t.testEmail}
              leadIcon={<Mail size={16} />}
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testLoading || !testEmail}
            className="py-3 px-6 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {testLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {testLoading ? t.loading : t.sendTest}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Templates Tab ─── */
function TemplatesTab({ t, isRTL }: { t: Record<string, string>; isRTL: boolean }) {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTest, setShowTest] = useState(false);
  const [testTemplate, setTestTemplate] = useState<MailTemplate | null>(null);
  const [message, setMessage] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetMailTemplates();
      setTemplates(res.templates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (template: Partial<MailTemplate>) => {
    try {
      await apiSaveMailTemplate(template as Partial<MailTemplate> & { id?: number });
      setEditing(null);
      load();
      setMessage(t.saved);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage(t.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await apiDeleteMailTemplate(id);
      load();
    } catch {
      /* ignore */
    }
  };

  const handlePreview = async (template: MailTemplate) => {
    try {
      const res = await apiPreviewMailTemplate(template.html_content, template.subject);
      setPreviewHtml(res.html);
      setPreviewSubject(res.subject);
      setShowPreview(true);
    } catch {
      /* ignore */
    }
  };

  const handleTest = async () => {
    if (!testTemplate || !testEmail) return;
    setTestLoading(true);
    try {
      await apiTestMailTemplate(testTemplate.key, testEmail);
      setMessage(t.testSent);
      setShowTest(false);
      setTestEmail('');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage(t.error);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      await apiSeedMailTemplates();
      load();
    } catch {
      /* ignore */
    }
  };

  if (editing) {
    return (
      <TemplateEditor
        template={editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        t={t}
        isRTL={isRTL}
      />
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
          <CheckCircle size={18} />
          <span className="text-xs font-semibold">{message}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            setEditing({
              id: 0,
              key: '',
              name: '',
              subject: '',
              html_content: '',
              text_content: '',
              description: '',
              is_active: true,
              variables: [],
            } as MailTemplate)
          }
          className="py-2.5 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 shadow-md shadow-brand-blue/20 flex items-center gap-2 transition-all"
        >
          <Plus size={16} />
          {t.addTemplate}
        </button>
        <button
          onClick={handleSeed}
          className="py-2.5 px-5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-2"
        >
          <RefreshCw size={14} />
          {t.seedDefaults}
        </button>
      </div>

      {/* Template Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-blue" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <Mail size={44} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">{isRTL ? 'لا توجد قوالب' : 'No templates found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="studio-card p-5 flex flex-col gap-3 hover:border-brand-blue/30 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {tmpl.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">{tmpl.key}</span>
                </div>
                <span
                  className={`shrink-0 ms-2 px-2.5 py-1 text-[10px] font-mono font-medium rounded-full ${
                    tmpl.is_active
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}
                >
                  {tmpl.is_active ? t.active : isRTL ? 'غير نشط' : 'Inactive'}
                </span>
              </div>

              {tmpl.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tmpl.description}
                </p>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-400">{t.subject}:</span> {tmpl.subject}
              </p>

              <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => handlePreview(tmpl)}
                  title={t.preview}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => setEditing(tmpl)}
                  title={t.edit}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-brand-purple hover:bg-brand-purple/10 transition-colors"
                >
                  <FileText size={15} />
                </button>
                <button
                  onClick={() => {
                    setTestTemplate(tmpl);
                    setShowTest(true);
                  }}
                  title={t.send}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                >
                  <Send size={15} />
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleDelete(tmpl.id)}
                  title={t.delete}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="studio-card max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{previewSubject}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className="p-6 bg-white dark:bg-slate-900 overflow-auto max-h-[60vh]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}

      {/* Send Test Modal */}
      {showTest && testTemplate && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowTest(false)}
        >
          <div
            className="studio-card max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t.test} — {testTemplate.name}
              </h3>
              <button
                onClick={() => setShowTest(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <StudioInput
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={t.toEmail}
                leadIcon={<Mail size={16} />}
              />
              <button
                onClick={handleTest}
                disabled={!testEmail || testLoading}
                className="w-full py-3 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {testLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Template Editor ─── */
function TemplateEditor({
  template,
  onSave,
  onCancel,
  t,
  isRTL,
}: {
  template: MailTemplate;
  onSave: (t: Partial<MailTemplate>) => void;
  onCancel: () => void;
  t: Record<string, string>;
  isRTL: boolean;
}) {
  const [form, setForm] = useState<Partial<MailTemplate>>({
    id: template.id || undefined,
    key: template.key,
    name: template.name,
    subject: template.subject,
    html_content: template.html_content,
    text_content: template.text_content ?? '',
    description: template.description ?? '',
    is_active: template.is_active ?? true,
    variables: template.variables || [],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {template.id
            ? isRTL
              ? 'تعديل القالب'
              : 'Edit Template'
            : isRTL
            ? 'قالب جديد'
            : 'New Template'}
        </h3>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StudioInput
          label={t.templateKey}
          type="text"
          value={form.key ?? ''}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
          placeholder="welcome_email"
          leadIcon={<Code2 size={16} />}
        />

        <StudioInput
          label={t.templateName}
          type="text"
          value={form.name ?? ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Welcome Email"
          leadIcon={<FileText size={16} />}
        />

        <div className="sm:col-span-2">
          <StudioInput
            label={t.subject}
            type="text"
            value={form.subject ?? ''}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Welcome to NazStudio"
            leadIcon={<Mail size={16} />}
          />
        </div>

        <div className="sm:col-span-2">
          <StudioInput
            label={t.description}
            type="text"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t.htmlContent}
          </label>
          <textarea
            rows={10}
            value={form.html_content ?? ''}
            onChange={(e) => setForm({ ...form, html_content: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 dark:bg-black/40 border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-brand-blue resize-y"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t.textContent}
          </label>
          <textarea
            rows={5}
            value={form.text_content ?? ''}
            onChange={(e) => setForm({ ...form, text_content: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-brand-blue resize-y"
          />
        </div>

        {/* Active Toggle */}
        <div className="sm:col-span-2">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 cursor-pointer">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t.active}
            </span>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
            />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="py-3 px-8 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 shadow-md shadow-brand-blue/20 flex items-center gap-2 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t.save}
        </button>
        <button
          onClick={onCancel}
          className="py-3 px-8 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
}

/* ─── Mail Logs Tab ─── */
function LogsTab({ t, isRTL }: { t: Record<string, string>; isRTL: boolean }) {
  const [logs, setLogs] = useState<MailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      const res = await apiGetMailLogs(params);
      setLogs(res.data);
      setLastPage(res.last_page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => void load(), 10000);
    return () => clearInterval(interval);
  }, [load]);

  const statusStyle = (status: string) => {
    const m: Record<string, string> = {
      sent: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
      bounced: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return m[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Search & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <StudioInput
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t.search}
            leadIcon={<Search size={16} />}
          />
        </div>
        <button
          onClick={load}
          className="py-3 px-5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-2 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-blue" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <Inbox size={44} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">{t.noLogs}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <th className="px-5 py-3 text-start text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    {t.toEmail}
                  </th>
                  <th className="px-5 py-3 text-start text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    {t.subject}
                  </th>
                  <th className="px-5 py-3 text-start text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    {t.status}
                  </th>
                  <th className="px-5 py-3 text-start text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    {t.date}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-900 dark:text-white">
                      {log.to_email}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {log.subject}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 text-[10px] font-mono font-medium rounded-full border capitalize ${statusStyle(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleString(isRTL ? 'ar' : 'en')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="studio-card p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-slate-900 dark:text-white truncate flex-1">
                    {log.to_email}
                  </span>
                  <span
                    className={`shrink-0 ms-2 px-2.5 py-1 text-[10px] font-mono font-medium rounded-full border capitalize ${statusStyle(
                      log.status
                    )}`}
                  >
                    {log.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{log.subject}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleString(isRTL ? 'ar' : 'en')}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-30 transition-colors flex items-center justify-center"
            >
              {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <span className="text-xs text-slate-500 font-mono">
              {isRTL ? `${lastPage} من ${page}` : `${page} / ${lastPage}`}
            </span>
            <button
              disabled={page >= lastPage}
              onClick={() => setPage(page + 1)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-30 transition-colors flex items-center justify-center"
            >
              {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
