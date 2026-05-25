'use client';

import { useEffect, useState } from 'react';
import {
  apiGetPaymentSettings,
  apiUpdatePaymentSettings,
  apiTestPaymentConnection,
  apiGetStorageSettings,
  apiUpdateStorageSettings,
  apiTestStorageConnection,
  PaymentSettings,
  StorageSettings,
} from '@/lib/api';
import { useLang } from '@/context/LangContext';
import {
  CreditCard,
  Wallet,
  Shield,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Lock,
  Zap,
  Copy,
  CheckCircle,
  Database,
  Cloud,
  Server,
  Loader2,
} from 'lucide-react';

export default function PaymentSettingsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    securityNotice: isRTL
      ? 'ملاحظة أمان: مفاتيح API مشفرة في قاعدة البيانات. المفاتيح السرية لا تظهر أبداً بعد الحفظ.'
      : 'Security Notice: API keys and storage credentials are encrypted at rest. Secret keys are never displayed after saving.',
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
    tabPayments: isRTL ? 'بوابات الدفع' : 'Payment Gateways',
    tabStorage: isRTL ? 'التخزين السحابي' : 'Cloud Storage',
    storageActive: isRTL ? 'نشط' : 'Active',
    storageInactive: isRTL ? 'غير نشط' : 'Inactive',
    activateDriver: isRTL ? 'تفعيل نظام التخزين هذا' : 'Activate this storage driver',
    s3Key: isRTL ? 'مفتاح Access Key ID' : 'Access Key ID',
    s3Secret: isRTL ? 'كلمة سر Secret Access Key' : 'Secret Access Key',
    s3Region: isRTL ? 'المنطقة Region' : 'Region',
    s3Bucket: isRTL ? 'اسم الحاوية Bucket Name' : 'Bucket Name',
    s3Endpoint: isRTL ? 'رابط Endpoint (مطلوب للوسابي، واختياري للـ S3)' : 'Endpoint URL (required for Wasabi, optional for S3)',
    usePathStyle: isRTL ? 'استخدام مسار Path-style للـ Endpoint' : 'Use path-style endpoint',
    localDesc: isRTL ? 'التخزين المحلي الافتراضي. سيتم حفظ صور القصص في مجلد storage/app/public الخاص بـ Laravel.' : 'Default local storage. Story files and photos are stored locally in the Laravel storage/app/public directory.',
    s3Desc: isRTL ? 'تخزين سحابي باستخدام Amazon S3. ممتاز للمشاريع الإنتاجية العالية.' : 'Cloud storage using Amazon Web Services S3 bucket. Best for production environments.',
    wasabiDesc: isRTL ? 'تخزين سحابي اقتصادي ومتوافق بالكامل مع S3 من Wasabi.' : 'Cost-effective, high-performance, S3-compatible cloud storage from Wasabi.',
    placeholder: {
      publicKey: isRTL ? 'pk_test_...' : 'pk_test_...',
      secretKey: isRTL ? 'sk_test_... (اتركه فارغاً للإبقاء على الحالي)' : 'sk_test_... (leave empty to keep current)',
      webhookSecret: isRTL ? 'whsec_... (اتركه فارغاً للإبقاء على الحالي)' : 'whsec_... (leave empty to keep current)',
    },
  };

  const [activeTab, setActiveTab] = useState<'payments' | 'storage'>('payments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  // Payment settings state
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
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

  // Storage settings state
  const [storageSettings, setStorageSettings] = useState<StorageSettings | null>(null);
  const [localForm, setLocalForm] = useState({ is_active: false });
  const [s3Form, setS3Form] = useState({
    is_active: false,
    key: '',
    secret: '',
    region: '',
    bucket: '',
    endpoint: '',
    use_path_style_endpoint: false,
  });
  const [wasabiForm, setWasabiForm] = useState({
    is_active: false,
    key: '',
    secret: '',
    region: '',
    bucket: '',
    endpoint: '',
    use_path_style_endpoint: true,
  });

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        const [payData, storeData] = await Promise.all([
          apiGetPaymentSettings(),
          apiGetStorageSettings(),
        ]);

        // Setup payments
        setPaymentSettings(payData.settings);
        if (payData.settings.stripe) {
          setStripeForm({
            is_enabled: payData.settings.stripe.is_enabled,
            is_sandbox: payData.settings.stripe.is_sandbox,
            public_key: payData.settings.stripe.public_key || '',
            secret_key: '',
            webhook_secret: '',
          });
        }
        if (payData.settings.paypal) {
          setPaypalForm({
            is_enabled: payData.settings.paypal.is_enabled,
            is_sandbox: payData.settings.paypal.is_sandbox,
            public_key: payData.settings.paypal.public_key || '',
            secret_key: '',
            webhook_secret: '',
          });
        }

        // Setup storage
        setStorageSettings(storeData.settings);
        if (storeData.settings.local) {
          setLocalForm({ is_active: storeData.settings.local.is_active });
        }
        if (storeData.settings.s3) {
          setS3Form({
            is_active: storeData.settings.s3.is_active,
            key: '',
            secret: '',
            region: storeData.settings.s3.region || '',
            bucket: storeData.settings.s3.bucket || '',
            endpoint: storeData.settings.s3.endpoint || '',
            use_path_style_endpoint: storeData.settings.s3.use_path_style_endpoint,
          });
        }
        if (storeData.settings.wasabi) {
          setWasabiForm({
            is_active: storeData.settings.wasabi.is_active,
            key: '',
            secret: '',
            region: storeData.settings.wasabi.region || '',
            bucket: storeData.settings.wasabi.bucket || '',
            endpoint: storeData.settings.wasabi.endpoint || '',
            use_path_style_endpoint: storeData.settings.wasabi.use_path_style_endpoint,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAllSettings();
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

  // Storage Form Submissions
  const handleSaveLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('local');
    try {
      await apiUpdateStorageSettings('local', { is_active: localForm.is_active });
      alert(t.saveSuccess);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveS3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('s3');
    try {
      const data: Record<string, unknown> = {
        is_active: s3Form.is_active,
        region: s3Form.region,
        bucket: s3Form.bucket,
        endpoint: s3Form.endpoint,
        use_path_style_endpoint: s3Form.use_path_style_endpoint,
      };
      if (s3Form.key) data.key = s3Form.key;
      if (s3Form.secret) data.secret = s3Form.secret;

      await apiUpdateStorageSettings('s3', data);
      alert(t.saveSuccess);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveWasabi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('wasabi');
    try {
      const data: Record<string, unknown> = {
        is_active: wasabiForm.is_active,
        region: wasabiForm.region,
        bucket: wasabiForm.bucket,
        endpoint: wasabiForm.endpoint,
        use_path_style_endpoint: wasabiForm.use_path_style_endpoint,
      };
      if (wasabiForm.key) data.key = wasabiForm.key;
      if (wasabiForm.secret) data.secret = wasabiForm.secret;

      await apiUpdateStorageSettings('wasabi', data);
      alert(t.saveSuccess);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(null);
    }
  };

  const handleTestStorage = async (driver: string) => {
    setTesting(driver);
    try {
      const result = await apiTestStorageConnection(driver);
      alert(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.testError);
    } finally {
      setTesting(null);
    }
  };

  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [showWasabiSecret, setShowWasabiSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none';
  const labelClass =
    'flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <CreditCard size={18} />
          {t.tabPayments}
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'storage'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Database size={18} />
          {t.tabStorage}
        </button>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400">
        <Shield size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong className="font-semibold">{isRTL ? 'ملاحظة أمان:' : 'Security Notice:'}</strong>{' '}
          {t.securityNotice}
        </p>
      </div>

      {activeTab === 'payments' ? (
        /* Payments Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stripe Settings */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/20">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {t.stripe}
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {paymentSettings?.stripe?.is_enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <Check size={12} /> {t.enabled}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      <X size={12} /> {t.disabled}
                    </span>
                  )}
                  {paymentSettings?.stripe?.is_sandbox && (
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t.enableStripe}
                  </span>
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t.sandboxMode}
                  </span>
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
                  {paymentSettings?.stripe?.has_secret_key && (
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
                  {paymentSettings?.stripe?.has_webhook_secret && (
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.webhookUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentSettings?.stripe?.webhook_url || '', 'stripe-webhook')}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    {copied === 'stripe-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copied === 'stripe-webhook' ? t.copied : t.copy}
                  </button>
                </div>
                <code className="block text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-200 break-all bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800">
                  {paymentSettings?.stripe?.webhook_url}
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
                  disabled={testing === 'stripe' || !paymentSettings?.stripe?.is_enabled}
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
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {t.paypal}
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {paymentSettings?.paypal?.is_enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <Check size={12} /> {t.enabled}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      <X size={12} /> {t.disabled}
                    </span>
                  )}
                  {paymentSettings?.paypal?.is_sandbox && (
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t.enablePaypal}
                  </span>
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t.sandboxMode}
                  </span>
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
                  {paymentSettings?.paypal?.has_secret_key && (
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
                  {paymentSettings?.paypal?.has_webhook_secret && (
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.webhookUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentSettings?.paypal?.webhook_url || '', 'paypal-webhook')}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    {copied === 'paypal-webhook' ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copied === 'paypal-webhook' ? t.copied : t.copy}
                  </button>
                </div>
                <code className="block text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-200 break-all bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800">
                  {paymentSettings?.paypal?.webhook_url}
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
                  disabled={testing === 'paypal' || !paymentSettings?.paypal?.is_enabled}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {testing === 'paypal' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {testing === 'paypal' ? t.testing : t.testConnection}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Storage Settings List */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Local Storage Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 shrink-0">
                  <Server size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {isRTL ? 'تخزين محلي' : 'Local Storage'}
                  </h3>
                  <div className="mt-1">
                    {storageSettings?.local?.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                        {t.storageActive}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {t.storageInactive}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.localDesc}</p>
            </div>

            <form onSubmit={handleSaveLocal}>
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={localForm.is_active}
                      onChange={(e) => setLocalForm({ is_active: e.target.checked })}
                      disabled={storageSettings?.local?.is_active}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-50"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t.activateDriver}
                  </span>
                </label>
              </div>

              {!storageSettings?.local?.is_active && (
                <button
                  type="submit"
                  disabled={saving === 'local'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  {saving === 'local' ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t.saveSettings}
                </button>
              )}
            </form>
          </div>

          {/* Amazon S3 Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/20">
                <Cloud size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  Amazon S3
                </h3>
                <div className="mt-1">
                  {storageSettings?.s3?.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      {t.storageActive}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {t.storageInactive}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.s3Desc}</p>

            <form onSubmit={handleSaveS3} className="flex flex-col gap-4">
              <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={s3Form.is_active}
                      onChange={(e) => setS3Form({ ...s3Form, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t.activateDriver}
                  </span>
                </label>
              </div>

              <div>
                <label className={labelClass}>{t.s3Key}</label>
                <input
                  type="text"
                  value={s3Form.key}
                  onChange={(e) => setS3Form({ ...s3Form, key: e.target.value })}
                  placeholder={
                    storageSettings?.s3?.has_key ? 'Encrypted (leave empty to keep current)' : 'Access Key'
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t.s3Secret}
                  {storageSettings?.s3?.has_secret && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Configured
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showS3Secret ? 'text' : 'password'}
                    value={s3Form.secret}
                    onChange={(e) => setS3Form({ ...s3Form, secret: e.target.value })}
                    placeholder={
                      storageSettings?.s3?.has_secret
                        ? '•••••••••••••••• (leave empty to keep)'
                        : 'Secret Key'
                    }
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
                  value={s3Form.region}
                  onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })}
                  placeholder="us-east-1"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t.s3Bucket}</label>
                <input
                  type="text"
                  value={s3Form.bucket}
                  onChange={(e) => setS3Form({ ...s3Form, bucket: e.target.value })}
                  placeholder="bucket-name"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving === 's3'}
                  className="flex-[2] flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  {saving === 's3' ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t.saveSettings}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestStorage('s3')}
                  disabled={testing === 's3' || !storageSettings?.s3?.has_key}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {testing === 's3' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {t.testConnection}
                </button>
              </div>
            </form>
          </div>

          {/* Wasabi Storage Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-teal-500/20">
                <Cloud size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  Wasabi Storage
                </h3>
                <div className="mt-1">
                  {storageSettings?.wasabi?.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      {t.storageActive}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {t.storageInactive}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.wasabiDesc}</p>

            <form onSubmit={handleSaveWasabi} className="flex flex-col gap-4">
              <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={wasabiForm.is_active}
                      onChange={(e) => setWasabiForm({ ...wasabiForm, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t.activateDriver}
                  </span>
                </label>
              </div>

              <div>
                <label className={labelClass}>{t.s3Key}</label>
                <input
                  type="text"
                  value={wasabiForm.key}
                  onChange={(e) => setWasabiForm({ ...wasabiForm, key: e.target.value })}
                  placeholder={
                    storageSettings?.wasabi?.has_key ? 'Encrypted (leave empty to keep current)' : 'Access Key'
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t.s3Secret}
                  {storageSettings?.wasabi?.has_secret && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Configured
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showWasabiSecret ? 'text' : 'password'}
                    value={wasabiForm.secret}
                    onChange={(e) => setWasabiForm({ ...wasabiForm, secret: e.target.value })}
                    placeholder={
                      storageSettings?.wasabi?.has_secret
                        ? '•••••••••••••••• (leave empty to keep)'
                        : 'Secret Key'
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWasabiSecret(!showWasabiSecret)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showWasabiSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>{t.s3Region}</label>
                <input
                  type="text"
                  value={wasabiForm.region}
                  onChange={(e) => setWasabiForm({ ...wasabiForm, region: e.target.value })}
                  placeholder="us-east-1"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t.s3Bucket}</label>
                <input
                  type="text"
                  value={wasabiForm.bucket}
                  onChange={(e) => setWasabiForm({ ...wasabiForm, bucket: e.target.value })}
                  placeholder="bucket-name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t.s3Endpoint}</label>
                <input
                  type="text"
                  value={wasabiForm.endpoint}
                  onChange={(e) => setWasabiForm({ ...wasabiForm, endpoint: e.target.value })}
                  placeholder="https://s3.wasabisys.com"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving === 'wasabi'}
                  className="flex-[2] flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  {saving === 'wasabi' ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t.saveSettings}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestStorage('wasabi')}
                  disabled={testing === 'wasabi' || !storageSettings?.wasabi?.has_key}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {testing === 'wasabi' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {t.testConnection}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
