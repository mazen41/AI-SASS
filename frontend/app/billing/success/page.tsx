'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import { CheckCircle2, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { apiGetMyfatoorahCheckoutStatus } from '@/lib/api';

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BillingSuccessContent />
    </Suspense>
  );
}

function BillingSuccessContent() {
  const { theme } = useTheme();
  const { locale } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const isRTL = locale === 'ar';
  const gateway = params.get('gateway');
  const checkoutId = params.get('checkout_id');
  const [state, setState] = useState<'checking' | 'paid' | 'pending' | 'error'>(
    gateway === 'myfatoorah' ? 'checking' : 'paid'
  );
  const [checkoutPurpose, setCheckoutPurpose] = useState('subscription');

  useEffect(() => {
    if (gateway !== 'myfatoorah') {
      const timer = setTimeout(() => router.push('/dashboard'), 3500);
      return () => clearTimeout(timer);
    }
    if (!checkoutId) {
      setState('error');
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const poll = async () => {
      try {
        const result = await apiGetMyfatoorahCheckoutStatus(checkoutId);
        if (cancelled) return;
        setCheckoutPurpose(result.purpose || 'subscription');
        if (result.status === 'completed') {
          setState('paid');
          timer = setTimeout(() => router.push(result.purpose === 'credit_purchase' ? '/billing#ai-credits' : '/dashboard'), 2500);
          return;
        }
        if (result.status === 'failed') {
          setState('error');
          return;
        }
      } catch {
        /* wait for webhook callback */
      }
      attempts += 1;
      if (attempts >= 60) {
        setState('pending');
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [checkoutId, gateway, router]);

  const heading =
    state === 'paid'
      ? checkoutPurpose === 'credit_purchase'
        ? (isRTL ? 'تم تأكيد الدفع وإضافة الرصيد!' : 'Payment Confirmed & Credits Added!')
        : (isRTL ? 'تم تأكيد الدفع وتفعيل الاشتراك!' : 'Payment Confirmed & Studio Tier Activated!')
      : state === 'error'
      ? isRTL
        ? 'تعذر تأكيد الدفع'
        : 'Payment Confirmation Incomplete'
      : isRTL
      ? 'جارٍ تأكيد الدفع مع البنك...'
      : 'Confirming Payment with Gateway...';

  const description =
    state === 'paid'
      ? isRTL
        ? checkoutPurpose === 'credit_purchase' ? 'تم إضافة الرصيد إلى محفظتك. جاري تحويلك إلى صفحة الفوترة.' : 'تم تفعيل باقتك بنجاح. جاري تحويلك إلى لوحة التحكم للبدء في إنشاء القصص.'
        : checkoutPurpose === 'credit_purchase' ? 'Your purchased credits are in your wallet. Redirecting to billing.' : 'Your creative quota is unlocked. Redirecting you to your studio workspace.'
      : state === 'pending'
      ? isRTL
        ? 'تأخر الرد من مزود الدفع. لا تدفع مرة أخرى؛ سيتم تفعيل حسابك تلقائياً.'
        : 'Gateway verification is taking a moment. Please do not re-pay; status will auto-update.'
      : state === 'error'
      ? isRTL
        ? 'تعذر العثور على العملية أو تأكيدها. تواصل مع الدعم للمساعدة الفورية.'
        : 'We could not verify this session. Please contact support before retrying.'
      : isRTL
      ? 'ننتظر التأكيد النهائي والمشفر من بوابة الدفع...'
      : 'Awaiting cryptographically signed confirmation from payment gateway...';

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans antialiased relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CustomCursor />
      <Navbar />

      {/* Volumetric glow */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" style={{ opacity: 0.15 }} />
        <div className="studio-glow-orb-2" style={{ opacity: 0.1 }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-6 py-16 text-center relative z-10">
        <div className="studio-card p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6 w-full">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl ${
              state === 'paid'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
            }`}
          >
            {state === 'checking' ? (
              <Loader2 size={36} className="animate-spin" />
            ) : (
              <CheckCircle2 size={40} />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {heading}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>

          <button
            onClick={() => router.push(state === 'paid' && checkoutPurpose !== 'credit_purchase' ? '/dashboard' : '/billing#ai-credits')}
            className="w-full py-3 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-blue/20"
          >
            <span>
              {state === 'paid'
                ? isRTL
                  ? checkoutPurpose === 'credit_purchase' ? 'عرض رصيد الذكاء الاصطناعي' : 'الذهاب للوحة التحكم'
                  : checkoutPurpose === 'credit_purchase' ? 'View AI credits' : 'Go to Studio Dashboard'
                : isRTL
                ? 'العودة لصفحة الفوترة'
                : 'Back to Billing'}
            </span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
