'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function BillingSuccessPage() {
  const { theme } = useTheme();
  const { locale } = useLang();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const t = {
    thankYou: isRTL ? 'شكرًا جزيلاً لاشتراكك!' : 'Thank you for your subscription!',
    activating: isRTL ? 'جاري تفعيل ميزاتك الآن... سيتم توجيهك إلى لوحة التحكم.' : 'Activating your premium features... You will be redirected to the dashboard shortly.',
    dashboardBtn: isRTL ? 'الذهاب للوحة التحكم' : 'Go to Dashboard',
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex flex-col">
      <CustomCursor />
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-6 py-12 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 size={48} />
        </div>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white font-sans tracking-tight">
          {t.thankYou}
        </h1>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
          {t.activating}
        </p>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-8 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          {t.dashboardBtn}
          <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
        </button>
      </div>
    </div>
  );
}
