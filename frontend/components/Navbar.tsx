'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { t, toggleLocale, locale } = useLang();
  const { isLoggedIn, logout, user } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 2rem',
        transition: 'all 0.3s ease',
        background: scrolled
          ? 'rgba(4,4,10,0.85)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid transparent',
      }}
    >
      <nav
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="font-display"
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textDecoration: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #4f7dff, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          StoryHero
        </Link>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)',
              padding: '0.45rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
              (e.target as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            {t('nav_lang')}
          </button>

          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  padding: '0.45rem 0.9rem',
                }}
              >
                {user?.name?.split(' ')[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="btn-ghost"
                style={{ padding: '0.5rem 1.2rem', fontSize: '0.875rem' }}
              >
                {t('dashboard_logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost" style={{ padding: '0.5rem 1.2rem', fontSize: '0.875rem' }}>
                {t('nav_login')}
              </Link>
              <Link href="/register" className="btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.875rem' }}>
                {t('nav_register')}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
