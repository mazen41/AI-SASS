'use client';

import { useEffect, useState } from 'react';
import { apiGetPaymentSettings, apiUpdatePaymentSettings, apiTestPaymentConnection, PaymentSettings } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import {
  CreditCard,
  Wallet,
  Shield,
  Eye,
  EyeOff,
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  Lock,
  Zap,
  Copy,
  CheckCircle,
} from 'lucide-react';

export default function PaymentSettingsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  
  const t = {
    securityNotice: isRTL ? 'ملاحظة أمان: مفاتيح API مشفرة في الراحة. المفاتيح السرية لا تظهر أبداً بعد الحفظ. استخدم دائماً مفاتيح الاختبار/الرملية أثناء التطوير.' : 'Security Notice: API keys are encrypted at rest. Secret keys are never displayed after saving. Always use sandbox/test keys during development.',
    stripe: isRTL ? 'Stripe' : 'Stripe',
    paypal: isRTL ? 'PayPal' : 'PayPal',
    enabled: isRTL ? 'مفعل' : 'Enabled',
    disabled: isRTL ? 'غير مفعل' : 'Disabled',
    sandbox: isRTL ? 'وضع الرمل' : 'Sandbox',
    enableStripe: isRTL ? 'تفعيل Stripe' : 'Enable Stripe',
    enablePaypal: isRTL ? 'تفعيل PayPal' : 'Enable PayPal',
    sandboxMode: isRTL ? 'وضع الرمل' : 'Sandbox Mode',
    publishableKey: isRTL ? 'المفتاح العام' : 'Publishable Key',
    secretKey: isRTL ? 'المفتاح السري' : 'Secret Key',
    configured: isRTL ? 'مكون' : 'Configured',
    webhookSecret: isRTL ? 'سر webhook' : 'Webhook Secret',
    webhookUrl: isRTL ? 'رابط Webhook' : 'Webhook URL',
    copy: isRTL ? 'نسخ' : 'Copy',
    copied: isRTL ? 'تم النسخ!' : 'Copied!',
    saveSettings: isRTL ? 'حفظ الإعدادات' : 'Save Settings',
    saving: isRTL ? 'جاري الحفظ...' : 'Saving...',
    testConnection: isRTL ? 'اختبار الاتصال' : 'Test Connection',
    testing: isRTL ? 'جاري الاختبار...' : 'Testing...',
    saveSuccess: isRTL ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!',
    saveError: isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings',
    testError: isRTL ? 'فشل اختبار الاتصال' : 'Connection test failed',
    placeholder: {
      publicKey: isRTL ? 'pk_test_...' : 'pk_test_...',
      secretKey: isRTL ? 'sk_test_... (اتركه فارغاً للإبقاء على الحالي)' : 'sk_test_... (leave empty to keep current)',
      webhookSecret: isRTL ? 'whsec_... (اتركه فارغاً للإبقاء على الحالي)' : 'whsec_... (leave empty to keep current)',
    },
  };

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [stripeForm, setStripeForm] = useState({
    is_enabled: false,
    is_sandbox: true,
    public_key: '',
    secret_key: '',
    webhook_secret: '',
  });
  const [paypalForm, setPaypalForm] = useState({
    is_enabled: false,
    is_sandbox: true,
    public_key: '',
    secret_key: '',
    webhook_secret: '',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { settings } = await apiGetPaymentSettings();
        setSettings(settings);
        if (settings.stripe) {
          setStripeForm({
            is_enabled: settings.stripe.is_enabled,
            is_sandbox: settings.stripe.is_sandbox,
            public_key: settings.stripe.public_key || '',
            secret_key: '',
            webhook_secret: '',
          });
        }
        if (settings.paypal) {
          setPaypalForm({
            is_enabled: settings.paypal.is_enabled,
            is_sandbox: settings.paypal.is_sandbox,
            public_key: settings.paypal.public_key || '',
            secret_key: '',
            webhook_secret: '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveStripe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('stripe');
    try {
      const data: Record<string, unknown> = {
        is_enabled: stripeForm.is_enabled,
        is_sandbox: stripeForm.is_sandbox,
        public_key: stripeForm.public_key,
      };
      if (stripeForm.secret_key) data.secret_key = stripeForm.secret_key;
      if (stripeForm.webhook_secret) data.webhook_secret = stripeForm.webhook_secret;
      
      await apiUpdatePaymentSettings('stripe', data);
      alert(t.saveSuccess);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(null);
    }
  };

  const handleSavePaypal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('paypal');
    try {
      const data: Record<string, unknown> = {
        is_enabled: paypalForm.is_enabled,
        is_sandbox: paypalForm.is_sandbox,
        public_key: paypalForm.public_key,
      };
      if (paypalForm.secret_key) data.secret_key = paypalForm.secret_key;
      if (paypalForm.webhook_secret) data.webhook_secret = paypalForm.webhook_secret;
      
      await apiUpdatePaymentSettings('paypal', data);
      alert(t.saveSuccess);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(null);
    }
  };

  const handleTestConnection = async (gateway: 'stripe' | 'paypal') => {
    setTesting(gateway);
    try {
      const result = await apiTestPaymentConnection(gateway);
      alert(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.testError);
    } finally {
      setTesting(null);
    }
  };

  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  return (
    <div className="integrations-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Security Notice */}
      <div className="security-notice">
        <Shield size={20} />
        <div><strong>{isRTL ? 'ملاحظة أمان:' : 'Security Notice:'}</strong> {t.securityNotice}</div>
      </div>

      <div className="integrations-grid">
        {/* Stripe Settings */}
        <div className="integration-card">
          <div className="integration-header">
            <div className="integration-icon stripe">
              <CreditCard size={24} />
            </div>
            <div className="integration-info">
              <h3>{t.stripe}</h3>
              <div className="integration-status">
                {settings?.stripe?.is_enabled ? (
                  <span className="status-badge enabled"><Check size={12} /> {t.enabled}</span>
                ) : (
                  <span className="status-badge disabled"><X size={12} /> {t.disabled}</span>
                )}
                {settings?.stripe?.is_sandbox && (
                  <span className="status-badge sandbox"><AlertTriangle size={12} /> {t.sandbox}</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveStripe} className="integration-form">
            <div className="toggle-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={stripeForm.is_enabled}
                  onChange={(e) => setStripeForm({ ...stripeForm, is_enabled: e.target.checked })}
                />
                <span className="toggle-switch" />
                {t.enableStripe}
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={stripeForm.is_sandbox}
                  onChange={(e) => setStripeForm({ ...stripeForm, is_sandbox: e.target.checked })}
                />
                <span className="toggle-switch" />
                {t.sandboxMode}
              </label>
            </div>

            <div className="form-group">
              <label>{t.publishableKey}</label>
              <input
                type="text"
                value={stripeForm.public_key}
                onChange={(e) => setStripeForm({ ...stripeForm, public_key: e.target.value })}
                placeholder={t.placeholder.publicKey}
              />
            </div>

            <div className="form-group">
              <label>
                {t.secretKey}
                {settings?.stripe?.has_secret_key && <span className="key-set"><Lock size={12} /> {t.configured}</span>}
              </label>
              <div className="input-with-toggle">
                <input
                  type={showStripeSecret ? 'text' : 'password'}
                  value={stripeForm.secret_key}
                  onChange={(e) => setStripeForm({ ...stripeForm, secret_key: e.target.value })}
                  placeholder={t.placeholder.secretKey}
                />
                <button type="button" onClick={() => setShowStripeSecret(!showStripeSecret)} className="toggle-visibility">
                  {showStripeSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                {t.webhookSecret}
                {settings?.stripe?.has_webhook_secret && <span className="key-set"><Lock size={12} /> {t.configured}</span>}
              </label>
              <input
                type="password"
                value={stripeForm.webhook_secret}
                onChange={(e) => setStripeForm({ ...stripeForm, webhook_secret: e.target.value })}
                placeholder={t.placeholder.webhookSecret}
              />
            </div>

            <div className="webhook-url-box">
              <div className="webhook-url-header">
                <span>{t.webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.stripe?.webhook_url || '', 'stripe-webhook')}
                  className="copy-btn"
                >
                  {copied === 'stripe-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied === 'stripe-webhook' ? t.copied : t.copy}
                </button>
              </div>
              <code>{settings?.stripe?.webhook_url}</code>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving === 'stripe'} className="btn-primary">
                {saving === 'stripe' ? t.saving : t.saveSettings}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('stripe')}
                disabled={testing === 'stripe' || !settings?.stripe?.is_enabled}
                className="btn-secondary"
              >
                <Zap size={16} />
                {testing === 'stripe' ? t.testing : t.testConnection}
              </button>
            </div>
          </form>
        </div>

        {/* PayPal Settings */}
        <div className="integration-card">
          <div className="integration-header">
            <div className="integration-icon paypal">
              <Wallet size={24} />
            </div>
            <div className="integration-info">
              <h3>{t.paypal}</h3>
              <div className="integration-status">
                {settings?.paypal?.is_enabled ? (
                  <span className="status-badge enabled"><Check size={12} /> {t.enabled}</span>
                ) : (
                  <span className="status-badge disabled"><X size={12} /> {t.disabled}</span>
                )}
                {settings?.paypal?.is_sandbox && (
                  <span className="status-badge sandbox"><AlertTriangle size={12} /> {t.sandbox}</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePaypal} className="integration-form">
            <div className="toggle-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={paypalForm.is_enabled}
                  onChange={(e) => setPaypalForm({ ...paypalForm, is_enabled: e.target.checked })}
                />
                <span className="toggle-switch" />
                {t.enablePaypal}
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={paypalForm.is_sandbox}
                  onChange={(e) => setPaypalForm({ ...paypalForm, is_sandbox: e.target.checked })}
                />
                <span className="toggle-switch" />
                {t.sandboxMode}
              </label>
            </div>

            <div className="form-group">
              <label>{t.publishableKey}</label>
              <input
                type="text"
                value={paypalForm.public_key}
                onChange={(e) => setPaypalForm({ ...paypalForm, public_key: e.target.value })}
                placeholder="Client ID"
              />
            </div>

            <div className="form-group">
              <label>
                {t.secretKey}
                {settings?.paypal?.has_secret_key && <span className="key-set"><Lock size={12} /> {t.configured}</span>}
              </label>
              <div className="input-with-toggle">
                <input
                  type={showPaypalSecret ? 'text' : 'password'}
                  value={paypalForm.secret_key}
                  onChange={(e) => setPaypalForm({ ...paypalForm, secret_key: e.target.value })}
                  placeholder="Client Secret"
                />
                <button type="button" onClick={() => setShowPaypalSecret(!showPaypalSecret)} className="toggle-visibility">
                  {showPaypalSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                {t.webhookSecret}
                {settings?.paypal?.has_webhook_secret && <span className="key-set"><Lock size={12} /> {t.configured}</span>}
              </label>
              <input
                type="text"
                value={paypalForm.webhook_secret}
                onChange={(e) => setPaypalForm({ ...paypalForm, webhook_secret: e.target.value })}
                placeholder="Webhook ID"
              />
            </div>

            <div className="webhook-url-box paypal">
              <div className="webhook-url-header">
                <span>{t.webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.paypal?.webhook_url || '', 'paypal-webhook')}
                  className="copy-btn"
                >
                  {copied === 'paypal-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied === 'paypal-webhook' ? t.copied : t.copy}
                </button>
              </div>
              <code>{settings?.paypal?.webhook_url}</code>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving === 'paypal'} className="btn-primary paypal">
                {saving === 'paypal' ? t.saving : t.saveSettings}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('paypal')}
                disabled={testing === 'paypal' || !settings?.paypal?.is_enabled}
                className="btn-secondary"
              >
                <Zap size={16} />
                {testing === 'paypal' ? t.testing : t.testConnection}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="docs-section">
        <h3>{isRTL ? 'Documentation' : 'Setup Documentation'}</h3>
        <div className="docs-grid">
          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="doc-link stripe">
            <CreditCard size={24} />
            <div>
              <p className="doc-title">Stripe Dashboard</p>
              <p className="doc-desc">{isRTL ? 'احصل على مفاتيح API واعداد webhooks' : 'Get your API keys and configure webhooks'}</p>
            </div>
            <ExternalLink size={16} />
          </a>
          <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="doc-link paypal">
            <Wallet size={24} />
            <div>
              <p className="doc-title">PayPal Developer</p>
              <p className="doc-desc">{isRTL ? 'إدارة تطبيقات REST API والwebhooks' : 'Manage your REST API apps and webhooks'}</p>
            </div>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <style jsx>{`
        .integrations-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .admin-page-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
        }

        .admin-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .security-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 10px;
          color: #fbbf24;
          font-size: 0.9rem;
        }

        .integrations-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .integrations-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .integration-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .integration-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .integration-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .integration-icon.stripe {
          background: #6366f1;
        }

        .integration-icon.paypal {
          background: #3b82f6;
        }

        .integration-info h3 {
          color: #1e293b;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.25rem;
        }

        .integration-status {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.enabled {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-badge.disabled {
          background: #f1f5f9;
          color: #64748b;
        }

        .status-badge.sandbox {
          background: #fef3c7;
          color: #d97706;
        }

        .integration-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .toggle-group {
          display: flex;
          gap: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .toggle-label input {
          display: none;
        }

        .toggle-switch {
          position: relative;
          width: 36px;
          height: 20px;
          background: #e2e8f0;
          border-radius: 20px;
          transition: 0.3s;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }

        [dir="rtl"] .toggle-switch::after {
          left: auto;
          right: 2px;
        }

        .toggle-label input:checked + .toggle-switch {
          background: #6366f1;
        }

        .toggle-label input:checked + .toggle-switch::after {
          transform: translateX(16px);
        }

        [dir="rtl"] .toggle-label input:checked + .toggle-switch::after {
          transform: translateX(-16px);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          display: flex;
          justify-content: space-between;
          color: #374151;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .key-set {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #10b981;
          font-size: 0.75rem;
        }

        .form-group input {
          padding: 0.6rem 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #1e293b;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-group input::placeholder {
          color: #94a3b8;
        }

        .input-with-toggle {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-toggle input {
          width: 100%;
          padding-right: 2.5rem;
        }

        [dir="rtl"] .input-with-toggle input {
          padding-right: 0.75rem;
          padding-left: 2.5rem;
        }

        .toggle-visibility {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        [dir="rtl"] .toggle-visibility {
          right: auto;
          left: 0.75rem;
        }

        .toggle-visibility:hover {
          color: #64748b;
        }

        .webhook-url-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
        }

        .webhook-url-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: none;
          border: none;
          color: #6366f1;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .copy-btn:hover {
          text-decoration: underline;
        }

        .webhook-url-box code {
          display: block;
          color: #1e293b;
          font-family: monospace;
          font-size: 0.85rem;
          word-break: break-all;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .btn-primary, .btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          flex: 2;
          background: #6366f1;
          color: white;
        }

        .btn-primary.paypal {
          background: #3b82f6;
        }

        .btn-primary:hover:not(:disabled) {
          filter: brightness(0.9);
        }

        .btn-secondary {
          flex: 1;
          background: #f1f5f9;
          color: #475569;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1e293b;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .docs-section {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .docs-section h3 {
          color: #1e293b;
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 1rem;
        }

        .docs-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .docs-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .doc-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s;
        }

        .doc-link:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
        }

        .doc-link.stripe {
          color: #6366f1;
        }

        .doc-link.paypal {
          color: #3b82f6;
        }

        .doc-link > div {
          flex: 1;
        }

        .doc-title {
          color: #1e293b;
          font-weight: 500;
          margin: 0 0 0.15rem;
        }

        .doc-desc {
          color: #64748b;
          font-size: 0.8rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
