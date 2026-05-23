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

  return (
    <>
      <header
        className={`kido-nav${scrolled ? ' scrolled' : ''}`}
        style={{ padding: '0 1.5rem' }}
      >
        <nav className="nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo-kido">
            <span className="nav-logo-star">✦</span>
            StoryHero
          </Link>

          {/* Desktop actions */}
          <div className="nav-actions">
            {/* Lang toggle */}
            <div className="lang-toggle">
              <button className={`lang-btn ${locale === 'en' ? 'active' : ''}`} onClick={() => locale !== 'en' && toggleLocale()}>EN</button>
              <button className={`lang-btn ${locale === 'ar' ? 'active' : ''}`} onClick={() => locale !== 'ar' && toggleLocale()}>AR</button>
            </div>

            {/* Theme toggle */}
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <div className="theme-toggle-thumb">{theme === 'dark' ? '🌙' : '☀️'}</div>
            </button>

            {/* Auth buttons */}
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" style={{
                  color: 'var(--text-2)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  padding: '0.5rem 0.75rem',
                  fontFamily: 'Fredoka, sans-serif',
                }}>
                  👋 {user?.name?.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '0.52rem 1.1rem', fontSize: '0.86rem' }}>
                  {t('dashboard_logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost" style={{ padding: '0.52rem 1.1rem', fontSize: '0.86rem' }}>
                  {t('nav_login')}
                </Link>
                <Link href="/register" className="btn btn-primary" style={{ padding: '0.52rem 1.25rem', fontSize: '0.86rem' }}>
                  {t('nav_register')} ✦
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile menu backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 190, backdropFilter: 'blur(8px)',
            }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
