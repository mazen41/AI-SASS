'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { apiRegister } from '@/lib/api';

export default function RegisterPage() {
  const { t, isRTL } = useLang();
  const { login } = useAuth();
  const router = useRouter();

  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRegister({
        name,
        email,
        password,
        password_confirmation: confirm,
      });
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
      <div
        className="lg-show"
        style={{
          flex: '0 0 45%', display: 'none',
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(79,125,255,0.1) 50%, rgba(0,212,255,0.08) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{
          position: 'absolute', top: '15%', right: '15%',
          width: '380px', height: '380px',
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.2) 0%, transparent 70%)',
          animation: 'pulse-glow 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '10%',
          width: '280px', height: '280px',
          background: 'radial-gradient(ellipse, rgba(79,125,255,0.2) 0%, transparent 70%)',
          animation: 'pulse-glow 5s ease-in-out infinite 1.5s',
        }} />

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}>
          <defs>
            <pattern id="g3" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g3)" />
        </svg>

        <div style={{
          position: 'relative', zIndex: 2,
          height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '3rem',
        }}>
          <Link href="/" style={{
            fontSize: '1.35rem', fontWeight: 800,
            fontFamily: 'var(--font-syne), sans-serif',
            background: 'linear-gradient(135deg, #00d4ff, #4f7dff, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            textDecoration: 'none',
          }}>
            StoryHero
          </Link>

          <div>
            {/* Onboarding steps visual */}
            {['Upload a photo of your child', 'Choose an adventure theme', 'Receive your cinematic story'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(79,125,255,0.3), rgba(168,85,247,0.3))',
                  border: '1px solid rgba(79,125,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-syne), sans-serif',
                  fontWeight: 800, fontSize: '0.85rem',
                  background_2: 'linear-gradient(135deg, #00d4ff, #4f7dff)',
                  color: '#00d4ff',
                }}>
                  {i + 1}
                </div>
                <div style={{ paddingTop: '0.35rem' }}>
                  <p style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: 500 }}>{step}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ color: 'rgba(226,232,240,0.35)', fontSize: '0.8rem' }}>
            Join 2,400+ families creating magical memories
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            color: 'rgba(226,232,240,0.45)', textDecoration: 'none',
            fontSize: '0.85rem', marginBottom: '2.5rem',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(226,232,240,0.45)')}
          >
            {isRTL ? '→' : '←'} StoryHero
          </Link>

          <h1 style={{
            fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em',
            fontFamily: 'var(--font-syne), sans-serif',
            color: '#e2e8f0', marginBottom: '0.5rem',
          }}>
            {t('register_title')}
          </h1>
          <p style={{ color: 'rgba(226,232,240,0.5)', marginBottom: '2.25rem', fontSize: '0.95rem' }}>
            {t('register_sub')}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'rgba(226,232,240,0.7)' }}>
                {t('register_name')}
              </label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Alex Johnson"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'rgba(226,232,240,0.7)' }}>
                {t('register_email')}
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'rgba(226,232,240,0.7)' }}>
                {t('register_password')}
              </label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                minLength={8}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'rgba(226,232,240,0.7)' }}>
                {t('register_confirm')}
              </label>
              <input
                type="password"
                className="input-field"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
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
              style={{ width: '100%', padding: '0.9rem', marginTop: '0.35rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? t('register_loading') : t('register_submit')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(226,232,240,0.45)', fontSize: '0.9rem' }}>
            {t('register_have_account')}{' '}
            <Link href="/login" style={{ color: '#4f7dff', textDecoration: 'none', fontWeight: 500 }}>
              {t('register_login_link')}
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
