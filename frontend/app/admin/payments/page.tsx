'use client';

import { useEffect, useState } from 'react';
import { apiGetPaymentSettings, apiUpdatePaymentSettings, apiTestPaymentConnection, PaymentSettings } from '@/lib/api';
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
      alert('Stripe settings saved successfully!');
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save Stripe settings');
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
      alert('PayPal settings saved successfully!');
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save PayPal settings');
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
      alert(err instanceof Error ? err.message : 'Connection test failed');
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
    <div className="integrations-page">
      {/* Security Notice */}
      <div className="security-notice">
        <Shield size={20} />
        <div>
          <strong>Security Notice:</strong> API keys are encrypted at rest. Secret keys are never displayed after saving.
          Always use sandbox/test keys during development.
        </div>
      </div>

      <div className="integrations-grid">
        {/* Stripe Settings */}
        <div className="integration-card">
          <div className="integration-header">
            <div className="integration-icon stripe">
              <CreditCard size={24} />
            </div>
            <div className="integration-info">
              <h3>Stripe</h3>
              <div className="integration-status">
                {settings?.stripe?.is_enabled ? (
                  <span className="status-badge enabled"><Check size={12} /> Enabled</span>
                ) : (
                  <span className="status-badge disabled"><X size={12} /> Disabled</span>
                )}
                {settings?.stripe?.is_sandbox && (
                  <span className="status-badge sandbox"><AlertTriangle size={12} /> Sandbox</span>
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
                Enable Stripe
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={stripeForm.is_sandbox}
                  onChange={(e) => setStripeForm({ ...stripeForm, is_sandbox: e.target.checked })}
                />
                <span className="toggle-switch" />
                Sandbox Mode
              </label>
            </div>

            <div className="form-group">
              <label>Publishable Key</label>
              <input
                type="text"
                value={stripeForm.public_key}
                onChange={(e) => setStripeForm({ ...stripeForm, public_key: e.target.value })}
                placeholder="pk_test_..."
              />
            </div>

            <div className="form-group">
              <label>
                Secret Key
                {settings?.stripe?.has_secret_key && <span className="key-set"><Lock size={12} /> Configured</span>}
              </label>
              <div className="input-with-toggle">
                <input
                  type={showStripeSecret ? 'text' : 'password'}
                  value={stripeForm.secret_key}
                  onChange={(e) => setStripeForm({ ...stripeForm, secret_key: e.target.value })}
                  placeholder="sk_test_... (leave empty to keep current)"
                />
                <button type="button" onClick={() => setShowStripeSecret(!showStripeSecret)} className="toggle-visibility">
                  {showStripeSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                Webhook Secret
                {settings?.stripe?.has_webhook_secret && <span className="key-set"><Lock size={12} /> Configured</span>}
              </label>
              <input
                type="password"
                value={stripeForm.webhook_secret}
                onChange={(e) => setStripeForm({ ...stripeForm, webhook_secret: e.target.value })}
                placeholder="whsec_... (leave empty to keep current)"
              />
            </div>

            <div className="webhook-url-box">
              <div className="webhook-url-header">
                <span>Webhook URL</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.stripe?.webhook_url || '', 'stripe-webhook')}
                  className="copy-btn"
                >
                  {copied === 'stripe-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied === 'stripe-webhook' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <code>{settings?.stripe?.webhook_url}</code>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving === 'stripe'} className="btn-primary">
                {saving === 'stripe' ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('stripe')}
                disabled={testing === 'stripe' || !settings?.stripe?.is_enabled}
                className="btn-secondary"
              >
                <Zap size={16} />
                {testing === 'stripe' ? 'Testing...' : 'Test Connection'}
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
              <h3>PayPal</h3>
              <div className="integration-status">
                {settings?.paypal?.is_enabled ? (
                  <span className="status-badge enabled"><Check size={12} /> Enabled</span>
                ) : (
                  <span className="status-badge disabled"><X size={12} /> Disabled</span>
                )}
                {settings?.paypal?.is_sandbox && (
                  <span className="status-badge sandbox"><AlertTriangle size={12} /> Sandbox</span>
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
                Enable PayPal
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={paypalForm.is_sandbox}
                  onChange={(e) => setPaypalForm({ ...paypalForm, is_sandbox: e.target.checked })}
                />
                <span className="toggle-switch" />
                Sandbox Mode
              </label>
            </div>

            <div className="form-group">
              <label>Client ID</label>
              <input
                type="text"
                value={paypalForm.public_key}
                onChange={(e) => setPaypalForm({ ...paypalForm, public_key: e.target.value })}
                placeholder="Client ID from PayPal Developer"
              />
            </div>

            <div className="form-group">
              <label>
                Client Secret
                {settings?.paypal?.has_secret_key && <span className="key-set"><Lock size={12} /> Configured</span>}
              </label>
              <div className="input-with-toggle">
                <input
                  type={showPaypalSecret ? 'text' : 'password'}
                  value={paypalForm.secret_key}
                  onChange={(e) => setPaypalForm({ ...paypalForm, secret_key: e.target.value })}
                  placeholder="Client Secret (leave empty to keep current)"
                />
                <button type="button" onClick={() => setShowPaypalSecret(!showPaypalSecret)} className="toggle-visibility">
                  {showPaypalSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                Webhook ID
                {settings?.paypal?.has_webhook_secret && <span className="key-set"><Lock size={12} /> Configured</span>}
              </label>
              <input
                type="text"
                value={paypalForm.webhook_secret}
                onChange={(e) => setPaypalForm({ ...paypalForm, webhook_secret: e.target.value })}
                placeholder="Webhook ID from PayPal (leave empty to keep current)"
              />
            </div>

            <div className="webhook-url-box paypal">
              <div className="webhook-url-header">
                <span>Webhook URL</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.paypal?.webhook_url || '', 'paypal-webhook')}
                  className="copy-btn"
                >
                  {copied === 'paypal-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied === 'paypal-webhook' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <code>{settings?.paypal?.webhook_url}</code>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving === 'paypal'} className="btn-primary paypal">
                {saving === 'paypal' ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('paypal')}
                disabled={testing === 'paypal' || !settings?.paypal?.is_enabled}
                className="btn-secondary"
              >
                <Zap size={16} />
                {testing === 'paypal' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="docs-section">
        <h3>Setup Documentation</h3>
        <div className="docs-grid">
          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="doc-link stripe">
            <CreditCard size={24} />
            <div>
              <p className="doc-title">Stripe Dashboard</p>
              <p className="doc-desc">Get your API keys and configure webhooks</p>
            </div>
            <ExternalLink size={16} />
          </a>
          <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="doc-link paypal">
            <Wallet size={24} />
            <div>
              <p className="doc-title">PayPal Developer</p>
              <p className="doc-desc">Manage your REST API apps and webhooks</p>
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
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.1);
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
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
        }

        .integration-icon.paypal {
          background: linear-gradient(135deg, #3b82f6, #0ea5e9);
        }

        .integration-info h3 {
          color: #fff;
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
          font-weight: 500;
        }

        .status-badge.enabled {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .status-badge.disabled {
          background: rgba(100, 116, 139, 0.15);
          color: #64748b;
        }

        .status-badge.sandbox {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .integration-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .toggle-group {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .toggle-label input {
          display: none;
        }

        .toggle-switch {
          width: 36px;
          height: 20px;
          background: #475569;
          border-radius: 10px;
          position: relative;
          transition: background 0.2s;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
        }

        .toggle-label input:checked + .toggle-switch {
          background: #8b5cf6;
        }

        .toggle-label input:checked + .toggle-switch::after {
          transform: translateX(16px);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          color: #94a3b8;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .key-set {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: #22c55e;
          font-size: 0.75rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(100, 116, 139, 0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .form-group input::placeholder {
          color: #64748b;
        }

        .input-with-toggle {
          position: relative;
        }

        .input-with-toggle input {
          padding-right: 2.5rem;
        }

        .toggle-visibility {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
        }

        .toggle-visibility:hover {
          color: #94a3b8;
        }

        .webhook-url-box {
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          padding: 0.75rem;
        }

        .webhook-url-box.paypal {
          background: rgba(59, 130, 246, 0.08);
          border-color: rgba(59, 130, 246, 0.2);
        }

        .webhook-url-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .webhook-url-header span {
          color: #94a3b8;
          font-size: 0.8rem;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          color: #8b5cf6;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .copy-btn:hover {
          background: rgba(139, 92, 246, 0.1);
        }

        .webhook-url-box code {
          color: #a78bfa;
          font-size: 0.8rem;
          word-break: break-all;
        }

        .webhook-url-box.paypal code {
          color: #60a5fa;
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-primary {
          flex: 1;
          padding: 0.65rem 1rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary.paypal {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          background: rgba(100, 116, 139, 0.2);
          border: 1px solid rgba(100, 116, 139, 0.3);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(100, 116, 139, 0.3);
          color: #fff;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .docs-section {
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .docs-section h3 {
          color: #fff;
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
          background: rgba(100, 116, 139, 0.1);
          border: 1px solid rgba(100, 116, 139, 0.2);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s;
        }

        .doc-link:hover {
          background: rgba(100, 116, 139, 0.2);
          border-color: rgba(100, 116, 139, 0.3);
        }

        .doc-link.stripe {
          color: #a78bfa;
        }

        .doc-link.paypal {
          color: #60a5fa;
        }

        .doc-link > div {
          flex: 1;
        }

        .doc-title {
          color: #fff;
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
