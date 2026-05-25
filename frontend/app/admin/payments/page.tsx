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

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none";
  const labelClass = "flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400">
        <Shield size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong className="font-semibold">{isRTL ? 'ملاحظة أمان:' : 'Security Notice:'}</strong> {t.securityNotice}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stripe Settings */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/20">
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{t.stripe}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {settings?.stripe?.is_enabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <Check size={12} /> {t.enabled}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    <X size={12} /> {t.disabled}
                  </span>
                )}
                {settings?.stripe?.is_sandbox && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    <AlertTriangle size={12} /> {t.sandbox}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveStripe} className="flex flex-col gap-5">
            <div className="flex gap-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={stripeForm.is_enabled}
                    onChange={(e) => setStripeForm({ ...stripeForm, is_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t.enableStripe}</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={stripeForm.is_sandbox}
                    onChange={(e) => setStripeForm({ ...stripeForm, is_sandbox: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t.sandboxMode}</span>
              </label>
            </div>

            <div>
              <label className={labelClass}>{t.publishableKey}</label>
              <input
                type="text"
                value={stripeForm.public_key}
                onChange={(e) => setStripeForm({ ...stripeForm, public_key: e.target.value })}
                placeholder={t.placeholder.publicKey}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                {t.secretKey}
                {settings?.stripe?.has_secret_key && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Lock size={12} /> {t.configured}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showStripeSecret ? 'text' : 'password'}
                  value={stripeForm.secret_key}
                  onChange={(e) => setStripeForm({ ...stripeForm, secret_key: e.target.value })}
                  placeholder={t.placeholder.secretKey}
                  className={`${inputClass} pr-10 rtl:pr-4 rtl:pl-10`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowStripeSecret(!showStripeSecret)} 
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showStripeSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {t.webhookSecret}
                {settings?.stripe?.has_webhook_secret && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Lock size={12} /> {t.configured}
                  </span>
                )}
              </label>
              <input
                type="password"
                value={stripeForm.webhook_secret}
                onChange={(e) => setStripeForm({ ...stripeForm, webhook_secret: e.target.value })}
                placeholder={t.placeholder.webhookSecret}
                className={inputClass}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.stripe?.webhook_url || '', 'stripe-webhook')}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  {copied === 'stripe-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied === 'stripe-webhook' ? t.copied : t.copy}
                </button>
              </div>
              <code className="block text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-200 break-all bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800">
                {settings?.stripe?.webhook_url}
              </code>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={saving === 'stripe'} 
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                {saving === 'stripe' ? <Loader2 size={18} className="animate-spin" /> : null}
                {saving === 'stripe' ? t.saving : t.saveSettings}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('stripe')}
                disabled={testing === 'stripe' || !settings?.stripe?.is_enabled}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {testing === 'stripe' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {testing === 'stripe' ? t.testing : t.testConnection}
              </button>
            </div>
          </form>
        </div>

        {/* PayPal Settings */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
              <Wallet size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{t.paypal}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {settings?.paypal?.is_enabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <Check size={12} /> {t.enabled}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    <X size={12} /> {t.disabled}
                  </span>
                )}
                {settings?.paypal?.is_sandbox && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    <AlertTriangle size={12} /> {t.sandbox}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePaypal} className="flex flex-col gap-5">
            <div className="flex gap-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={paypalForm.is_enabled}
                    onChange={(e) => setPaypalForm({ ...paypalForm, is_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-500"></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t.enablePaypal}</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={paypalForm.is_sandbox}
                    onChange={(e) => setPaypalForm({ ...paypalForm, is_sandbox: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-500"></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t.sandboxMode}</span>
              </label>
            </div>

            <div>
              <label className={labelClass}>{t.publishableKey}</label>
              <input
                type="text"
                value={paypalForm.public_key}
                onChange={(e) => setPaypalForm({ ...paypalForm, public_key: e.target.value })}
                placeholder="Client ID"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                {t.secretKey}
                {settings?.paypal?.has_secret_key && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Lock size={12} /> {t.configured}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPaypalSecret ? 'text' : 'password'}
                  value={paypalForm.secret_key}
                  onChange={(e) => setPaypalForm({ ...paypalForm, secret_key: e.target.value })}
                  placeholder="Client Secret"
                  className={`${inputClass} pr-10 rtl:pr-4 rtl:pl-10`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPaypalSecret(!showPaypalSecret)} 
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPaypalSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {t.webhookSecret}
                {settings?.paypal?.has_webhook_secret && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Lock size={12} /> {t.configured}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={paypalForm.webhook_secret}
                onChange={(e) => setPaypalForm({ ...paypalForm, webhook_secret: e.target.value })}
                placeholder="Webhook ID"
                className={inputClass}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.paypal?.webhook_url || '', 'paypal-webhook')}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {copied === 'paypal-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied === 'paypal-webhook' ? t.copied : t.copy}
                </button>
              </div>
              <code className="block text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-200 break-all bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800">
                {settings?.paypal?.webhook_url}
              </code>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={saving === 'paypal'} 
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                {saving === 'paypal' ? <Loader2 size={18} className="animate-spin" /> : null}
                {saving === 'paypal' ? t.saving : t.saveSettings}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection('paypal')}
                disabled={testing === 'paypal' || !settings?.paypal?.is_enabled}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {testing === 'paypal' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {testing === 'paypal' ? t.testing : t.testConnection}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {isRTL ? 'مستندات الإعداد' : 'Setup Documentation'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a 
            href="https://dashboard.stripe.com/apikeys" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CreditCard size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Stripe Dashboard</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {isRTL ? 'احصل على مفاتيح API واعداد webhooks' : 'Get your API keys and configure webhooks'}
              </p>
            </div>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-indigo-500" />
          </a>
          
          <a 
            href="https://developer.paypal.com/dashboard/applications" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">PayPal Developer</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {isRTL ? 'إدارة تطبيقات REST API والwebhooks' : 'Manage your REST API apps and webhooks'}
              </p>
            </div>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-500" />
          </a>
        </div>
      </div>
    </div>
  );
}
