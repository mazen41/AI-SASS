'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import {
  apiGetBillingPlans,
  apiGetActiveSubscription,
  apiSubscribeStripe,
  apiSubscribePaypal,
  apiSubscribeMoyasar,
  apiSubscribeMyfatoorah,
  apiUserCancelSubscription,
  Plan,
  Subscription,
} from '@/lib/api';
import Navbar from '@/components/Navbar';
import AiCreditsPanel from '@/components/AiCreditsPanel';
import CustomCursor from '@/components/CustomCursor';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  CreditCard,
  Wallet,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Calendar,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  Zap,
  Globe2,
} from 'lucide-react';

export default function BillingPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLang();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'خطط الاشتراك والترقية' : 'Choose Your Studio Tier',
    subtitle: isRTL
      ? 'اختر الخطة المناسبة لفتح إمكانيات غير محدودة لتوليد القصص السينمائية'
      : 'Unlock high-definition 4K video renders, keepsake storybooks, and priority AI queue',
    activeSubTitle: isRTL ? 'اشتراكك النشط حالياً' : 'Your Active Subscription',
    activeSubDesc: isRTL ? 'أنت مشترك حالياً في هذه الخطة وتتمتع بكافة مزاياها.' : 'You have an active plan with full production access.',
    nextBilling: isRTL ? 'تاريخ التجديد القادم:' : 'Next billing cycle:',
    cancelSub: isRTL ? 'إلغاء التجديد التلقائي' : 'Cancel Subscription',
    canceling: isRTL ? 'جاري الإلغاء...' : 'Canceling...',
    cancelConfirm: isRTL
      ? 'هل أنت متأكد من إلغاء اشتراكك؟ ستبقى ميزاتك نشطة حتى نهاية الفترة الحالية.'
      : 'Are you sure you want to cancel your subscription? Your access will remain active until the end of the current billing cycle.',
    selectPayment: isRTL ? 'اختر بوابة الدفع المعتمدة' : 'Select Payment Gateway',
    popular: isRTL ? 'الأكثر طلباً' : 'RECOMMENDED',
    subscribeBtn: isRTL ? 'ترقية واشتراك' : 'Upgrade Plan',
    checkoutRedirecting: isRTL ? 'جاري توجيهك إلى بوابة الدفع الآمنة...' : 'Redirecting to secure gateway...',
    faqTitle: isRTL ? 'الأسئلة الشائعة حول الفوترة والاشتراكات' : 'Frequently Asked Questions',
    faq1Q: isRTL ? 'هل يمكنني تغيير خطتي لاحقاً؟' : 'Can I change or cancel my plan anytime?',
    faq1A: isRTL
      ? 'نعم بكل تأكيد. يمكنك ترقية خطتك أو إلغاؤها بضغطة زر دون أي رسوم أو شروط جزائية.'
      : 'Yes. You can upgrade, downgrade, or cancel your renewal at any moment directly from this page.',
    faq2Q: isRTL ? 'ما هي وسائل الدفع المدعومة؟' : 'Which payment methods are supported?',
    faq2A: isRTL
      ? 'ندعم بطاقات مدى Mada، البطاقات الائتمانية عبر Stripe، محفظة PayPal، وبوابات MyFatoorah و Moyasar بتشفير كامل.'
      : 'We support Apple Pay, Mada, Credit Cards via Stripe, PayPal, MyFatoorah, and Moyasar with end-to-end 256-bit encryption.',
    faq3Q: isRTL ? 'هل يتم استرجاع المبالغ للمنتجات المُولدة؟' : 'What is the refund policy for generated digital content?',
    faq3A: isRTL
      ? 'نظراً لأن إنتاج الفيديوهات والصور يستهلك موارد معالجة سحابية فورية ومكلفة (GPU/AI)، فإن المنتجات الرقمية بعد توليدها لا تخضع للاسترجاع وفقاً لشروط الاستخدام.'
      : 'Due to immediate high-performance GPU and model inference costs incurred upon generation, digital content produced is non-refundable once rendered.',
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableGateways, setAvailableGateways] = useState<string[]>([]);
  const [gateway, setGateway] = useState<'stripe' | 'paypal' | 'moyasar' | 'myfatoorah'>('stripe');
  const [checkoutPlanId, setCheckoutPlanId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/login');
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const loadBillingData = async () => {
      try {
        const [plansRes, subRes] = await Promise.all([
          apiGetBillingPlans(),
          apiGetActiveSubscription(),
        ]);
        setPlans(plansRes.plans);
        setActiveSub(subRes.subscription);
        if (plansRes.gateways?.length) {
          setAvailableGateways(plansRes.gateways);
          setGateway(plansRes.gateways[0] as any);
        }
      } catch (err) {
        console.error('Error loading billing data', err);
      } finally {
        setLoading(false);
      }
    };
    loadBillingData();
  }, [isLoggedIn]);

  const handleSubscribe = async (planId: number) => {
    if (!termsAccepted) {
      alert(
        isRTL
          ? 'يرجى الموافقة على الشروط والأحكام وسياسة المنتجات الرقمية للمتابعة.'
          : 'Please accept the Terms and Conditions and Digital Product policy to proceed.'
      );
      return;
    }

    setCheckoutPlanId(planId);
    setActionLoading(true);
    try {
      let url = '';
      if (gateway === 'stripe') {
        const response = await apiSubscribeStripe(planId);
        url = response.url;
      } else if (gateway === 'paypal') {
        const response = await apiSubscribePaypal(planId);
        url = response.url;
      } else if (gateway === 'moyasar') {
        const response = await apiSubscribeMoyasar(planId);
        url = response.url;
      } else if (gateway === 'myfatoorah') {
        const response = await apiSubscribeMyfatoorah(planId);
        url = response.url;
      }

      if (url) {
        window.location.assign(url);
      } else {
        throw new Error('Payment redirection URL was not returned.');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Checkout initiation failed');
      setActionLoading(false);
      setCheckoutPlanId(null);
    }
  };

  const handleCancelSub = async () => {
    if (!confirm(t.cancelConfirm)) return;
    setActionLoading(true);
    try {
      const response = await apiUserCancelSubscription();
      alert(response.message);
      setActiveSub(response.subscription);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !isLoggedIn) return null;

  if (loading) {
    return (
      <div
        data-theme={theme}
        className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--k-blue)]"
      >
        <CustomCursor />
        <Navbar />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-brand-blue" />
          <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">
            Loading subscription tiers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans antialiased relative overflow-hidden pb-16"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CustomCursor />
      <Navbar />

      {/* Volumetric glow */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" style={{ opacity: 0.15 }} />
        <div className="studio-glow-orb-2" style={{ opacity: 0.1 }} />
        <div className="absolute inset-0 studio-grid-pattern opacity-15" />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-pink/10 border border-brand-pink/20 text-brand-pink">
            <Sparkles size={13} />
            {isRTL ? 'العضوية والاشتراكات' : 'STUDIO MEMBERSHIP'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {t.title}
            </SplitTextReveal>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{t.subtitle}</p>
        </div>

        <AiCreditsPanel />

        {/* Active Subscription Banner */}
        {activeSub && (
          <div className="studio-card p-6 sm:p-8 rounded-3xl border border-brand-blue/30 bg-brand-blue/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple text-white flex items-center justify-center shadow-lg shadow-brand-blue/20 shrink-0">
                <Calendar size={22} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-blue font-bold">
                  {t.activeSubTitle}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">
                  {activeSub.plan?.name} · ${activeSub.plan?.price}/{isRTL ? 'شهر' : 'mo'}
                </h3>
                {activeSub.current_period_end && (
                  <p className="text-xs text-slate-400 font-mono">
                    {t.nextBilling} {new Date(activeSub.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {activeSub.status !== 'canceled' ? (
              <button
                type="button"
                onClick={handleCancelSub}
                disabled={actionLoading}
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all disabled:opacity-50 shrink-0 self-start md:self-auto"
              >
                {actionLoading ? t.canceling : t.cancelSub}
              </button>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {isRTL ? 'سينتهي الاشتراك في نهاية الدورة الحالية' : 'Pending cancellation'}
              </span>
            )}
          </div>
        )}

        {/* Plans Selection Area */}
        {!activeSub && (
          <div className="space-y-8">
            {/* Gateway Switcher */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                {t.selectPayment}
              </span>
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 flex-wrap justify-center">
                {(availableGateways.includes('stripe') || availableGateways.length === 0) && (
                  <button
                    type="button"
                    onClick={() => setGateway('stripe')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      gateway === 'stripe'
                        ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md shadow-brand-blue/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span>Stripe (Credit / Debit)</span>
                  </button>
                )}
                {availableGateways.includes('paypal') && (
                  <button
                    type="button"
                    onClick={() => setGateway('paypal')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      gateway === 'paypal'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Wallet size={15} />
                    <span>PayPal</span>
                  </button>
                )}
                {availableGateways.includes('myfatoorah') && (
                  <button
                    type="button"
                    onClick={() => setGateway('myfatoorah')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      gateway === 'myfatoorah'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span>MyFatoorah (Mada / GCC)</span>
                  </button>
                )}
                {availableGateways.includes('moyasar') && (
                  <button
                    type="button"
                    onClick={() => setGateway('moyasar')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      gateway === 'moyasar'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span>Moyasar</span>
                  </button>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="w-full max-w-2xl mt-2 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isRTL
                      ? 'أوافق على الشروط والأحكام وسياسة عدم استرجاع المنتجات الرقمية بعد بدء توليد الذكاء الاصطناعي. '
                      : 'I acknowledge and agree to the Terms of Service and understand digital AI generations are non-refundable once started. '}
                    <Link href="/terms" className="text-brand-blue hover:underline font-bold">
                      {isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}
                    </Link>
                  </span>
                </label>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isFeatured = plan.is_featured;
                const featuresList = plan.features || [];

                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -4 }}
                    className={`studio-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border ${
                      isFeatured
                        ? 'border-brand-purple ring-2 ring-brand-purple/20 shadow-xl shadow-brand-purple/10'
                        : 'border-white/10'
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 px-3.5 py-1 text-[10px] font-mono font-bold uppercase bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-bl-2xl rtl:rounded-bl-none rtl:rounded-br-2xl shadow-md">
                        {t.popular}
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                        {plan.description}
                      </p>

                      <div className="my-6">
                        <span className="text-4xl font-black text-slate-900 dark:text-white font-display">
                          ${parseFloat(plan.price).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-mono ms-1">
                          /{isRTL ? 'شهرياً' : 'mo'}
                        </span>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {featuresList.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={actionLoading || !termsAccepted}
                      className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                        isFeatured
                          ? 'bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink text-white hover:opacity-95 shadow-brand-blue/20'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                      } disabled:opacity-40`}
                    >
                      {actionLoading && checkoutPlanId === plan.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{t.checkoutRedirecting}</span>
                        </>
                      ) : (
                        <>
                          <span>{t.subscribeBtn}</span>
                          <ArrowRight size={15} className="rtl:rotate-180" />
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQs */}
        <div className="studio-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <HelpCircle size={20} className="text-brand-blue" />
            <h3>{t.faqTitle}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.faq1Q}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.faq1A}</p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.faq2Q}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.faq2A}</p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.faq3Q}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.faq3A}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
