'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { t, toggleLocale, locale } = useLang();
  const { isLoggedIn, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
    padding: '0 2rem',
    background: scrolled ? 'var(--nav-bg)' : 'transparent',
    backdropFilter: scrolled ? 'blur(24px)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
    borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
  };

  return (
    <header style={navStyle}>
      <nav style={{
        maxWidth: '1200px',
        margin: '0 auto',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" className="nav-logo">
          StoryHero
        </Link>

        {/* Desktop actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>

          {/* Lang toggle */}
          <div className="lang-toggle">
            <button
              className={`lang-btn ${locale === 'en' ? 'active' : ''}`}
              onClick={() => locale !== 'en' && toggleLocale()}
              style={{ cursor: 'pointer' }}
            >
              EN
            </button>
            <button
              className={`lang-btn ${locale === 'ar' ? 'active' : ''}`}
              onClick={() => locale !== 'ar' && toggleLocale()}
              style={{ cursor: 'pointer' }}
            >
              AR
            </button>
          </div>

          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <div className="theme-toggle-thumb">
              {theme === 'dark' ? '🌙' : '☀️'}
            </div>
          </button>

          {/* Auth buttons */}
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" style={{
                color: 'var(--text-2)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '0.5rem 0.75rem',
                fontFamily: 'Syne, sans-serif',
              }}>
                {user?.name?.split(' ')[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-ghost"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
              >
                {t('dashboard_logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost" style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                {t('nav_login')}
              </Link>
              <Link href="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                {t('nav_register')}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
