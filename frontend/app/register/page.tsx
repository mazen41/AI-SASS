'use client';

import { FormEvent, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import {
  apiGetPublicPricingPlans,
  apiGetPublicPackage,
  apiRegisterInitiate,
  apiRegisterResendOtp,
  apiRegisterVerifyOtp,
  apiRegisterComplete,
  apiRegisterStatus,
  Plan,
  Package,
} from '@/lib/api';
import CustomCursor from '@/components/CustomCursor';
import StudioInput from '@/components/StudioInput';
import SplitTextReveal from '@/components/SplitTextReveal';
import StudioCanvas3D from '@/components/StudioCanvas3D';
import {
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  Globe,
  Check,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

type Step = 'package' | 'details' | 'otp';

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, toggleLocale, isRTL } = useLang();

  const searchParams = useSearchParams();
  const urlPlanParam = searchParams.get('plan') || '';
  const urlCycleParam = (searchParams.get('cycle') === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';
  const urlPackageId = searchParams.get('package') ? Number(searchParams.get('package')) : undefined;
  const resumeId = searchParams.get('resume');

  const [step, setStep] = useState<Step>('package');
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(urlCycleParam);

  // Fallback package for resume sessions
  const [resumedPackage, setResumedPackage] = useState<Package | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch public plans on mount
  useEffect(() => {
    let cancelled = false;
    apiGetPublicPricingPlans()
      .then((res) => {
        if (cancelled) return;
        const activePlans = (res.plans || []).filter((p) => p.is_active);
        setPlans(activePlans);

        // Pre-select if URL has plan param
        if (urlPlanParam) {
          const matched = activePlans.find(
            (p) =>
              p.slug.toLowerCase() === urlPlanParam.toLowerCase() ||
              String(p.id) === urlPlanParam
          );
          if (matched) {
            setSelectedPlan(matched);
            setStep('details');
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [urlPlanParam]);

  // 2. Restore an in-progress session if resumeId or sessionStorage exists
  useEffect(() => {
    const savedId = resumeId || sessionStorage.getItem('nazstudio_pending_registration');
    if (!savedId) return;
    let cancelled = false;
    setLoading(true);
    apiRegisterStatus(savedId)
      .then(async (status) => {
        if (cancelled) return;
        if (status.status === 'completed') {
          sessionStorage.removeItem('nazstudio_pending_registration');
          router.replace('/login?registered=1');
          return;
        }
        if (status.status === 'expired' || status.status === 'failed' || !status.package_id) {
          sessionStorage.removeItem('nazstudio_pending_registration');
          setError(
            locale === 'ar'
              ? 'انتهت جلسة التسجيل. ابدأ التسجيل مجددًا واختر الخطة.'
              : 'This registration session expired. Start again and choose your plan.'
          );
          return;
        }
        const packageResponse = await apiGetPublicPackage(status.package_id, locale);
        if (cancelled) return;
        setPendingId(savedId);
        setName(status.name || '');
        setEmail(status.email || '');
        setResumedPackage(packageResponse.package);
        setEmailVerified(
          Boolean(status.email_verified) ||
            status.status === 'otp_verified' ||
            status.status === 'awaiting_payment'
        );
        setStep('otp');
        if (resumeId) router.replace('/register');
      })
      .catch(() => {
        if (!cancelled) {
          sessionStorage.removeItem('nazstudio_pending_registration');
          setError(
            locale === 'ar'
              ? 'تعذر استعادة التسجيل. ابدأ التسجيل مجددًا.'
              : 'Could not restore your registration. Please start again.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeId, locale, router]);

  // 3. Fallback for legacy ?package=ID
  useEffect(() => {
    if (!urlPackageId || selectedPlan) return;
    apiGetPublicPackage(urlPackageId, locale)
      .then((res) => {
        setResumedPackage(res.package);
        setStep('details');
      })
      .catch(() => {});
  }, [urlPackageId, locale, selectedPlan]);

  const formatSar = (amount: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(amount);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  function choosePlan(plan: Plan) {
    setSelectedPlan(plan);
    setStep('details');
    router.replace(`/register?plan=${plan.slug}&cycle=${billingCycle}`);
  }

  const currentPrice = selectedPlan
    ? billingCycle === 'yearly' && Number(selectedPlan.yearly_price) > 0
      ? Number(selectedPlan.yearly_price)
      : Number(selectedPlan.price)
    : resumedPackage
    ? Number(resumedPackage.total_price)
    : 0;

  const currentPlanName = selectedPlan ? selectedPlan.name : resumedPackage ? resumedPackage.name : '';

  async function onSubmitDetails(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlan && !resumedPackage) return;
    if (password !== confirm) {
      return setError(locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
    }
    if (!termsAccepted) {
      return setError(
        locale === 'ar'
          ? 'يجب الموافقة على الشروط والأحكام للمتابعة'
          : 'You must accept the Terms & Conditions'
      );
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name,
        email,
        password,
        password_confirmation: confirm,
        terms_accepted: true as const,
        privacy_accepted: true as const,
        ...(selectedPlan
          ? {
              plan_id: selectedPlan.id,
              plan_slug: selectedPlan.slug,
              billing_cycle: billingCycle,
            }
          : {
              package_id: resumedPackage?.id,
            }),
      };

      const res = await apiRegisterInitiate(payload);
      setPendingId(res.pending_registration_id);
      sessionStorage.setItem('nazstudio_pending_registration', res.pending_registration_id);
      setEmailVerified(Boolean(res.email_verified || res.already_verified));
      setResendCooldown(res.already_verified ? 0 : 60);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (!pendingId || resendCooldown > 0) return;
    setError('');
    try {
      await apiRegisterResendOtp(pendingId);
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code');
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!pendingId) return;
    setLoading(true);
    setError('');
    try {
      if (!emailVerified) {
        try {
          await apiRegisterVerifyOtp(pendingId, otp);
          setEmailVerified(true);
        } catch (verifyError) {
          const status = await apiRegisterStatus(pendingId);
          if (
            !status.email_verified &&
            status.status !== 'otp_verified' &&
            status.status !== 'awaiting_payment'
          ) {
            throw verifyError;
          }
          setEmailVerified(true);
        }
      }
      const completeRes = await apiRegisterComplete(pendingId);

      if ('token' in completeRes) {
        // Free tier: direct login
        sessionStorage.removeItem('nazstudio_pending_registration');
        login(completeRes.token, completeRes.user);
        router.push('/dashboard');
      } else {
        // Paid tier: redirect to payment checkout (MyFatoorah / Moyasar)
        window.location.href = completeRes.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }

  const stepsMeta = [
    { id: 'package', num: '01', label: locale === 'ar' ? 'اختيار الخطة' : 'Choose Plan' },
    { id: 'details', num: '02', label: locale === 'ar' ? 'بيانات الحساب' : 'Account Details' },
    { id: 'otp', num: '03', label: locale === 'ar' ? 'التحقق الآمن' : 'Verification' },
  ];

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between relative overflow-hidden"
    >
      <CustomCursor />

      {/* ── Volumetric Ambient Background ── */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" />
        <div className="studio-glow-orb-3" />
        <div className="absolute inset-0 studio-grid-pattern opacity-25" />
      </div>

      {/* ── Global Header Bar ── */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NazStudio" className="h-14 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--k-blue)] transition-all"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--k-sky)]" />
            <span className="uppercase">{locale === 'en' ? 'العربية' : 'EN'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[var(--k-yellow)]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--k-navy)]" />
            )}
          </button>
        </div>
      </header>

      {/* ── Main Split Screen Workstation ── */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          {/* ── Left Column: Journey Progress Sidebar (Desktop Only) ── */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white border border-white/10 shadow-2xl relative overflow-hidden min-h-[580px]">
            {/* Subtle 3D background object */}
            <div className="absolute -right-10 -bottom-10 w-72 h-72 opacity-60 pointer-events-none">
              <StudioCanvas3D variant="auth" />
            </div>

            <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

            {/* Top Brand Header */}
            <div className="relative z-10">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white/10 text-cyan-300 border border-white/20 inline-block mb-6">
                {locale === 'ar' ? 'رحلة الانضمام إلى الاستوديو' : 'STUDIO ONBOARDING'}
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight font-display leading-tight">
                {locale === 'ar' ? 'ابدأ رحلة الإبداع السينمائي' : 'Design Your Hero’s Cinematic Legacy'}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
                {locale === 'ar'
                  ? 'ثلاث خطوات سريعة لتأكيد حسابك والانطلاق في تأليف أفلام وكتب مخصصة لطفلك.'
                  : 'Complete three simple steps to access the AI generation studio and export archival assets.'}
              </p>
            </div>

            {/* Step-by-Step Progress Pipeline */}
            <div className="relative z-10 my-8 space-y-4">
              {stepsMeta.map((s) => {
                const isActive = step === s.id;
                const isPassed =
                  (step === 'details' && s.id === 'package') ||
                  (step === 'otp' && (s.id === 'package' || s.id === 'details'));

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-white/10 border-cyan-400 text-white shadow-lg'
                        : isPassed
                        ? 'bg-white/5 border-emerald-500/40 text-emerald-400'
                        : 'border-white/5 text-slate-500'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-cyan-400 text-slate-950 font-extrabold'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{s.label}</div>
                      <div className="text-[10px] opacity-70">
                        {isActive
                          ? locale === 'ar'
                            ? 'الخطوة الحالية'
                            : 'In Progress'
                          : isPassed
                          ? locale === 'ar'
                            ? 'تم الاكتمال'
                            : 'Completed'
                          : locale === 'ar'
                            ? 'قيد الانتظار'
                            : 'Upcoming'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Summary Banner if selected */}
            {(selectedPlan || resumedPackage) && (
              <div className="relative z-10 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
                <div className="flex items-center justify-between text-white font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{currentPlanName}</span>
                  </span>
                  <span className="text-cyan-400 font-extrabold">
                    {currentPrice === 0
                      ? locale === 'ar'
                        ? 'مجاني'
                        : 'Free'
                      : `${formatSar(currentPrice)} / ${
                          billingCycle === 'yearly'
                            ? locale === 'ar'
                              ? 'سنوياً'
                              : 'year'
                            : locale === 'ar'
                            ? 'شهرياً'
                            : 'mo'
                        }`}
                  </span>
                </div>
                {selectedPlan && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/10">
                    <span>
                      {selectedPlan.monthly_credits}{' '}
                      {locale === 'ar' ? 'نقطة ذكاء اصطناعي' : 'AI credits / month'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(null);
                        setStep('package');
                        router.replace('/register');
                      }}
                      className="text-cyan-300 hover:underline font-bold"
                    >
                      {locale === 'ar' ? 'تغيير الخطة' : 'Change plan'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Security Note */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Data Sharing Guarantee</span>
              </span>
              <span>NazStudio v2.4</span>
            </div>
          </div>

          {/* ── Right Column: Interactive Step Engine ── */}
          <div className="lg:col-span-7 flex items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="w-full studio-card-glass p-8 sm:p-10 shadow-2xl relative"
            >
              {/* Step indicator on mobile */}
              <div className="flex lg:hidden items-center justify-between mb-6 pb-4 border-b border-[var(--border)] text-xs font-bold text-[var(--k-blue)]">
                <span>
                  {locale === 'ar' ? 'الخطوة' : 'Step'}{' '}
                  {step === 'package' ? '1/3' : step === 'details' ? '2/3' : '3/3'}
                </span>
                <span className="text-[var(--text-3)] font-normal">
                  {step === 'package'
                    ? locale === 'ar'
                      ? 'اختيار الخطة'
                      : 'Choose Plan'
                    : step === 'details'
                    ? locale === 'ar'
                      ? 'بيانات الحساب'
                      : 'Details'
                    : locale === 'ar'
                    ? 'التحقق'
                    : 'Verification'}
                </span>
              </div>

              {/* Error Notification */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs sm:text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════
                  STEP 1: PLAN SELECTION
              ═════════════════════════════════════════════ */}
              {step === 'package' && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-1">
                        <SplitTextReveal as="span" by="words" delay={0.1}>
                          {locale === 'ar' ? 'اختر خطة الاستوديو' : 'Select Your Studio Plan'}
                        </SplitTextReveal>
                      </h1>
                      <p className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed">
                        {locale === 'ar'
                          ? 'اختر الباقة المناسبة للبدء، يمكنك الترقية أو الإلغاء في أي وقت.'
                          : 'Choose the right tier to begin. Upgrade or cancel anytime.'}
                      </p>
                    </div>

                    {/* Monthly / Yearly Toggle */}
                    <div className="inline-flex items-center p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          billingCycle === 'monthly'
                            ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                            : 'text-[var(--text-3)] hover:text-[var(--text)]'
                        }`}
                      >
                        {locale === 'ar' ? 'شهري' : 'Monthly'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          billingCycle === 'yearly'
                            ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                            : 'text-[var(--text-3)] hover:text-[var(--text)]'
                        }`}
                      >
                        <span>{locale === 'ar' ? 'سنوي' : 'Yearly'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 font-extrabold">
                          {locale === 'ar' ? 'خصم شهرين' : '-17%'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {plans === null ? (
                    <div className="space-y-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-20 rounded-2xl bg-[var(--surface-2)] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-3)] text-sm">
                      {locale === 'ar' ? 'لا توجد خطط متاحة حالياً.' : 'No plans available right now.'}
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {plans.map((p) => {
                        const priceNum =
                          billingCycle === 'yearly' && Number(p.yearly_price) > 0
                            ? Number(p.yearly_price)
                            : Number(p.price);

                        const isFree = priceNum === 0;
                        const priceLabel = isFree
                          ? locale === 'ar'
                            ? 'مجاني'
                            : 'Free'
                          : `${formatSar(priceNum)} / ${
                              billingCycle === 'yearly'
                                ? locale === 'ar'
                                  ? 'سنوياً'
                                  : 'yr'
                                : locale === 'ar'
                                ? 'شهرياً'
                                : 'mo'
                            }`;

                        const isRecommended = p.slug === 'family' || p.is_featured;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => choosePlan(p)}
                            className={`w-full text-left rtl:text-right p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 group relative overflow-hidden ${
                              isRecommended
                                ? 'border-[var(--k-blue)] bg-[var(--surface)] shadow-md hover:bg-[var(--surface-hover)]'
                                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--k-blue)] hover:bg-[var(--surface-hover)]'
                            }`}
                          >
                            {isRecommended && (
                              <div
                                className="absolute top-0 right-0 rtl:left-0 rtl:right-auto px-3 py-0.5 rounded-bl-xl rtl:rounded-br-xl rtl:rounded-bl-none text-[10px] font-extrabold tracking-wider uppercase text-white shadow-sm"
                                style={{
                                  background:
                                    'linear-gradient(135deg, var(--k-blue), var(--k-purple))',
                                }}
                              >
                                {locale === 'ar' ? 'الأكثر طلباً' : 'RECOMMENDED'}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-base text-[var(--text)] group-hover:text-[var(--k-blue)] transition-colors">
                                  {p.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-500">
                                  {p.monthly_credits}{' '}
                                  {locale === 'ar' ? 'نقطة AI' : 'credits'}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-3)] mt-1 line-clamp-1">
                                {p.description ||
                                  (p.features && p.features[0]) ||
                                  (locale === 'ar' ? 'خطة استوديو متكاملة' : 'Full studio plan')}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right rtl:text-left">
                                <span className="font-extrabold text-base sm:text-lg gradient-text whitespace-nowrap block">
                                  {priceLabel}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-3)] group-hover:text-[var(--k-blue)] group-hover:border-[var(--k-blue)] transition-all">
                                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ════════════════════════════════════════════
                  STEP 2: CREATOR DETAILS
              ═════════════════════════════════════════════ */}
              {step === 'details' && (selectedPlan || resumedPackage) && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible">
                  <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-2">
                      <SplitTextReveal as="span" by="words" delay={0.1}>
                        {t('register_title')}
                      </SplitTextReveal>
                    </h1>
                    <p className="text-sm text-[var(--text-2)] leading-relaxed">
                      {t('register_sub')}
                    </p>
                  </div>

                  {/* Selected Plan Banner */}
                  <div className="mb-6 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[var(--text)]">
                        {locale === 'ar' ? 'الخطة المختارة:' : 'Selected Plan:'}{' '}
                        <span className="text-[var(--k-blue)] font-extrabold">{currentPlanName}</span>
                      </span>
                      <div className="text-[11px] text-[var(--text-3)] mt-0.5">
                        {currentPrice === 0
                          ? locale === 'ar'
                            ? 'مجاني — لا يلزم أي دفع أو بطاقة'
                            : 'Free tier — No payment required'
                          : `${formatSar(currentPrice)} / ${
                              billingCycle === 'yearly'
                                ? locale === 'ar'
                                  ? 'سنوياً'
                                  : 'year'
                                : locale === 'ar'
                                ? 'شهرياً'
                                : 'month'
                            } — ${
                              locale === 'ar'
                                ? 'الدفع الآمن بعد تأكيد البريد الإلكتروني'
                                : 'Secure checkout after email confirmation'
                            }`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(null);
                        setStep('package');
                        router.replace('/register');
                      }}
                      className="text-xs font-bold text-[var(--k-blue)] hover:underline whitespace-nowrap px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                    >
                      {locale === 'ar' ? 'تغيير الخطة' : 'Change'}
                    </button>
                  </div>

                  <form onSubmit={onSubmitDetails} className="space-y-4">
                    {/* Full Name with StudioInput */}
                    <StudioInput
                      label={t('register_name')}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                      icon={User}
                      required
                    />

                    {/* Email with StudioInput */}
                    <StudioInput
                      label={t('register_email')}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={locale === 'ar' ? 'name@example.com' : 'you@example.com'}
                      icon={Mail}
                      required
                    />

                    {/* Password & Confirm Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StudioInput
                        label={t('register_password')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        icon={Lock}
                        required
                      />

                      <StudioInput
                        label={t('register_confirm')}
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        icon={Lock}
                        required
                      />
                    </div>

                    {/* Terms Checkbox */}
                    <div className="pt-2">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[var(--text-2)] leading-relaxed">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 rounded border-[var(--border)] text-[var(--k-blue)]"
                          required
                        />
                        <span>
                          {locale === 'ar' ? 'أوافق على ' : 'I agree to the '}
                          <Link href="/terms" className="font-bold text-[var(--k-blue)] hover:underline">
                            {locale === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
                          </Link>
                          {' ' + (locale === 'ar' ? 'و' : 'and ') + ' '}
                          <Link href="/privacy" className="font-bold text-[var(--k-blue)] hover:underline">
                            {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                          </Link>
                        </span>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="studio-btn-primary w-full py-4 text-sm font-bold shadow-lg"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>
                              {locale === 'ar' ? 'جارٍ إرسال الرمز...' : 'Sending Verification Code...'}
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span>
                              {locale === 'ar' ? 'إرسال رمز التحقق' : 'Send Verification Code'}
                            </span>
                            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                          </span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════
                  STEP 3: OTP VERIFICATION
              ═════════════════════════════════════════════ */}
              {step === 'otp' && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible">
                  <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-2">
                      <SplitTextReveal as="span" by="words" delay={0.1}>
                        {locale === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Verify Your Email'}
                      </SplitTextReveal>
                    </h1>
                    <p className="text-sm text-[var(--text-2)] leading-relaxed">
                      {locale === 'ar'
                        ? `أرسلنا رمز تحقق أمان مكون من ٦ أرقام إلى ${email}`
                        : `We have dispatched a 6-digit verification code to ${email}`}
                    </p>
                  </div>

                  {emailVerified && (
                    <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                      {locale === 'ar'
                        ? 'تم التحقق من بريدك الإلكتروني بالفعل. تابع لإكمال الدفع وإنشاء حسابك.'
                        : 'Your email is already verified. Continue to secure checkout to finish creating your account.'}
                    </div>
                  )}

                  <form onSubmit={onVerifyOtp} className="space-y-6">
                    {!emailVerified && (
                      <div>
                        <StudioInput
                          label={locale === 'ar' ? 'رمز التحقق (٦ أرقام)' : 'Verification Code (6 digits)'}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          icon={KeyRound}
                          required
                          className="text-center text-xl font-mono tracking-[0.4em]"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || (!emailVerified && otp.length !== 6)}
                      className="studio-btn-primary w-full py-4 text-sm font-bold shadow-lg"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>
                            {emailVerified
                              ? locale === 'ar'
                                ? 'جارٍ تجهيز الدفع...'
                                : 'Starting secure checkout...'
                              : locale === 'ar'
                              ? 'جارٍ التحقق...'
                              : 'Verifying & Continuing...'}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span>
                            {emailVerified
                              ? locale === 'ar'
                                ? 'المتابعة إلى الدفع'
                                : 'Continue to payment'
                              : locale === 'ar'
                              ? 'تأكيد الحساب ومتابعة'
                              : 'Verify & Continue'}
                          </span>
                          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </span>
                      )}
                    </button>

                    {!emailVerified && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={onResendOtp}
                          disabled={resendCooldown > 0}
                          className={`text-xs font-bold flex items-center justify-center gap-1.5 mx-auto ${
                            resendCooldown > 0
                              ? 'text-[var(--text-3)] cursor-default'
                              : 'text-[var(--k-blue)] hover:underline cursor-pointer'
                          }`}
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform'
                            }`}
                          />
                          <span>
                            {resendCooldown > 0
                              ? locale === 'ar'
                                ? `إعادة الإرسال خلال ${resendCooldown} ثانية`
                                : `Resend code in ${resendCooldown}s`
                              : locale === 'ar'
                              ? 'إعادة إرسال رمز التحقق'
                              : 'Resend Verification Code'}
                          </span>
                        </button>
                      </div>
                    )}
                  </form>
                </motion.div>
              )}

              {/* Bottom Login Link */}
              <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-xs sm:text-sm text-[var(--text-2)]">
                {t('register_have_account')}{' '}
                <Link
                  href="/login"
                  className="font-bold text-[var(--k-blue)] hover:underline ml-1 rtl:mr-1"
                >
                  {t('register_login_link')}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-20 py-4 text-center text-xs text-[var(--text-3)] border-t border-[var(--border)]">
        <span>{t('footer_rights')}</span>
      </footer>
    </div>
  );
}
