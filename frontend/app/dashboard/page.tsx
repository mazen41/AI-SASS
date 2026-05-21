'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { t, toggleLocale } = useLang();
  const { user, loading, logout, isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login');
    }
  }, [loading, isLoggedIn, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#04040a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '2px solid rgba(79,125,255,0.2)',
          borderTopColor: '#4f7dff',
          animation: 'spin-slow 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#04040a' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 2rem',
        background: 'rgba(4,4,10,0.95)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: '1.2rem', fontWeight: 800,
            fontFamily: 'var(--font-syne), sans-serif',
            background: 'linear-gradient(135deg, #00d4ff, #4f7dff, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            StoryHero
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={toggleLocale} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', color: 'rgba(255,255,255,0.7)',
              padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              🌐
            </button>
            <span style={{ color: 'rgba(226,232,240,0.5)', fontSize: '0.9rem' }}>
              {user?.name}
            </span>
            <button onClick={handleLogout} className="btn-ghost" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
              {t('dashboard_logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main content — empty placeholder */}
      <main style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
      }}>
        <div style={{ textAlign: 'center' }}>
          {/* Animated orb */}
          <div style={{
            width: '100px', height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(79,125,255,0.3), rgba(168,85,247,0.3))',
            border: '1px solid rgba(79,125,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2.5rem',
            fontSize: '2.5rem',
            animation: 'float 6s ease-in-out infinite',
            boxShadow: '0 0 60px rgba(79,125,255,0.15)',
          }}>
            ✦
          </div>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 800,
            fontFamily: 'var(--font-syne), sans-serif',
            letterSpacing: '-0.025em',
            color: '#e2e8f0',
            marginBottom: '0.75rem',
          }}>
            {t('dashboard_welcome')}, {user?.name?.split(' ')[0]}
          </h1>

          <p style={{ color: 'rgba(226,232,240,0.45)', fontSize: '1.1rem', marginBottom: '3rem' }}>
            {t('dashboard_coming')}
          </p>

          {/* Placeholder feature teasers */}
          <div style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {['✦ AI Story Generation', '◈ Cinematic Video', '◉ Voice Narration'].map(label => (
              <div key={label} style={{
                padding: '0.6rem 1.25rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '100px',
                color: 'rgba(226,232,240,0.4)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-syne), sans-serif',
                fontWeight: 500,
              }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
