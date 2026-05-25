'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLang } from '@/context/LangContext';
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
} from 'lucide-react';

type Tab = 'settings' | 'templates' | 'logs';

export default function EmailPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const [activeTab, setActiveTab] = useState<Tab>('settings');

  const t = {
    title: isRTL ? 'الإعدادات البريدية' : 'Email Settings',
    settings: isRTL ? 'إعدادات SMTP' : 'SMTP Settings',
    templates: isRTL ? 'قوالب البريد' : 'Email Templates',
    logs: isRTL ? 'سجل الإرسال' : 'Mail Logs',
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
    seedDefaults: isRTL ? 'إضافة القوالب الافتراضية' : 'Add Default Templates',
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

  const tabs = [
    { key: 'settings' as Tab, label: t.settings, icon: Settings },
    { key: 'templates' as Tab, label: t.templates, icon: FileText },
    { key: 'logs' as Tab, label: t.logs, icon: Mail },
  ];

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isRTL ? 'إدارة إعدادات البريد الإلكتروني والقوالب' : 'Manage email settings and templates'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'settings' && <SettingsTab t={t} isRTL={isRTL} />}
          {activeTab === 'templates' && <TemplatesTab t={t} isRTL={isRTL} />}
          {activeTab === 'logs' && <LogsTab t={t} isRTL={isRTL} />}
        </div>
      </div>
    </div>
  );
}

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

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {message && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 animate-fade-in">
          <CheckCircle size={20} />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 animate-fade-in">
          <XCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div>
          <label className={labelClass}>{t.driver}</label>
          <select 
            value={settings.driver} 
            onChange={(e) => setSettings({ ...settings, driver: e.target.value })}
            className={inputClass}
          >
            <option value="smtp">SMTP</option>
            <option value="sendmail">Sendmail</option>
            <option value="mailgun">Mailgun</option>
            <option value="postmark">Postmark</option>
            <option value="ses">Amazon SES</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>{t.host}</label>
          <input 
            type="text" 
            value={settings.host} 
            onChange={(e) => setSettings({ ...settings, host: e.target.value })} 
            placeholder="smtp.example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{t.port}</label>
          <input 
            type="number" 
            value={settings.port} 
            onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 0 })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{t.encryption}</label>
          <select 
            value={settings.encryption} 
            onChange={(e) => setSettings({ ...settings, encryption: e.target.value })}
            className={inputClass}
          >
            <option value="tls">TLS</option>
            <option value="ssl">SSL</option>
            <option value="none">None</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>{t.username}</label>
          <input 
            type="text" 
            value={settings.username} 
            onChange={(e) => setSettings({ ...settings, username: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{t.password}</label>
          <input 
            type="password" 
            value={settings.password} 
            onChange={(e) => setSettings({ ...settings, password: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{t.fromAddress}</label>
          <input 
            type="email" 
            value={settings.from_address} 
            onChange={(e) => setSettings({ ...settings, from_address: e.target.value })} 
            placeholder="noreply@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{t.fromName}</label>
          <input 
            type="text" 
            value={settings.from_name} 
            onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={settings.is_enabled} 
            onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
        </label>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.enabled}</span>
        {settings.is_enabled && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 rounded-full">
            {isRTL ? 'نشط' : 'Active'}
          </span>
        )}
      </div>

      {/* Save Button */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {loading ? t.loading : t.save}
        </button>
      </div>

      {/* Test Connection Section */}
      <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Send size={20} className="text-indigo-500" />
          {t.test}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="email" 
            value={testEmail} 
            onChange={(e) => setTestEmail(e.target.value)} 
            placeholder={t.testEmail}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button 
            onClick={handleTest} 
            disabled={testLoading || !testEmail}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            {testLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {testLoading ? t.loading : t.sendTest}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

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
      {/* Success Message */}
      {message && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400">
          <CheckCircle size={20} />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setEditing({ id: 0, key: '', name: '', subject: '', html_content: '', text_content: '', description: '', is_active: true, variables: [] } as MailTemplate)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} />
          {t.addTemplate}
        </button>
        <button 
          onClick={handleSeed}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
        >
          <RefreshCw size={18} />
          {t.seedDefaults}
        </button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Mail size={48} className="mx-auto mb-4 opacity-50" />
          <p>{isRTL ? 'لا توجد قوالب' : 'No templates found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">{tmpl.name}</h4>
                  <span className="text-xs text-gray-400 font-mono">{tmpl.key}</span>
                </div>
                <span className={`shrink-0 ml-2 px-2.5 py-1 text-xs font-medium rounded-full ${
                  tmpl.is_active 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {tmpl.is_active ? t.active : (isRTL ? 'غير نشط' : 'Inactive')}
                </span>
              </div>
              
              {tmpl.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{tmpl.description}</p>
              )}
              
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">{t.subject}:</span> {tmpl.subject}
              </p>
              
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => handlePreview(tmpl)} 
                  title={t.preview}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button 
                  onClick={() => setEditing(tmpl)} 
                  title={t.edit}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                >
                  <FileText size={16} />
                </button>
                <button 
                  onClick={() => { setTestTemplate(tmpl); setShowTest(true); }} 
                  title={t.send}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors"
                >
                  <Send size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(tmpl.id)} 
                  title={t.delete}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 dark:hover:border-red-500 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{previewSubject}</h3>
              <button 
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900 overflow-auto max-h-[60vh]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTest && testTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTest(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t.test} - {testTemplate.name}</h3>
              <button 
                onClick={() => setShowTest(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input 
                type="email" 
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)} 
                placeholder={t.toEmail}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button 
                onClick={handleTest} 
                disabled={!testEmail || testLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
              >
                {testLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {t.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel, t, isRTL }: { template: MailTemplate; onSave: (t: Partial<MailTemplate>) => void; onCancel: () => void; t: Record<string, string>; isRTL: boolean }) {
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

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {template.id ? (isRTL ? 'تعديل القالب' : 'Edit Template') : (isRTL ? 'قالب جديد' : 'New Template')}
        </h3>
        <button 
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <XCircle size={24} />
        </button>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <label className={labelClass}>{t.templateKey}</label>
          <input 
            type="text" 
            value={form.key} 
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="welcome_email"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t.templateName}</label>
          <input 
            type="text" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Welcome Email"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{t.subject}</label>
          <input 
            type="text" 
            value={form.subject} 
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{t.description}</label>
          <input 
            type="text" 
            value={form.description ?? ''} 
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{t.htmlContent}</label>
          <textarea 
            rows={10} 
            value={form.html_content} 
            onChange={(e) => setForm({ ...form, html_content: e.target.value })}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{t.textContent}</label>
          <textarea 
            rows={5} 
            value={form.text_content ?? ''} 
            onChange={(e) => setForm({ ...form, text_content: e.target.value })}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>
        
        {/* Active Toggle */}
        <div className="sm:col-span-2 flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={form.is_active} 
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.active}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button 
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {t.save}
        </button>
        <button 
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
}

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, search]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
      bounced: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Search & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input 
            type="text" 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            placeholder={t.search}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent pl-10"
          />
          <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button 
          onClick={load}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Mail size={48} className="mx-auto mb-4 opacity-50" />
          <p>{t.noLogs}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.toEmail}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.subject}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.status}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.date}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{log.to_email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{log.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
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
              <div key={log.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">{log.to_email}</span>
                  <span className={`shrink-0 ml-2 px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(log.status)}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{log.subject}</p>
                <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString(isRTL ? 'ar' : 'en')}</p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRTL ? `${lastPage} من ${page}` : `Page ${page} of ${lastPage}`}
            </span>
            <button 
              disabled={page >= lastPage} 
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
