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
import StudioInput from '@/components/StudioInput';
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
  CheckCircle2,
  Database,
  Cloud,
  Server,
  Loader2,
  Sparkles,
  Globe2,
  HardDrive,
  CheckCheck,
} from 'lucide-react';

export default function PaymentSettingsPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'إعدادات الدفع والتخزين السحابي' : 'Payment & Storage Infrastructure',
    subtitle: isRTL
      ? 'إدارة بوابات الدفع الإلكتروني، مفاتيح الـ API المشفرة، ومحركات التخزين السحابي'
      : 'Manage payment gateways, encrypted API keys, and cloud storage providers',
    securityNotice: isRTL
      ? 'ملاحظة أمان مشددة: جميع مفاتيح الـ API وبيانات الاعتماد مشفرة في قاعدة البيانات باستخدام AES-256. المفاتيح السرية لا تظهر أبداً بعد الحفظ.'
      : 'Security Notice: All API credentials and secrets are encrypted at rest using AES-256. Secrets are never exposed after storage.',
    stripe: 'Stripe',
    paypal: 'PayPal',
    myfatoorah: 'MyFatoorah',
    enabled: isRTL ? 'مفعل' : 'Active',
    disabled: isRTL ? 'غير مفعل' : 'Inactive',
    sandbox: isRTL ? 'بيئة الاختبار (Sandbox)' : 'Sandbox Mode',
    production: isRTL ? 'بيئة الإنتاج (Live)' : 'Live Mode',
    enableStripe: isRTL ? 'تفعيل بوابة Stripe' : 'Enable Stripe Gateway',
    enablePaypal: isRTL ? 'تفعيل بوابة PayPal' : 'Enable PayPal Gateway',
    enableMyfatoorah: isRTL ? 'تفعيل بوابة MyFatoorah' : 'Enable MyFatoorah Gateway',
    sandboxMode: isRTL ? 'وضع الرمل (Sandbox)' : 'Sandbox Environment',
    publishableKey: isRTL ? 'المفتاح العام (Publishable Key)' : 'Publishable Key / Client ID',
    secretKey: isRTL ? 'المفتاح السري (Secret Key)' : 'Secret Key / Token',
    configured: isRTL ? 'تم التكوين' : 'Configured',
    webhookSecret: isRTL ? 'سر الـ Webhook' : 'Webhook Secret / ID',
    webhookUrl: isRTL ? 'رابط استلام الـ Webhook' : 'Webhook Callback URL',
    copy: isRTL ? 'نسخ' : 'Copy',
    copied: isRTL ? 'تم النسخ!' : 'Copied!',
    saveSettings: isRTL ? 'حفظ الإعدادات' : 'Save Settings',
    saving: isRTL ? 'جاري الحفظ...' : 'Saving...',
    testConnection: isRTL ? 'اختبار الاتصال' : 'Test Connection',
    testing: isRTL ? 'جاري الفحص...' : 'Testing...',
    saveSuccess: isRTL ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!',
    saveError: isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings',
    testError: isRTL ? 'فشل اختبار الاتصال' : 'Connection test failed',
    tabPayments: isRTL ? 'بوابات الدفع الإلكتروني' : 'Payment Gateways',
    tabStorage: isRTL ? 'التخزين السحابي والملفات' : 'Cloud Storage Drivers',
    storageActive: isRTL ? 'المحرك النشط' : 'Active Driver',
    storageInactive: isRTL ? 'معطل' : 'Standby',
    activateDriver: isRTL ? 'تعيين كمحرك التخزين الأساسي' : 'Set as Primary Driver',
    s3Key: isRTL ? 'مفتاح Access Key ID' : 'Access Key ID',
    s3Secret: isRTL ? 'المفتاح السري Secret Access Key' : 'Secret Access Key',
    s3Region: isRTL ? 'منطقة الخادم (Region)' : 'Bucket Region',
    s3Bucket: isRTL ? 'اسم الحاوية (Bucket Name)' : 'Bucket Name',
    s3Endpoint: isRTL ? 'رابط Endpoint (مطلوب لـ Wasabi / S3 مخصص)' : 'Endpoint URL (required for Wasabi)',
    localDesc: isRTL
      ? 'التخزين المحلي الافتراضي على نفس خادم التطبيق (storage/app/public). مناسب للتطوير والمشاريع الأولية.'
      : 'Default local server disk storage (storage/app/public). Ideal for development or single-node deployments.',
    s3Desc: isRTL
      ? 'تخزين سحابي عالي التوافر عبر Amazon Web Services S3. مثالي للمشاريع الإنتاجية الكبرى والملفات الضخمة.'
      : 'High-availability, enterprise-grade cloud object storage with AWS S3. Recommended for scale.',
    wasabiDesc: isRTL
      ? 'تخزين سحابي عالي الأداء ومتوافق مع S3 بتكلفة اقتصادية وبدون رسوم نقل بيانات (Egress).'
      : 'High-performance, cost-effective S3-compatible cloud storage with no egress fees.',
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
  const [myfatoorahForm, setMyfatoorahForm] = useState({
    is_enabled: false,
    is_sandbox: true,
    secret_key: '',
    webhook_secret: '',
    country: 'SA',
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

  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [showWasabiSecret, setShowWasabiSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        const [payData, storeData] = await Promise.all([
          apiGetPaymentSettings(),
          apiGetStorageSettings(),
        ]);

        setPaymentSettings(payData.settings);
        if (payData.settings.stripe) {
          setStripeForm({
            is_enabled: !!payData.settings.stripe.is_enabled,
            is_sandbox: !!payData.settings.stripe.is_sandbox,
            public_key: payData.settings.stripe.public_key || '',
            secret_key: '',
            webhook_secret: '',
          });
        }
        if (payData.settings.paypal) {
          setPaypalForm({
            is_enabled: !!payData.settings.paypal.is_enabled,
            is_sandbox: !!payData.settings.paypal.is_sandbox,
            public_key: payData.settings.paypal.public_key || '',
            secret_key: '',
            webhook_secret: '',
          });
        }
        if (payData.settings.myfatoorah) {
          setMyfatoorahForm({
            is_enabled: !!payData.settings.myfatoorah.is_enabled,
            is_sandbox: !!payData.settings.myfatoorah.is_sandbox,
            secret_key: '',
            webhook_secret: '',
            country: String(payData.settings.myfatoorah.additional_settings?.country || 'SA'),
          });
        }

        setStorageSettings(storeData.settings);
        if (storeData.settings.local) {
          setLocalForm({ is_active: !!storeData.settings.local.is_active });
        }
        if (storeData.settings.s3) {
          setS3Form({
            is_active: !!storeData.settings.s3.is_active,
            key: '',
            secret: '',
            region: storeData.settings.s3.region || '',
            bucket: storeData.settings.s3.bucket || '',
            endpoint: storeData.settings.s3.endpoint || '',
            use_path_style_endpoint: !!storeData.settings.s3.use_path_style_endpoint,
          });
        }
        if (storeData.settings.wasabi) {
          setWasabiForm({
            is_active: !!storeData.settings.wasabi.is_active,
            key: '',
            secret: '',
            region: storeData.settings.wasabi.region || '',
            bucket: storeData.settings.wasabi.bucket || '',
            endpoint: storeData.settings.wasabi.endpoint || '',
            use_path_style_endpoint: !!storeData.settings.wasabi.use_path_style_endpoint,
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

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

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

  const handleSaveMyfatoorah = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('myfatoorah');
    try {
      const data: Record<string, unknown> = {
        is_enabled: myfatoorahForm.is_enabled,
        is_sandbox: myfatoorahForm.is_sandbox,
        additional_settings: {
          country: myfatoorahForm.country,
          currency:
            myfatoorahForm.country === 'EG'
              ? 'EGP'
              : myfatoorahForm.country === 'KW'
              ? 'KWD'
              : myfatoorahForm.country === 'AE'
              ? 'AED'
              : myfatoorahForm.country === 'BH'
              ? 'BHD'
              : myfatoorahForm.country === 'QA'
              ? 'QAR'
              : myfatoorahForm.country === 'OM'
              ? 'OMR'
              : 'SAR',
        },
      };
      if (myfatoorahForm.secret_key) data.secret_key = myfatoorahForm.secret_key;
      if (myfatoorahForm.webhook_secret) data.webhook_secret = myfatoorahForm.webhook_secret;

      await apiUpdatePaymentSettings('myfatoorah', data);
      alert(t.saveSuccess);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(null);
    }
  };

  const handleTestPayment = async (gateway: 'stripe' | 'paypal' | 'myfatoorah') => {
    setTesting(gateway);
    try {
      const res = await apiTestPaymentConnection(gateway);
      alert(res.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.testError);
    } finally {
      setTesting(null);
    }
  };

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
      const res = await apiTestStorageConnection(driver);
      alert(res.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : t.testError);
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] gap-4">
        <Loader2 size={36} className="animate-spin text-brand-blue" />
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          Loading credentials...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-blue/10 border border-brand-blue/20 text-brand-blue mb-3">
            <Sparkles size={13} />
            {isRTL ? 'تكوين البنية التحتية' : 'Infrastructure Engine'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {t.subtitle}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg shadow-brand-blue/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard size={15} />
            <span>{t.tabPayments}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'storage'
                ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg shadow-brand-blue/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDrive size={15} />
            <span>{t.tabStorage}</span>
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-amber-800 dark:text-amber-300">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <Shield size={18} />
          </div>
          <div className="text-xs leading-relaxed">
            <strong className="font-semibold block mb-0.5">
              {isRTL ? 'طبقة تشفير آمنة' : 'Encrypted Credentials'}
            </strong>
            {t.securityNotice}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'payments' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stripe Card */}
          <div className="studio-card p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t.stripe}
                    </h3>
                    <p className="text-xs text-slate-400">Cards, Apple Pay, Google Pay</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium ${
                      paymentSettings?.stripe?.is_enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        paymentSettings?.stripe?.is_enabled ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {paymentSettings?.stripe?.is_enabled ? t.enabled : t.disabled}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveStripe} className="space-y-5">
                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.enableStripe}
                    </span>
                    <input
                      type="checkbox"
                      checked={stripeForm.is_enabled}
                      onChange={(e) => setStripeForm({ ...stripeForm, is_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.sandboxMode}
                    </span>
                    <input
                      type="checkbox"
                      checked={stripeForm.is_sandbox}
                      onChange={(e) => setStripeForm({ ...stripeForm, is_sandbox: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>
                </div>

                <StudioInput
                  label={t.publishableKey}
                  type="text"
                  value={stripeForm.public_key}
                  onChange={(e) => setStripeForm({ ...stripeForm, public_key: e.target.value })}
                  placeholder="pk_test_..."
                  leadIcon={<Globe2 size={16} />}
                />

                <div className="relative">
                  <StudioInput
                    label={t.secretKey}
                    type={showStripeSecret ? 'text' : 'password'}
                    value={stripeForm.secret_key}
                    onChange={(e) => setStripeForm({ ...stripeForm, secret_key: e.target.value })}
                    placeholder={
                      paymentSettings?.stripe?.has_secret_key
                        ? '•••••••••••••••• (Encrypted — leave empty to keep)'
                        : 'sk_test_...'
                    }
                    leadIcon={<Lock size={16} />}
                    trailIcon={
                      <button
                        type="button"
                        onClick={() => setShowStripeSecret(!showStripeSecret)}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showStripeSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  {paymentSettings?.stripe?.has_secret_key && (
                    <span className="absolute top-0 right-0 rtl:right-auto rtl:left-0 text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                      <CheckCheck size={12} /> {t.configured}
                    </span>
                  )}
                </div>

                <StudioInput
                  label={t.webhookSecret}
                  type="password"
                  value={stripeForm.webhook_secret}
                  onChange={(e) => setStripeForm({ ...stripeForm, webhook_secret: e.target.value })}
                  placeholder={
                    paymentSettings?.stripe?.has_webhook_secret
                      ? '•••••••••••••••• (Leave blank to keep)'
                      : 'whsec_...'
                  }
                  leadIcon={<Shield size={16} />}
                />

                {/* Webhook URL pill */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{t.webhookUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentSettings?.stripe?.webhook_url || '', 'stripe')}
                      className="flex items-center gap-1 text-brand-blue hover:text-brand-purple transition-colors font-sans text-xs"
                    >
                      {copied === 'stripe' ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                      {copied === 'stripe' ? t.copied : t.copy}
                    </button>
                  </div>
                  <code className="block text-[11px] font-mono text-cyan-400 break-all select-all">
                    {paymentSettings?.stripe?.webhook_url || 'https://api.nazstudio.art/api/v1/payments/stripe/webhook'}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving === 'stripe'}
                    className="flex-1 py-3 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving === 'stripe' ? <Loader2 size={16} className="animate-spin" /> : null}
                    {saving === 'stripe' ? t.saving : t.saveSettings}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPayment('stripe')}
                    disabled={testing === 'stripe' || !paymentSettings?.stripe?.is_enabled}
                    className="py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {testing === 'stripe' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {testing === 'stripe' ? t.testing : t.testConnection}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* PayPal Card */}
          <div className="studio-card p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t.paypal}
                    </h3>
                    <p className="text-xs text-slate-400">PayPal Wallet, Subscriptions</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium ${
                      paymentSettings?.paypal?.is_enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        paymentSettings?.paypal?.is_enabled ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {paymentSettings?.paypal?.is_enabled ? t.enabled : t.disabled}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSavePaypal} className="space-y-5">
                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.enablePaypal}
                    </span>
                    <input
                      type="checkbox"
                      checked={paypalForm.is_enabled}
                      onChange={(e) => setPaypalForm({ ...paypalForm, is_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.sandboxMode}
                    </span>
                    <input
                      type="checkbox"
                      checked={paypalForm.is_sandbox}
                      onChange={(e) => setPaypalForm({ ...paypalForm, is_sandbox: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>
                </div>

                <StudioInput
                  label="Client ID"
                  type="text"
                  value={paypalForm.public_key}
                  onChange={(e) => setPaypalForm({ ...paypalForm, public_key: e.target.value })}
                  placeholder="A..."
                  leadIcon={<Globe2 size={16} />}
                />

                <div className="relative">
                  <StudioInput
                    label="Client Secret"
                    type={showPaypalSecret ? 'text' : 'password'}
                    value={paypalForm.secret_key}
                    onChange={(e) => setPaypalForm({ ...paypalForm, secret_key: e.target.value })}
                    placeholder={
                      paymentSettings?.paypal?.has_secret_key
                        ? '•••••••••••••••• (Leave blank to keep)'
                        : 'E...'
                    }
                    leadIcon={<Lock size={16} />}
                    trailIcon={
                      <button
                        type="button"
                        onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPaypalSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  {paymentSettings?.paypal?.has_secret_key && (
                    <span className="absolute top-0 right-0 rtl:right-auto rtl:left-0 text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                      <CheckCheck size={12} /> {t.configured}
                    </span>
                  )}
                </div>

                <StudioInput
                  label="Webhook ID"
                  type="text"
                  value={paypalForm.webhook_secret}
                  onChange={(e) => setPaypalForm({ ...paypalForm, webhook_secret: e.target.value })}
                  placeholder={
                    paymentSettings?.paypal?.has_webhook_secret
                      ? '•••••••••••••••• (Leave blank to keep)'
                      : '0...'
                  }
                  leadIcon={<Shield size={16} />}
                />

                {/* Webhook URL pill */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{t.webhookUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentSettings?.paypal?.webhook_url || '', 'paypal')}
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors font-sans text-xs"
                    >
                      {copied === 'paypal' ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                      {copied === 'paypal' ? t.copied : t.copy}
                    </button>
                  </div>
                  <code className="block text-[11px] font-mono text-cyan-400 break-all select-all">
                    {paymentSettings?.paypal?.webhook_url || 'https://api.nazstudio.art/api/v1/payments/paypal/webhook'}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving === 'paypal'}
                    className="flex-1 py-3 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving === 'paypal' ? <Loader2 size={16} className="animate-spin" /> : null}
                    {saving === 'paypal' ? t.saving : t.saveSettings}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPayment('paypal')}
                    disabled={testing === 'paypal' || !paymentSettings?.paypal?.is_enabled}
                    className="py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {testing === 'paypal' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {testing === 'paypal' ? t.testing : t.testConnection}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* MyFatoorah Card */}
          <div className="studio-card p-6 md:p-8 lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t.myfatoorah}
                  </h3>
                  <p className="text-xs text-slate-400">
                    GCC & Regional Payment Processing (Mada, KNET, Apple Pay, Benefit, Meeza)
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium self-start md:self-auto ${
                  paymentSettings?.myfatoorah?.is_enabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    paymentSettings?.myfatoorah?.is_enabled ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {paymentSettings?.myfatoorah?.is_enabled ? t.enabled : t.disabled}
              </span>
            </div>

            <form onSubmit={handleSaveMyfatoorah} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.enableMyfatoorah}
                    </span>
                    <input
                      type="checkbox"
                      checked={myfatoorahForm.is_enabled}
                      onChange={(e) => setMyfatoorahForm({ ...myfatoorahForm, is_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.sandboxMode}
                    </span>
                    <input
                      type="checkbox"
                      checked={myfatoorahForm.is_sandbox}
                      onChange={(e) => setMyfatoorahForm({ ...myfatoorahForm, is_sandbox: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {isRTL ? 'دولة الحساب والعملة الافتراضية' : 'Account Country & Default Currency'}
                  </label>
                  <select
                    value={myfatoorahForm.country}
                    onChange={(e) => setMyfatoorahForm({ ...myfatoorahForm, country: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-brand-blue"
                  >
                    <option value="SA">Saudi Arabia — SAR (ريال سعودي)</option>
                    <option value="AE">United Arab Emirates — AED (درهم إماراتي)</option>
                    <option value="KW">Kuwait — KWD (دينار كويتي)</option>
                    <option value="BH">Bahrain — BHD (دينار بحريني)</option>
                    <option value="QA">Qatar — QAR (ريال قطري)</option>
                    <option value="OM">Oman — OMR (ريال عماني)</option>
                    <option value="EG">Egypt — EGP (جنيه مصري)</option>
                  </select>
                </div>

                <div className="relative">
                  <StudioInput
                    label={isRTL ? 'رمز الـ API المشفر (API Token)' : 'API Secret Token'}
                    type="password"
                    value={myfatoorahForm.secret_key}
                    onChange={(e) => setMyfatoorahForm({ ...myfatoorahForm, secret_key: e.target.value })}
                    placeholder={
                      paymentSettings?.myfatoorah?.has_secret_key
                        ? '•••••••••••••••• (Encrypted — leave empty to keep)'
                        : 'Paste API Token'
                    }
                    leadIcon={<Lock size={16} />}
                  />
                  {paymentSettings?.myfatoorah?.has_secret_key && (
                    <span className="absolute top-0 right-0 rtl:right-auto rtl:left-0 text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                      <CheckCheck size={12} /> {t.configured}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <StudioInput
                    label={isRTL ? 'مفتاح توقيع الـ Webhook' : 'Webhook Secret'}
                    type="password"
                    value={myfatoorahForm.webhook_secret}
                    onChange={(e) => setMyfatoorahForm({ ...myfatoorahForm, webhook_secret: e.target.value })}
                    placeholder={
                      paymentSettings?.myfatoorah?.has_webhook_secret
                        ? '•••••••••••••••• (Leave blank to keep)'
                        : 'Secret from portal'
                    }
                    leadIcon={<Shield size={16} />}
                  />

                  {/* Webhook URL pill */}
                  <div className="p-3.5 mt-4 rounded-2xl bg-slate-900 text-slate-200 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{t.webhookUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentSettings?.myfatoorah?.webhook_url || '', 'myfatoorah')}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-sans text-xs"
                      >
                        {copied === 'myfatoorah' ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                        {copied === 'myfatoorah' ? t.copied : t.copy}
                      </button>
                    </div>
                    <code className="block text-[11px] font-mono text-emerald-400 break-all select-all">
                      {paymentSettings?.myfatoorah?.webhook_url ||
                        'https://api.nazstudio.art/api/v1/payments/myfatoorah/webhook'}
                    </code>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving === 'myfatoorah'}
                    className="flex-1 py-3 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving === 'myfatoorah' ? <Loader2 size={16} className="animate-spin" /> : null}
                    {saving === 'myfatoorah' ? t.saving : t.saveSettings}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPayment('myfatoorah')}
                    disabled={testing === 'myfatoorah' || !paymentSettings?.myfatoorah?.is_enabled}
                    className="py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {testing === 'myfatoorah' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {testing === 'myfatoorah' ? t.testing : t.testConnection}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Storage Drivers Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Local Disk Card */}
          <div className="studio-card p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-lg shadow-black/20">
                  <Server size={22} />
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium ${
                    storageSettings?.local?.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      storageSettings?.local?.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {storageSettings?.local?.is_active ? t.storageActive : t.storageInactive}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {isRTL ? 'القرص المحلي (Local Disk)' : 'Local Storage Disk'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t.localDesc}
              </p>
            </div>

            <form onSubmit={handleSaveLocal} className="space-y-4">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.activateDriver}
                </span>
                <input
                  type="checkbox"
                  checked={localForm.is_active}
                  onChange={(e) => setLocalForm({ is_active: e.target.checked })}
                  disabled={storageSettings?.local?.is_active}
                  className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue disabled:opacity-40"
                />
              </label>

              {!storageSettings?.local?.is_active && (
                <button
                  type="submit"
                  disabled={saving === 'local'}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {saving === 'local' ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t.saveSettings}
                </button>
              )}
            </form>
          </div>

          {/* Amazon S3 Card */}
          <div className="studio-card p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <Cloud size={22} />
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium ${
                    storageSettings?.s3?.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      storageSettings?.s3?.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {storageSettings?.s3?.is_active ? t.storageActive : t.storageInactive}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Amazon S3</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t.s3Desc}
              </p>

              <form onSubmit={handleSaveS3} className="space-y-4">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.activateDriver}
                  </span>
                  <input
                    type="checkbox"
                    checked={s3Form.is_active}
                    onChange={(e) => setS3Form({ ...s3Form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                  />
                </label>

                <StudioInput
                  label={t.s3Key}
                  type="text"
                  value={s3Form.key}
                  onChange={(e) => setS3Form({ ...s3Form, key: e.target.value })}
                  placeholder={storageSettings?.s3?.has_key ? 'Encrypted (leave empty to keep)' : 'AKIA...'}
                  leadIcon={<Database size={16} />}
                />

                <StudioInput
                  label={t.s3Secret}
                  type={showS3Secret ? 'text' : 'password'}
                  value={s3Form.secret}
                  onChange={(e) => setS3Form({ ...s3Form, secret: e.target.value })}
                  placeholder={storageSettings?.s3?.has_secret ? '••••••••••••••••' : 'Secret Key'}
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

                <div className="grid grid-cols-2 gap-3">
                  <StudioInput
                    label={t.s3Region}
                    type="text"
                    value={s3Form.region}
                    onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })}
                    placeholder="us-east-1"
                  />
                  <StudioInput
                    label={t.s3Bucket}
                    type="text"
                    value={s3Form.bucket}
                    onChange={(e) => setS3Form({ ...s3Form, bucket: e.target.value })}
                    placeholder="my-bucket"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving === 's3'}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {saving === 's3' ? <Loader2 size={14} className="animate-spin" /> : null}
                    {saving === 's3' ? t.saving : t.saveSettings}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestStorage('s3')}
                    disabled={testing === 's3' || !storageSettings?.s3?.has_key}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1 disabled:opacity-40"
                  >
                    {testing === 's3' ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    {t.testConnection}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Wasabi Storage Card */}
          <div className="studio-card p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                  <Cloud size={22} />
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium ${
                    storageSettings?.wasabi?.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      storageSettings?.wasabi?.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {storageSettings?.wasabi?.is_active ? t.storageActive : t.storageInactive}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Wasabi Cloud</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t.wasabiDesc}
              </p>

              <form onSubmit={handleSaveWasabi} className="space-y-4">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.activateDriver}
                  </span>
                  <input
                    type="checkbox"
                    checked={wasabiForm.is_active}
                    onChange={(e) => setWasabiForm({ ...wasabiForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500"
                  />
                </label>

                <StudioInput
                  label={t.s3Key}
                  type="text"
                  value={wasabiForm.key}
                  onChange={(e) => setWasabiForm({ ...wasabiForm, key: e.target.value })}
                  placeholder={
                    storageSettings?.wasabi?.has_key ? 'Encrypted (leave empty to keep)' : 'Access Key'
                  }
                  leadIcon={<Database size={16} />}
                />

                <StudioInput
                  label={t.s3Secret}
                  type={showWasabiSecret ? 'text' : 'password'}
                  value={wasabiForm.secret}
                  onChange={(e) => setWasabiForm({ ...wasabiForm, secret: e.target.value })}
                  placeholder={storageSettings?.wasabi?.has_secret ? '••••••••••••••••' : 'Secret Key'}
                  leadIcon={<Lock size={16} />}
                  trailIcon={
                    <button
                      type="button"
                      onClick={() => setShowWasabiSecret(!showWasabiSecret)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showWasabiSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                <div className="grid grid-cols-2 gap-3">
                  <StudioInput
                    label={t.s3Region}
                    type="text"
                    value={wasabiForm.region}
                    onChange={(e) => setWasabiForm({ ...wasabiForm, region: e.target.value })}
                    placeholder="eu-central-1"
                  />
                  <StudioInput
                    label={t.s3Bucket}
                    type="text"
                    value={wasabiForm.bucket}
                    onChange={(e) => setWasabiForm({ ...wasabiForm, bucket: e.target.value })}
                    placeholder="my-bucket"
                  />
                </div>

                <StudioInput
                  label={t.s3Endpoint}
                  type="text"
                  value={wasabiForm.endpoint}
                  onChange={(e) => setWasabiForm({ ...wasabiForm, endpoint: e.target.value })}
                  placeholder="https://s3.eu-central-1.wasabisys.com"
                  leadIcon={<Globe2 size={16} />}
                />

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving === 'wasabi'}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {saving === 'wasabi' ? <Loader2 size={14} className="animate-spin" /> : null}
                    {saving === 'wasabi' ? t.saving : t.saveSettings}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestStorage('wasabi')}
                    disabled={testing === 'wasabi' || !storageSettings?.wasabi?.has_key}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1 disabled:opacity-40"
                  >
                    {testing === 'wasabi' ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    {t.testConnection}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
