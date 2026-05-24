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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    router.push('/');
  };

  const navLinks = isLoggedIn
    ? [
        { href: '/dashboard', label: `👋 ${user?.name?.split(' ')[0] ?? 'Dashboard'}` },
        ...(user?.role === 'super_admin' ? [{ href: '/admin', label: locale === 'ar' ? '🛡️ لوحة الإدارة' : '🛡️ Admin' }] : []),
      ]
    : [
        { href: '#how',      label: locale === 'ar' ? 'كيف يعمل' : 'How it works' },
        { href: '#pricing',  label: locale === 'ar' ? 'الأسعار'  : 'Pricing' },
      ];

  return (
    <>
      <header className={`kido-nav${scrolled ? ' scrolled' : ''}`}>
        <nav className="nav-inner">

          {/* ── Logo ── */}
          <Link href="/" className="nav-logo-kido" onClick={() => setMobileOpen(false)}>
            <span className="nav-logo-star">✦</span>
            StoryHero
          </Link>

          {/* ── Desktop nav ── */}
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>

            {/* Nav links (desktop only) */}
            <div className="nav-links-desktop">
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} className="nav-link-item">{l.label}</Link>
              ))}
            </div>

            {/* Lang toggle */}
            <div className="lang-toggle">
              <button className={`lang-btn ${locale === 'en' ? 'active' : ''}`} onClick={() => locale !== 'en' && toggleLocale()}>EN</button>
              <button className={`lang-btn ${locale === 'ar' ? 'active' : ''}`} onClick={() => locale !== 'ar' && toggleLocale()}>AR</button>
            </div>

            {/* Theme toggle */}
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <div className="theme-toggle-thumb">{theme === 'dark' ? '🌙' : '☀️'}</div>
            </button>

            {/* Auth buttons — desktop only */}
            <div className="nav-auth-desktop">
              {isLoggedIn ? (
                <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '0.52rem 1.1rem', fontSize: '0.86rem' }}>
                  {t('dashboard_logout')}
                </button>
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

            {/* Hamburger — mobile only */}
            <button
              className="nav-hamburger"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span className={`hamburger-line${mobileOpen ? ' open-top' : ''}`} />
              <span className={`hamburger-line${mobileOpen ? ' open-mid' : ''}`} />
              <span className={`hamburger-line${mobileOpen ? ' open-bot' : ''}`} />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 190,
              backdropFilter: 'blur(6px)',
            }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: 'min(85vw, 320px)',
              background: 'var(--bg)',
              zIndex: 210,
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              gap: '0.5rem',
              borderLeft: '1.5px solid var(--border)',
              boxShadow: '-12px 0 60px rgba(0,0,0,0.18)',
              overflowY: 'auto',
            }}
          >
            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <Link href="/" className="nav-logo-kido" onClick={() => setMobileOpen(false)} style={{ fontSize: '1.35rem' }}>
                <span className="nav-logo-star">✦</span>StoryHero
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  width: 36, height: 36,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  display: 'grid', placeItems: 'center',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  color: 'var(--text)',
                }}
                aria-label="Close menu"
              >✕</button>
            </div>

            {/* Nav links */}
            {navLinks.map((l, i) => (
              <motion.div
                key={l.href}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'block',
                    padding: '0.9rem 1rem',
                    borderRadius: 'var(--r-md)',
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    marginBottom: '0.4rem',
                  }}
                >{l.label}</Link>
              </motion.div>
            ))}

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />

            {/* Auth buttons */}
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              {isLoggedIn ? (
                <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                  {t('dashboard_logout')}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <Link href="/login" className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
                    {t('nav_login')}
                  </Link>
                  <Link href="/register" className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
                    {t('nav_register')} ✦
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Lang + Theme */}
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1.5px solid var(--border)' }}>
              <div className="lang-toggle">
                <button className={`lang-btn ${locale === 'en' ? 'active' : ''}`} onClick={() => locale !== 'en' && toggleLocale()}>EN</button>
                <button className={`lang-btn ${locale === 'ar' ? 'active' : ''}`} onClick={() => locale !== 'ar' && toggleLocale()}>AR</button>
              </div>
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                <div className="theme-toggle-thumb">{theme === 'dark' ? '🌙' : '☀️'}</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
