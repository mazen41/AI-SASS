'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { apiGetMyfatoorahCheckoutStatus } from '@/lib/api';

export default function BillingSuccessPage() {
  return <Suspense fallback={null}><BillingSuccessContent /></Suspense>;
}

function BillingSuccessContent() {
  const { theme } = useTheme();
  const { locale } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const isRTL = locale === 'ar';
  const gateway = params.get('gateway');
  const checkoutId = params.get('checkout_id');
  const [state, setState] = useState<'checking' | 'paid' | 'pending' | 'error'>(gateway === 'myfatoorah' ? 'checking' : 'paid');

  useEffect(() => {
    if (gateway !== 'myfatoorah') {
      const timer = setTimeout(() => router.push('/dashboard'), 4000);
      return () => clearTimeout(timer);
    }
    if (!checkoutId) { setState('error'); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const poll = async () => {
      try {
        const result = await apiGetMyfatoorahCheckoutStatus(checkoutId);
        if (cancelled) return;
        if (result.status === 'completed') {
          setState('paid');
          timer = setTimeout(() => router.push('/dashboard'), 2500);
          return;
        }
        if (result.status === 'failed') { setState('error'); return; }
      } catch { /* The signed webhook can arrive after the browser return. */ }
      attempts += 1;
      if (attempts >= 60) { setState('pending'); return; }
      timer = setTimeout(poll, 2000);
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [checkoutId, gateway, router]);

  const heading = state === 'paid'
    ? (isRTL ? 'تم تأكيد الدفع!' : 'Payment confirmed')
    : state === 'error'
      ? (isRTL ? 'تعذر تأكيد الدفع' : 'Payment could not be confirmed')
      : (isRTL ? 'جارٍ تأكيد الدفع' : 'Confirming payment');
  const description = state === 'paid'
    ? (isRTL ? 'تم تفعيل اشتراكك. سيتم توجيهك إلى لوحة التحكم.' : 'Your subscription is active. Redirecting you to your dashboard.')
    : state === 'pending'
      ? (isRTL ? 'تأخر تأكيد الدفع. لا تدفع مرة أخرى؛ حدّث الصفحة بعد قليل أو تواصل مع الدعم.' : 'Payment confirmation is delayed. Do not pay again; refresh in a few minutes or contact support.')
      : state === 'error'
        ? (isRTL ? 'تعذر العثور على عملية الدفع أو تأكيدها. تواصل مع الدعم قبل إعادة الدفع.' : 'We could not confirm this checkout. Contact support before trying to pay again.')
        : (isRTL ? 'ننتظر التأكيد الآمن من بوابة الدفع...' : 'Waiting for secure confirmation from the payment provider...');

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex flex-col">
      <CustomCursor /><Navbar />
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-6 py-12 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${state === 'paid' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 animate-bounce' : 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'}`}>
          <CheckCircle2 size={48} className={state === 'checking' ? 'animate-pulse' : ''} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white font-sans tracking-tight">{heading}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">{description}</p>
        <button onClick={() => router.push(state === 'paid' ? '/dashboard' : '/billing')} className="mt-8 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
          {state === 'paid' ? (isRTL ? 'الذهاب للوحة التحكم' : 'Go to Dashboard') : (isRTL ? 'العودة إلى الفوترة' : 'Back to billing')}
          <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
        </button>
      </div>
    </div>
  );
}
