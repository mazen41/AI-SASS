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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        {/* Left illustration panel */}
        <div className="auth-illustration">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', padding: '2rem', position: 'relative', zIndex: 2 }}
          >
            {/* Animated orbs */}
            <div style={{
              position: 'absolute',
              width: 300, height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(94,125,255,0.3), transparent 70%)',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'float 5s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              width: 180, height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(180,85,255,0.25), transparent 70%)',
              top: '30%', left: '30%',
              animation: 'float 7s ease-in-out infinite reverse',
              pointerEvents: 'none',
            }} />

            <div style={{
              fontSize: '4rem',
              marginBottom: '1.5rem',
              filter: 'drop-shadow(0 0 30px rgba(94,125,255,0.6))',
            }}>
              ✦
            </div>

            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: '0.75rem',
            }}>
              {locale === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}
            </h2>

            <p style={{ color: 'var(--text-2)', maxWidth: 320, lineHeight: 1.7, fontSize: '0.95rem' }}>
              {locale === 'ar'
                ? 'طفلك ينتظرك لتبدأ مغامرته الجديدة.'
                : 'Your child is waiting for their next adventure.'}
            </p>

            <div style={{
              display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '2rem',
            }}>
              {['🌌', '🌿', '🏰'].map((emoji, i) => (
                <motion.div
                  key={emoji}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  style={{
                    width: 56, height: 56,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    display: 'grid', placeItems: 'center',
                    fontSize: '1.5rem',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {emoji}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right form side */}
        <div className="auth-form-side">
          <motion.div
            className="auth-card glass"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/" className="nav-logo" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'block' }}>
              StoryHero
            </Link>

            <div>
              <h1>{t('login_title')}</h1>
              <p style={{ color: 'var(--text-2)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                {t('login_sub')}
              </p>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.85rem', marginTop: '0.5rem' }}>
              <div className="inp-group">
                <label className="inp-label">{t('login_email')}</label>
                <input
                  className="inp"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="inp-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="inp-label" style={{ margin: 0 }}>{t('login_password')}</label>
                  <a href="#" style={{ fontSize: '0.8rem', color: 'var(--neon-2)', textDecoration: 'none' }}>
                    {t('login_forgot')}
                  </a>
                </div>
                <input
                  className="inp"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
                {loading ? t('login_loading') : t('login_submit')}
              </motion.button>
            </form>

            <p className="auth-link">
              {t('login_no_account')}{' '}
              <Link href="/register">{t('login_register_link')}</Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
