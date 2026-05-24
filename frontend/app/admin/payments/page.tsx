'use client';

import { useEffect, useState } from 'react';
import { apiGetPaymentSettings, apiUpdatePaymentSettings, apiTestPaymentConnection, PaymentSettings } from '@/lib/api';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stripe Settings */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Stripe</h3>
              <p className="text-gray-400 text-sm">
                {settings?.stripe?.is_enabled ? (
                  <span className="text-green-400">● Enabled</span>
                ) : (
                  <span className="text-gray-500">○ Disabled</span>
                )}
                {settings?.stripe?.is_sandbox && ' (Sandbox)'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveStripe} className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={stripeForm.is_enabled}
                  onChange={(e) => setStripeForm({ ...stripeForm, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={stripeForm.is_sandbox}
                  onChange={(e) => setStripeForm({ ...stripeForm, is_sandbox: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                />
                Sandbox Mode
              </label>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Publishable Key</label>
              <input
                type="text"
                value={stripeForm.public_key}
                onChange={(e) => setStripeForm({ ...stripeForm, public_key: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="pk_test_..."
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Secret Key {settings?.stripe?.has_secret_key && <span className="text-green-400">(Set)</span>}
              </label>
              <input
                type="password"
                value={stripeForm.secret_key}
                onChange={(e) => setStripeForm({ ...stripeForm, secret_key: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="sk_test_... (leave empty to keep current)"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Webhook Secret {settings?.stripe?.has_webhook_secret && <span className="text-green-400">(Set)</span>}
              </label>
              <input
                type="password"
                value={stripeForm.webhook_secret}
                onChange={(e) => setStripeForm({ ...stripeForm, webhook_secret: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="whsec_... (leave empty to keep current)"
              />
            </div>

            <div className="p-3 bg-gray-700/50 rounded-lg">
              <p className="text-gray-400 text-sm">Webhook URL:</p>
              <code className="text-purple-400 text-sm break-all">{settings?.stripe?.webhook_url}</code>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving === 'stripe'}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {saving === 'stripe' ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('stripe')}
                disabled={testing === 'stripe' || !settings?.stripe?.is_enabled}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {testing === 'stripe' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </form>
        </div>

        {/* PayPal Settings */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-2xl">🅿️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">PayPal</h3>
              <p className="text-gray-400 text-sm">
                {settings?.paypal?.is_enabled ? (
                  <span className="text-green-400">● Enabled</span>
                ) : (
                  <span className="text-gray-500">○ Disabled</span>
                )}
                {settings?.paypal?.is_sandbox && ' (Sandbox)'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePaypal} className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={paypalForm.is_enabled}
                  onChange={(e) => setPaypalForm({ ...paypalForm, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={paypalForm.is_sandbox}
                  onChange={(e) => setPaypalForm({ ...paypalForm, is_sandbox: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                />
                Sandbox Mode
              </label>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Client ID</label>
              <input
                type="text"
                value={paypalForm.public_key}
                onChange={(e) => setPaypalForm({ ...paypalForm, public_key: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="Client ID from PayPal Developer"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Client Secret {settings?.paypal?.has_secret_key && <span className="text-green-400">(Set)</span>}
              </label>
              <input
                type="password"
                value={paypalForm.secret_key}
                onChange={(e) => setPaypalForm({ ...paypalForm, secret_key: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="Client Secret (leave empty to keep current)"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Webhook ID {settings?.paypal?.has_webhook_secret && <span className="text-green-400">(Set)</span>}
              </label>
              <input
                type="text"
                value={paypalForm.webhook_secret}
                onChange={(e) => setPaypalForm({ ...paypalForm, webhook_secret: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="Webhook ID from PayPal (leave empty to keep current)"
              />
            </div>

            <div className="p-3 bg-gray-700/50 rounded-lg">
              <p className="text-gray-400 text-sm">Webhook URL:</p>
              <code className="text-blue-400 text-sm break-all">{settings?.paypal?.webhook_url}</code>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving === 'paypal'}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {saving === 'paypal' ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('paypal')}
                disabled={testing === 'paypal' || !settings?.paypal?.is_enabled}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {testing === 'paypal' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Setup Documentation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">💳</span>
            <div>
              <p className="text-white font-medium">Stripe Dashboard</p>
              <p className="text-gray-400 text-sm">Get your API keys and configure webhooks</p>
            </div>
          </a>
          <a
            href="https://developer.paypal.com/dashboard/applications"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">🅿️</span>
            <div>
              <p className="text-white font-medium">PayPal Developer</p>
              <p className="text-gray-400 text-sm">Manage your REST API apps and webhooks</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
