'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { ApiError, apiLogin } from '@/lib/api';
import CustomCursor from '@/components/CustomCursor';
import StudioInput from '@/components/StudioInput';
import SplitTextReveal from '@/components/SplitTextReveal';
import StudioCanvas3D from '@/components/StudioCanvas3D';
import {
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sun,
  Moon,
  Globe,
  Film,
  ShieldCheck,
  AlertCircle,
  Loader2,
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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, toggleLocale, isRTL } = useLang();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiLogin({ email, password });
      login(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'registration_payment_pending') {
        const pendingId = err.data?.pending_registration_id;
        if (typeof pendingId === 'string') {
          router.push(`/register?resume=${encodeURIComponent(pendingId)}`);
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between relative overflow-hidden"
    >
      <CustomCursor />

      {/* ── Volumetric Ambient Background ── */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" />
        <div className="studio-glow-orb-2" />
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
          {/* ── Left Column: Cinematic Visual Showcase (Desktop Only) ── */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-10 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white border border-white/10 shadow-2xl relative overflow-hidden min-h-[580px]">
            {/* Subtle 3D background object */}
            <div className="absolute -right-10 -bottom-10 w-72 h-72 opacity-60 pointer-events-none">
              <StudioCanvas3D variant="auth" />
            </div>

            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-pink-600/20 blur-3xl pointer-events-none" />

            {/* Top Brand Deck */}
            <div className="relative z-10">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white/10 text-cyan-300 border border-white/20 inline-block mb-6">
                {locale === 'ar' ? 'استوديو الإنتاج السينمائي' : 'CREATIVE STUDIO ACCESS'}
              </span>
              <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight font-display max-w-md leading-tight">
                {locale === 'ar'
                  ? 'أهلاً بك مجدداً في عالم الذكاء الاصطناعي والإبداع'
                  : 'Step Back Into Your Personalized Universe'}
              </h2>
              <p className="text-slate-300 text-sm mt-3 max-w-md leading-relaxed">
                {locale === 'ar'
                  ? 'مغامرات طفلك بانتظارك. تابع إنتاج الفيديوهات السينمائية، والكتب المصورة، وصفحات التلوين بكل سهولة.'
                  : 'Access your stories, create illustrated books, explore narration, and continue making new memories.'}
              </p>
            </div>

            {/* Center Story Mockup Card */}
            <div className="relative z-10 my-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  {locale === 'ar' ? 'مثال على المخرجات' : 'SAMPLE OUTPUT'}
                </span>
                <span className="text-emerald-400">{locale === 'ar' ? 'إنشاء بالذكاء الاصطناعي' : 'AI CREATION'}</span>
              </div>
              <div className="mt-3">
                <div className="text-base font-bold text-white font-display">
                  {locale === 'ar' ? 'مغامرة رائد الفضاء الصغير' : 'The Little Starlight Pioneer'}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {locale === 'ar'
                    ? 'قصص مصورة · تعليق صوتي · صفحات تلوين'
                    : 'Illustrated stories · narration · coloring pages'}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>{locale === 'ar' ? 'أدوات إبداعية مدعومة بالذكاء الاصطناعي' : 'AI-assisted creative tools'}</span>
                <span>NazStudio</span>
              </div>
            </div>

            {/* Bottom Testimonial / Telemetry */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{locale === 'ar' ? 'دخول آمن إلى حسابك' : 'Secure access to your account'}</span>
              </div>
                <span>{locale === 'ar' ? 'سجّل الدخول لفتح مساحة عملك' : 'Sign in to open your workspace'}</span>
            </div>
          </div>

          {/* ── Right Column: Authentication Form Card ── */}
          <div className="lg:col-span-5 flex items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="w-full studio-card-glass p-8 sm:p-10 shadow-2xl relative"
            >
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-2">
                  <SplitTextReveal as="span" by="words" delay={0.1}>
                    {t('login_title')}
                  </SplitTextReveal>
                </h1>
                <p className="text-sm text-[var(--text-2)] leading-relaxed">
                  {t('login_sub')}
                </p>
              </div>

              {/* Error Banner */}
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

              {/* Form with Dedicated Non-Overlapping StudioInput */}
              <form onSubmit={onSubmit} className="space-y-5">
                <StudioInput
                  label={t('login_email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={locale === 'ar' ? 'name@example.com' : 'you@example.com'}
                  icon={Mail}
                  required
                />

                <StudioInput
                  label={t('login_password')}
                  labelRight={
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[var(--k-blue)] hover:underline"
                    >
                      {t('login_forgot')}
                    </Link>
                  }
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={Lock}
                  required
                  trailAction={
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="studio-btn-primary w-full py-4 text-sm font-bold shadow-lg"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('login_loading')}</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>{t('login_submit')}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </span>
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom Sign-Up Link */}
              <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-xs sm:text-sm text-[var(--text-2)]">
                {t('login_no_account')}{' '}
                <Link
                  href="/register"
                  className="font-bold text-[var(--k-blue)] hover:underline ml-1 rtl:mr-1"
                >
                  {t('login_register_link')}
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
