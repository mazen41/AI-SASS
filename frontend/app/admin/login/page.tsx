'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiLogin } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import StudioInput from '@/components/StudioInput';
import SplitTextReveal from '@/components/SplitTextReveal';
import StudioCanvas3D from '@/components/StudioCanvas3D';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Globe,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { locale, toggleLocale } = useLang();
  const { theme, toggleTheme } = useTheme();
  const isRTL = locale === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await apiLogin({ email, password });

      if (user.role !== 'super_admin' && user.role !== 'admin') {
        setError(
          isRTL
            ? 'غير مصرح لك بالوصول إلى لوحة الإدارة'
            : 'Access restricted: Super Admin or Admin authorization required.'
        );
        setLoading(false);
        return;
      }

      login(token, user);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : isRTL ? 'فشل تسجيل الدخول' : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between relative overflow-hidden font-sans"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Volumetric Ambient Background ── */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" />
        <div className="studio-glow-orb-2" />
        <div className="absolute inset-0 studio-grid-pattern opacity-25" />
      </div>

      {/* ── Top Bar ── */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NazStudio" className="h-10 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-lg gradient-text font-display">
              NazStudio
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[var(--text-3)] font-mono">
              SECURITY GATEWAY
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
          >
            <Globe size={14} className="text-[var(--k-sky)]" />
            <span>{locale === 'en' ? 'العربية' : 'EN'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} className="text-[var(--k-yellow)]" /> : <Moon size={15} className="text-[var(--k-navy)]" />}
          </button>
        </div>
      </header>

      {/* ── Center Login Card ── */}
      <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full studio-card-glass p-8 sm:p-10 shadow-2xl relative"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[var(--k-navy)] to-[var(--k-blue)] text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <ShieldAlert size={24} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight font-display mb-1">
              <SplitTextReveal as="span" by="words" delay={0.1}>
                {isRTL ? 'بوابة إدارة الاستوديو' : 'Studio Admin Access'}
              </SplitTextReveal>
            </h1>
            <p className="text-xs text-[var(--text-3)] font-mono uppercase tracking-wider">
              {isRTL ? 'صلاحيات المدير العام فقط' : 'RESTRICTED EXECUTIVE CLEARANCE'}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs sm:text-sm flex items-start gap-3"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <StudioInput
              label={isRTL ? 'البريد الإلكتروني للإدارة' : 'Admin Email'}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nazstudio.art"
              icon={Mail}
              required
            />

            <StudioInput
              label={isRTL ? 'كلمة المرور' : 'Password'}
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={Lock}
              required
              trailAction={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors p-1"
                  aria-label="Toggle password"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="studio-btn-primary w-full py-4 text-sm font-bold shadow-lg mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isRTL ? 'جارٍ التحقق...' : 'Authenticating...'}</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>{isRTL ? 'دخول لوحة التحكم' : 'Enter Admin Console'}</span>
                  <ArrowRight size={16} className="rtl:rotate-180" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--text-3)] flex items-center justify-center gap-1.5 font-mono">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>256-BIT ENCRYPTED ADMIN CHANNEL</span>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-20 py-4 text-center text-xs text-[var(--text-3)] border-t border-[var(--border)]">
        <span>© 2026 NazStudio. All rights reserved.</span>
      </footer>
    </div>
  );
}
