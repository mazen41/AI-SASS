'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { apiLogin } from '@/lib/api';

export default function LoginPage() {
  const { t, isRTL } = useLang();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin({ email, password });
      login(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#04040a',
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Left — Branding Panel */}
      <div style={{
        flex: '0 0 45%', display: 'none',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(79,125,255,0.12) 0%, rgba(168,85,247,0.1) 50%, rgba(0,212,255,0.08) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
        className="lg-show"
      >
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: '20%', left: '20%',
          width: '350px', height: '350px',
          background: 'radial-gradient(ellipse, rgba(79,125,255,0.25) 0%, transparent 70%)',
          animation: 'pulse-glow 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '25%', right: '15%',
          width: '250px', height: '250px',
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.2) 0%, transparent 70%)',
          animation: 'pulse-glow 5s ease-in-out infinite 1s',
        }} />

        {/* Grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}>
          <defs>
            <pattern id="g2" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g2)" />
        </svg>

        <div style={{
          position: 'relative', zIndex: 2,
          height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '3rem',
        }}>
          {/* Logo */}
          <Link href="/" style={{
            fontSize: '1.35rem', fontWeight: 800,
            fontFamily: 'var(--font-syne), sans-serif',
            background: 'linear-gradient(135deg, #00d4ff, #4f7dff, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            textDecoration: 'none',
          }}>
            StoryHero
          </Link>

          {/* Center quote */}
          <div>
            <p style={{
              fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
              fontWeight: 800,
              fontFamily: 'var(--font-syne), sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              color: '#e2e8f0',
              marginBottom: '1.5rem',
            }}>
              "Every child deserves{' '}
              <span style={{
                background: 'linear-gradient(135deg, #00d4ff, #4f7dff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                their own cinematic adventure.
              </span>"
            </p>
            <p style={{ color: 'rgba(226,232,240,0.45)', fontSize: '0.875rem' }}>
              — The StoryHero Team
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[['2,400+', 'Stories created'], ['98%', 'Parent satisfaction'], ['40+', 'Story themes']].map(([val, label]) => (
              <div key={label}>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 800,
                  fontFamily: 'var(--font-syne), sans-serif',
                  background: 'linear-gradient(135deg, #00d4ff, #4f7dff)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {val}
                </div>
                <div style={{ color: 'rgba(226,232,240,0.45)', fontSize: '0.8rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Back link */}
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            color: 'rgba(226,232,240,0.45)', textDecoration: 'none',
            fontSize: '0.85rem', marginBottom: '3rem',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(226,232,240,0.45)')}
          >
            {isRTL ? '→' : '←'} StoryHero
          </Link>

          <h1
            style={{
              fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em',
              fontFamily: 'var(--font-syne), sans-serif',
              color: '#e2e8f0', marginBottom: '0.5rem',
            }}
          >
            {t('login_title')}
          </h1>
          <p style={{ color: 'rgba(226,232,240,0.5)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
            {t('login_sub')}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{
                display: 'block', marginBottom: '0.5rem',
                fontSize: '0.85rem', fontWeight: 500, color: 'rgba(226,232,240,0.7)',
              }}>
                {t('login_email')}
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(226,232,240,0.7)' }}>
                  {t('login_password')}
                </label>
                <a href="#" style={{ fontSize: '0.8rem', color: 'rgba(79,125,255,0.8)', textDecoration: 'none' }}>
                  {t('login_forgot')}
                </a>
              </div>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                padding: '0.8rem 1rem',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px',
                color: '#f87171',
                fontSize: '0.875rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? t('login_loading') : t('login_submit')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(226,232,240,0.45)', fontSize: '0.9rem' }}>
            {t('login_no_account')}{' '}
            <Link href="/register" style={{ color: '#4f7dff', textDecoration: 'none', fontWeight: 500 }}>
              {t('login_register_link')}
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 1024px) {
          .lg-show { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
