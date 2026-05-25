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
  };

  return (
    <div className="email-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="page-title">{t.title}</h1>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={16} />
          {t.settings}
        </button>
        <button className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
          <FileText size={16} />
          {t.templates}
        </button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <Mail size={16} />
          {t.logs}
        </button>
      </div>

      {activeTab === 'settings' && <SettingsTab t={t} />}
      {activeTab === 'templates' && <TemplatesTab t={t} isRTL={isRTL} />}
      {activeTab === 'logs' && <LogsTab t={t} isRTL={isRTL} />}

      <style jsx global>{`
        .email-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.9rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .tab-btn.active {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function SettingsTab({ t }: { t: Record<string, string> }) {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.error);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="settings-tab">
      {message && <div className="alert success"><CheckCircle size={16} /> {message}</div>}
      {error && <div className="alert error"><XCircle size={16} /> {error}</div>}

      <div className="form-grid">
        <div className="form-group">
          <label>{t.driver}</label>
          <select value={settings.driver} onChange={(e) => setSettings({ ...settings, driver: e.target.value })}>
            <option value="smtp">SMTP</option>
            <option value="sendmail">Sendmail</option>
            <option value="mailgun">Mailgun</option>
            <option value="postmark">Postmark</option>
            <option value="ses">SES</option>
          </select>
        </div>
        <div className="form-group">
          <label>{t.host}</label>
          <input type="text" value={settings.host} onChange={(e) => setSettings({ ...settings, host: e.target.value })} placeholder="smtp.example.com" />
        </div>
        <div className="form-group">
          <label>{t.port}</label>
          <input type="number" value={settings.port} onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label>{t.encryption}</label>
          <select value={settings.encryption} onChange={(e) => setSettings({ ...settings, encryption: e.target.value })}>
            <option value="tls">TLS</option>
            <option value="ssl">SSL</option>
            <option value="none">None</option>
          </select>
        </div>
        <div className="form-group">
          <label>{t.username}</label>
          <input type="text" value={settings.username} onChange={(e) => setSettings({ ...settings, username: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t.password}</label>
          <input type="password" value={settings.password} onChange={(e) => setSettings({ ...settings, password: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t.fromAddress}</label>
          <input type="email" value={settings.from_address} onChange={(e) => setSettings({ ...settings, from_address: e.target.value })} placeholder="noreply@example.com" />
        </div>
        <div className="form-group">
          <label>{t.fromName}</label>
          <input type="text" value={settings.from_name} onChange={(e) => setSettings({ ...settings, from_name: e.target.value })} />
        </div>
      </div>

      <div className="form-group toggle-row">
        <label className="toggle-label">
          <input type="checkbox" checked={settings.is_enabled} onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })} />
          <span>{t.enabled}</span>
        </label>
      </div>

      <div className="actions">
        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          <Save size={16} />
          {loading ? t.loading : t.save}
        </button>
      </div>

      <div className="test-section">
        <h3>{t.test}</h3>
        <div className="test-row">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder={t.testEmail} />
          <button className="btn-primary" onClick={handleTest} disabled={testLoading || !testEmail}>
            <Send size={16} />
            {testLoading ? t.loading : t.sendTest}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .settings-tab { display: flex; flex-direction: column; gap: 1rem; }
        .alert { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; }
        .alert.success { background: #dcfce7; color: #166534; }
        .alert.error { background: #fee2e2; color: #991b1b; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .form-group label { font-size: 0.85rem; color: #475569; font-weight: 500; }
        .form-group input, .form-group select { padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; background: #fff; color: #1e293b; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #6366f1; }
        .toggle-row { flex-direction: row; align-items: center; gap: 0.5rem; }
        .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .toggle-label input { width: 18px; height: 18px; accent-color: #6366f1; }
        .actions { display: flex; gap: 0.75rem; }
        .btn-primary { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: opacity 0.2s; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .test-section { background: #f8fafc; border-radius: 10px; padding: 1rem; margin-top: 0.5rem; }
        .test-section h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #1e293b; }
        .test-row { display: flex; gap: 0.75rem; }
        .test-row input { flex: 1; padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}

function TemplatesTab({ t }: { t: Record<string, string>; isRTL?: boolean }) {
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
    try {
      await apiTestMailTemplate(testTemplate.key, testEmail);
      setMessage(t.testSent);
      setShowTest(false);
      setTestEmail('');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage(t.error);
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
      />
    );
  }

  return (
    <div className="templates-tab">
      {message && <div className="alert success"><CheckCircle size={16} /> {message}</div>}

      <div className="toolbar">
        <button className="btn-primary" onClick={() => setEditing({ id: 0, key: '', name: '', subject: '', html_content: '', text_content: '', description: '', is_active: true, variables: [] } as MailTemplate)}>
          <Plus size={16} /> {t.addTemplate}
        </button>
        <button className="btn-secondary" onClick={handleSeed}>
          <RefreshCw size={16} /> {t.seedDefaults}
        </button>
      </div>

      {loading ? (
        <div className="loading">{t.loading}</div>
      ) : (
        <div className="templates-list">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="template-card">
              <div className="template-header">
                <div>
                  <h4 className="template-name">{tmpl.name}</h4>
                  <span className="template-key">{tmpl.key}</span>
                </div>
                <span className={`status-badge ${tmpl.is_active ? 'active' : ''}`}>{tmpl.is_active ? t.active : t.status}</span>
              </div>
              <p className="template-desc">{tmpl.description}</p>
              <p className="template-subject"><strong>{t.subject}:</strong> {tmpl.subject}</p>
              <div className="template-actions">
                <button className="icon-btn" onClick={() => handlePreview(tmpl)} title={t.preview}><Eye size={16} /></button>
                <button className="icon-btn" onClick={() => setEditing(tmpl)} title={t.edit}><FileText size={16} /></button>
                <button className="icon-btn" onClick={() => { setTestTemplate(tmpl); setShowTest(true); }} title={t.send}><Send size={16} /></button>
                <button className="icon-btn danger" onClick={() => handleDelete(tmpl.id)} title={t.delete}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{previewSubject}</h3>
              <button className="close-btn" onClick={() => setShowPreview(false)}>{t.close}</button>
            </div>
            <div className="preview-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}

      {showTest && testTemplate && (
        <div className="modal-overlay" onClick={() => setShowTest(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.test} - {testTemplate.name}</h3>
              <button className="close-btn" onClick={() => setShowTest(false)}>{t.close}</button>
            </div>
            <div className="test-body">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder={t.toEmail} />
              <button className="btn-primary" onClick={handleTest} disabled={!testEmail}><Send size={16} /> {t.send}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .templates-tab { display: flex; flex-direction: column; gap: 1rem; }
        .toolbar { display: flex; gap: 0.75rem; }
        .btn-secondary { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
        .btn-secondary:hover { background: #e2e8f0; }
        .templates-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
        .template-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .template-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .template-name { margin: 0; font-size: 1rem; color: #1e293b; }
        .template-key { font-size: 0.75rem; color: #94a3b8; }
        .status-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 12px; background: #f1f5f9; color: #64748b; }
        .status-badge.active { background: #dcfce7; color: #166534; }
        .template-desc { margin: 0; font-size: 0.85rem; color: #64748b; }
        .template-subject { margin: 0; font-size: 0.85rem; color: #475569; }
        .template-actions { display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.5rem; }
        .icon-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; color: #64748b; cursor: pointer; }
        .icon-btn:hover { background: #f8fafc; color: #1e293b; }
        .icon-btn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
        .modal { background: #fff; border-radius: 12px; max-width: 700px; width: 100%; max-height: 80vh; overflow: auto; display: flex; flex-direction: column; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e2e8f0; }
        .modal-header h3 { margin: 0; font-size: 1rem; color: #1e293b; }
        .close-btn { background: none; border: none; color: #64748b; cursor: pointer; font-size: 0.85rem; }
        .preview-body { padding: 1rem; background: #f8fafc; min-height: 200px; }
        .test-body { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
        .test-body input { padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel, t }: { template: MailTemplate; onSave: (t: Partial<MailTemplate>) => void; onCancel: () => void; t: Record<string, string> }) {
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

  const handleSubmit = () => {
    onSave(form);
  };

  return (
    <div className="editor-tab">
      <div className="editor-grid">
        <div className="form-group">
          <label>{t.templateKey}</label>
          <input type="text" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t.templateName}</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group full">
          <label>{t.subject}</label>
          <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div className="form-group full">
          <label>{t.description}</label>
          <input type="text" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-group full">
          <label>{t.htmlContent}</label>
          <textarea rows={10} value={form.html_content} onChange={(e) => setForm({ ...form, html_content: e.target.value })} />
        </div>
        <div className="form-group full">
          <label>{t.textContent}</label>
          <textarea rows={5} value={form.text_content ?? ''} onChange={(e) => setForm({ ...form, text_content: e.target.value })} />
        </div>
        <div className="form-group toggle-row">
          <label className="toggle-label">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <span>{t.active}</span>
          </label>
        </div>
      </div>
      <div className="actions">
        <button className="btn-primary" onClick={handleSubmit}><Save size={16} /> {t.save}</button>
        <button className="btn-secondary" onClick={onCancel}>{t.close}</button>
      </div>

      <style jsx global>{`
        .editor-tab { display: flex; flex-direction: column; gap: 1rem; }
        .editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .full { grid-column: 1 / -1; }
        .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .form-group label { font-size: 0.85rem; color: #475569; font-weight: 500; }
        .form-group input, .form-group textarea, .form-group select { padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; background: #fff; color: #1e293b; font-family: inherit; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #6366f1; }
        .toggle-row { flex-direction: row; align-items: center; gap: 0.5rem; }
        .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .toggle-label input { width: 18px; height: 18px; accent-color: #6366f1; }
        .actions { display: flex; gap: 0.75rem; }
      `}</style>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'bounced': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  return (
    <div className="logs-tab">
      <div className="logs-toolbar">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t.search} />
        <button className="btn-secondary" onClick={load}><RefreshCw size={16} /></button>
      </div>

      {loading ? (
        <div className="loading">{t.loading}</div>
      ) : logs.length === 0 ? (
        <div className="empty">{t.noLogs}</div>
      ) : (
        <>
          <div className="logs-table">
            <div className="logs-header">
              <span>{t.toEmail}</span>
              <span>{t.subject}</span>
              <span>{t.status}</span>
              <span>{t.status}</span>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="log-row">
                <span>{log.to_email}</span>
                <span className="log-subject">{log.subject}</span>
                <span className="log-status" style={{ color: getStatusColor(log.status) }}>{log.status}</span>
                <span className="log-time">{new Date(log.created_at).toLocaleString(isRTL ? 'ar' : 'en')}</span>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>{isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
            <span>Page {page} of {lastPage}</span>
            <button disabled={page >= lastPage} onClick={() => setPage(page + 1)}>{isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button>
          </div>
        </>
      )}

      <style jsx global>{`
        .logs-tab { display: flex; flex-direction: column; gap: 1rem; }
        .logs-toolbar { display: flex; gap: 0.75rem; }
        .logs-toolbar input { flex: 1; padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
        .logs-table { display: flex; flex-direction: column; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
        .logs-header { display: grid; grid-template-columns: 2fr 3fr 1fr 1.5fr; gap: 0.75rem; padding: 0.75rem 1rem; background: #f8fafc; font-size: 0.8rem; font-weight: 600; color: #475569; text-transform: uppercase; }
        .log-row { display: grid; grid-template-columns: 2fr 3fr 1fr 1.5fr; gap: 0.75rem; padding: 0.75rem 1rem; border-top: 1px solid #f1f5f9; align-items: center; font-size: 0.85rem; color: #1e293b; }
        .log-row:hover { background: #f8fafc; }
        .log-subject { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .log-status { font-weight: 600; text-transform: capitalize; }
        .log-time { color: #64748b; font-size: 0.8rem; }
        .empty { text-align: center; padding: 2rem; color: #94a3b8; }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; }
        .pagination button { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination span { font-size: 0.85rem; color: #64748b; }
      `}</style>
    </div>
  );
}
