'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { apiLogin } from '@/lib/api';
import CustomCursor from '@/components/CustomCursor';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useLang();
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
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-theme={theme}>
      <CustomCursor />
      <main className="auth-wrap">
        {/* ── Left: Illustration Panel ── */}
        <div className="auth-illustration">
          {/* Blobs */}
          <div className="auth-illus-blob auth-illus-blob-1" />
          <div className="auth-illus-blob auth-illus-blob-2" />
          <div className="auth-illus-blob auth-illus-blob-3" />

          {/* Floating decorations */}
          <div style={{ position: 'absolute', top: '12%', left: '10%', fontSize: '2rem', animation: 'float 7s ease-in-out infinite', animationDelay: '-1s', pointerEvents: 'none' }}>⭐</div>
          <div style={{ position: 'absolute', top: '18%', right: '12%', fontSize: '1.5rem', animation: 'float 9s ease-in-out infinite', animationDelay: '-3s', pointerEvents: 'none' }}>✨</div>
          <div style={{ position: 'absolute', bottom: '15%', right: '10%', fontSize: '2.5rem', animation: 'float 6s ease-in-out infinite', animationDelay: '-2s', pointerEvents: 'none' }}>🌙</div>
          <div style={{ position: 'absolute', bottom: '22%', left: '8%', fontSize: '1.8rem', animation: 'float 8s ease-in-out infinite', animationDelay: '-4s', pointerEvents: 'none' }}>💫</div>

          <motion.div
            className="auth-illus-content"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="auth-illus-big-icon">🧸</span>

            <h2 className="auth-illus-title">
              {locale === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!'}
            </h2>

            <p className="auth-illus-sub">
              {locale === 'ar'
                ? 'طفلك ينتظرك لتبدأ مغامرته السينمائية الجديدة.'
                : 'Your child is waiting for their next magical adventure.'}
            </p>

            {/* Story preview cards */}
            <div className="auth-char-cards">
              {[
                { emoji: '🚀', delay: 0.5, label: locale === 'ar' ? 'فضاء' : 'Space' },
                { emoji: '🐉', delay: 0.65, label: locale === 'ar' ? 'تنين' : 'Dragon' },
                { emoji: '🧜', delay: 0.8, label: locale === 'ar' ? 'حورية' : 'Mermaid' },
                { emoji: '🦁', delay: 0.95, label: locale === 'ar' ? 'أسد' : 'Lion' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="auth-char-card"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: item.delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {item.emoji}
                </motion.div>
              ))}
            </div>

            {/* Stats row */}
            <div className="auth-stats">
              {[
                { num: '10K+', label: locale === 'ar' ? 'أسرة' : 'Families' },
                { num: '50K+', label: locale === 'ar' ? 'قصة' : 'Stories' },
                { num: '4.9★', label: locale === 'ar' ? 'تقييم' : 'Rating' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div className="auth-stat-num">{stat.num}</div>
                  <div className="auth-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Right: Form Panel ── */}
        <div className="auth-form-side">
          <motion.div
            className="auth-card"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Logo */}
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.75rem' }}>
              <span style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: '1.4rem',
                fontWeight: 700,
                background: 'var(--grad-magic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                ✦ StoryHero
              </span>
            </Link>

            {/* Title */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <h1 className="auth-form-title">{t('login_title')}</h1>
              <p className="auth-form-sub">{t('login_sub')}</p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={onSubmit}
              style={{ display: 'grid', gap: 0 }}
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
            >
              <motion.div className="inp-group" variants={fadeUp}>
                <label className="inp-label">{t('login_email')}</label>
                <input
                  className="inp"
                  type="email"
                  placeholder={locale === 'ar' ? 'بريدك الإلكتروني' : 'you@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </motion.div>

              <motion.div className="inp-group" variants={fadeUp}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="inp-label" style={{ margin: 0 }}>{t('login_password')}</label>
                  <a href="#" style={{ fontSize: '0.8rem', color: 'var(--k-blue)', textDecoration: 'none', fontWeight: 600, fontFamily: 'Fredoka, sans-serif' }}>
                    {t('login_forgot')}
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="inp"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.5,
                      padding: 0,
                    }}
                    aria-label="Toggle password"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </motion.div>

              {error && (
                <motion.div className="auth-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.div>
              )}

              <motion.div variants={fadeUp} style={{ marginTop: '0.5rem' }}>
                <motion.button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ animation: 'spin-star 1s linear infinite', display: 'inline-block' }}>⏳</span>
                      {t('login_loading')}
                    </span>
                  ) : (
                    <>{t('login_submit')} ✦</>
                  )}
                </motion.button>
              </motion.div>
            </motion.form>

            <p className="auth-link" style={{ marginTop: '1.5rem' }}>
              {t('login_no_account')}{' '}
              <Link href="/register">{t('login_register_link')}</Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
