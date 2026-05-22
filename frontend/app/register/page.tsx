'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { apiRegister } from '@/lib/api';
import CustomCursor from '@/components/CustomCursor';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setError('');
    setLoading(true);
    try {
      const res = await apiRegister({ name, email, password, password_confirmation: confirm });
      login(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-theme={theme}>
      <CustomCursor />
      <main className="auth-wrap" style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* Left form side */}
        <div className="auth-form-side">
          <motion.div
            className="auth-card glass"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/" className="nav-logo" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'block' }}>
              StoryHero
            </Link>

            <div>
              <h1>{t('register_title')}</h1>
              <p style={{ color: 'var(--text-2)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                {t('register_sub')}
              </p>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className="inp-group">
                <label className="inp-label">{t('register_name')}</label>
                <input className="inp" placeholder={locale === 'ar' ? 'الاسم الكامل' : 'Full name'} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="inp-group">
                <label className="inp-label">{t('register_email')}</label>
                <input className="inp" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="inp-group">
                <label className="inp-label">{t('register_password')}</label>
                <input className="inp" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <div className="inp-group">
                <label className="inp-label">{t('register_confirm')}</label>
                <input className="inp" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <motion.button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
              >
                {loading ? t('register_loading') : t('register_submit')}
              </motion.button>
            </form>

            <p className="auth-link">
              {t('register_have_account')}{' '}
              <Link href="/login">{t('register_login_link')}</Link>
            </p>
          </motion.div>
        </div>

        {/* Right illustration panel */}
        <div className="auth-illustration">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', padding: '2rem', position: 'relative', zIndex: 2 }}
          >
            <div style={{
              position: 'absolute',
              width: 280, height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(180,85,255,0.28), transparent 70%)',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'float 6s ease-in-out infinite',
            }} />

            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 24px rgba(180,85,255,0.7))' }}>
              ◈
            </div>

            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.75rem' }}>
              {locale === 'ar' ? 'ابدأ الإبداع اليوم' : 'Start creating today'}
            </h2>

            <p style={{ color: 'var(--text-2)', maxWidth: 300, lineHeight: 1.7, fontSize: '0.95rem' }}>
              {locale === 'ar'
                ? 'آلاف الأسر تصنع ذكريات سينمائية مع أطفالها كل يوم.'
                : 'Thousands of families are creating cinematic memories with their children every day.'}
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '2.5rem' }}>
              {[
                { num: '10K+', label: locale === 'ar' ? 'أسرة' : 'families' },
                { num: '50K+', label: locale === 'ar' ? 'قصة' : 'stories' },
                { num: '4.9★', label: locale === 'ar' ? 'تقييم' : 'rating' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>
                    {stat.num}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
