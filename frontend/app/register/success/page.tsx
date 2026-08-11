'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import { apiRegisterStatus, ApiError } from '@/lib/api';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

// Landing spot after a Moyasar redirect for a PAID-package registration.
// Account creation happens asynchronously via the Moyasar webhook, not on
// this redirect — so this page polls /register/status/{id} until the
// webhook finishes and hands us a login token.
export default function RegisterSuccessPage() {
  return <Suspense fallback={null}><RegisterSuccessInner /></Suspense>;
}

function RegisterSuccessInner() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const searchParams = useSearchParams();
  const pendingId = searchParams.get('pending_id');

  const [state, setState] = useState<'polling' | 'done' | 'error'>('polling');
  const [errorMsg, setErrorMsg] = useState('');
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = {
    title: isRTL ? 'جارِ تأكيد الدفع...' : 'Confirming your payment...',
    sub: isRTL
      ? 'يرجى الانتظار بينما نؤكد الدفع وننشئ حسابك. لا تغلق هذه الصفحة.'
      : 'Please wait while we confirm your payment and create your account. Do not close this page.',
    done: isRTL ? 'تم إنشاء حسابك بنجاح!' : 'Your account is ready!',
    doneSub: isRTL ? 'جاري تحويلك إلى لوحة التحكم...' : 'Redirecting you to the dashboard...',
    errorTitle: isRTL ? 'حدث خطأ ما' : 'Something went wrong',
    dashboardBtn: isRTL ? 'الذهاب للوحة التحكم' : 'Go to Dashboard',
    registerAgain: isRTL ? 'العودة للتسجيل' : 'Back to registration',
  };

  useEffect(() => {
    if (!pendingId) {
      setState('error');
      setErrorMsg(isRTL ? 'رابط غير صالح.' : 'Invalid link.');
      return;
    }

    // Webhook delivery can take a few seconds. Poll every 2s, up to ~2 minutes.
    const MAX_ATTEMPTS = 60;

    async function poll() {
      attemptsRef.current += 1;
      try {
        const res = await apiRegisterStatus(pendingId as string);

        if (res.status === 'completed') {
          if (res.token && res.user) {
            login(res.token, res.user);
          }
          setState('done');
          timerRef.current = setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        if (res.status === 'failed' || res.status === 'expired') {
          setState('error');
          setErrorMsg(isRTL ? 'فشلت عملية الدفع أو انتهت صلاحية الجلسة.' : 'Payment failed or the session expired.');
          return;
        }

        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setState('error');
          setErrorMsg(isRTL
            ? 'استغرقت عملية التأكيد وقتاً أطول من المتوقع. إذا خُصم المبلغ، سيتم تفعيل حسابك تلقائياً خلال دقائق.'
            : 'Confirmation is taking longer than expected. If you were charged, your account will activate automatically within a few minutes.');
          return;
        }

        timerRef.current = setTimeout(poll, 2000);
      } catch (err: unknown) {
        // Network/5xx hiccup — keep retrying rather than failing hard, up to the cap.
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setState('error');
          setErrorMsg(err instanceof ApiError ? err.message : 'Could not confirm registration status.');
          return;
        }
        timerRef.current = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex flex-col">
      <CustomCursor />
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-6 py-12 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        {state === 'polling' && (
          <>
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-6">
              <span style={{ animation: 'spin-star 1.2s linear infinite', display: 'inline-block', fontSize: '2rem' }}>⏳</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white font-sans tracking-tight">{t.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">{t.sub}</p>
          </>
        )}

        {state === 'done' && (
          <>
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white font-sans tracking-tight">{t.done}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">{t.doneSub}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-8 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              {t.dashboardBtn}
              <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
              <XCircle size={48} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white font-sans tracking-tight">{t.errorTitle}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => router.push('/register')}
              className="mt-8 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              {t.registerAgain}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
