'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import { apiRegisterStatus, ApiError } from '@/lib/api';
import { CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

// Landing spot after a Moyasar redirect for a PAID-package registration.
// Account creation happens asynchronously via the Moyasar webhook, not on
// this redirect — so this page polls /register/status/{id} until the
// webhook finishes and hands us a login token.
export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={null}>
      <RegisterSuccessInner />
    </Suspense>
  );
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
    badge: isRTL ? 'إعداد استوديو الإبداع' : 'Studio Workspace Setup',
    title: isRTL ? 'جارِ تأكيد الدفع وتجهيز الحساب...' : 'Confirming payment & provisioning account...',
    sub: isRTL
      ? 'يرجى الانتظار بينما نؤكد الدفع عبر بوابة الدفع وننشئ استوديو الإبداع الخاص بك. لا تغلق هذه الصفحة.'
      : 'Please wait while we confirm your payment gateway webhook and configure your creative studio. Do not close this page.',
    done: isRTL ? 'تم تفعيل حسابك بنجاح!' : 'Your Studio is Ready!',
    doneSub: isRTL ? 'تم تخصيص رصيدك بنجاح، جاري نقلك إلى لوحة التحكم...' : 'Your studio credits are active. Redirecting you to the dashboard...',
    errorTitle: isRTL ? 'تعذر إكمال التفعيل' : 'Activation Incomplete',
    dashboardBtn: isRTL ? 'دخول لوحة التحكم الآن' : 'Launch Studio Dashboard',
    registerAgain: isRTL ? 'العودة لصفحة التسجيل' : 'Back to Registration',
  };

  useEffect(() => {
    if (!pendingId) {
      setState('error');
      setErrorMsg(isRTL ? 'معرّف المعاملة غير صالح أو مفقود.' : 'Invalid or missing transaction identifier.');
      return;
    }

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
          setErrorMsg(
            isRTL
              ? 'استغرقت عملية التأكيد وقتاً أطول من المتوقع. إذا خُصم المبلغ، سيتم تفعيل حسابك تلقائياً خلال دقائق.'
              : 'Confirmation is taking longer than expected. If you were charged, your account will activate automatically within a few minutes.'
          );
          return;
        }

        timerRef.current = setTimeout(poll, 2000);
      } catch (err: unknown) {
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setState('error');
          setErrorMsg(err instanceof ApiError ? err.message : 'Could not confirm registration status.');
          return;
        }
        timerRef.current = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex flex-col relative overflow-hidden">
      <CustomCursor />
      <Navbar />

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-blue/15 via-brand-violet/15 to-brand-pink/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto px-6 py-16 relative z-10 w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="studio-card p-8 sm:p-10 text-center w-full shadow-2xl relative overflow-hidden backdrop-blur-xl border border-white/10 dark:border-white/10">
          {/* Top subtle glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-blue/20 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/25 text-brand-blue text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.badge}</span>
          </div>

          {state === 'polling' && (
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-blue/20 to-brand-violet/20 border border-brand-blue/30 flex items-center justify-center shadow-lg shadow-brand-blue/10">
                  <Loader2 className="w-9 h-9 text-brand-blue animate-spin" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-brand-blue/20 blur-sm -z-10 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">{t.sub}</p>
              <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{isRTL ? 'اتصال مشفر وآمن مع بوابة الدفع' : 'Encrypted & secure gateway sync'}</span>
              </div>
            </div>
          )}

          {state === 'done' && (
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-emerald-500">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-sm -z-10" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t.done}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">{t.doneSub}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-brand-blue via-brand-violet to-brand-pink text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <span>{t.dashboardBtn}</span>
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-500/20 text-rose-500">
                  <XCircle className="w-10 h-10" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t.errorTitle}</h1>
              <p className="text-sm text-rose-500/90 dark:text-rose-400 mt-3 leading-relaxed font-medium">{errorMsg}</p>
              <button
                onClick={() => router.push('/register')}
                className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 dark:bg-white/5 dark:hover:bg-white/10 border border-white/15 text-gray-900 dark:text-white rounded-xl text-sm font-bold transition-all"
              >
                <span>{t.registerAgain}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
