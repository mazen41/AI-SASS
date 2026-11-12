'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import CreditBalanceBadge from '@/components/CreditBalanceBadge';
import {
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  Layers,
  ArrowRight,
  Shield,
  LayoutDashboard,
  LogOut,
  Globe,
  Film,
  Zap,
  LifeBuoy,
} from 'lucide-react';

export default function Navbar() {
  const { t, toggleLocale, locale, isRTL } = useLang();
  const { isLoggedIn, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    router.push('/');
  };

  const navLinks = isLoggedIn
    ? [
        {
          href: '/dashboard',
          label: locale === 'ar' ? 'لوحة التحكم' : 'Studio Dashboard',
          icon: LayoutDashboard,
        },
        {
          href: '/pricing',
          label: locale === 'ar' ? 'الخطط والاشتراك' : 'Studio Tiers',
          icon: Sparkles,
        },
        {
          href: '/dashboard/support',
          label: locale === 'ar' ? 'الدعم' : 'Support',
          icon: LifeBuoy,
        },
        ...(user?.role === 'super_admin'
          ? [
              {
                href: '/admin',
                label: locale === 'ar' ? 'الإدارة' : 'Admin Portal',
                icon: Shield,
              },
            ]
          : []),
      ]
    : [
        {
          href: '/#outputs',
          label: locale === 'ar' ? 'مخرجات الاستوديو' : 'Studio Outputs',
          icon: Film,
        },
        {
          href: '/#workflow',
          label: locale === 'ar' ? 'كيف يعمل' : 'Workflow',
          icon: Zap,
        },
        {
          href: '/#character-dna',
          label: locale === 'ar' ? 'اتساق الشخصية' : 'Character DNA',
          icon: Layers,
        },
        {
          href: '/pricing',
          label: locale === 'ar' ? 'الأسعار' : 'Pricing',
          icon: Sparkles,
        },
      ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'py-3 backdrop-blur-xl bg-opacity-80 shadow-lg border-b'
            : 'py-5 bg-transparent'
        }`}
        style={{
          backgroundColor: scrolled
            ? theme === 'dark'
              ? 'rgba(11, 15, 26, 0.85)'
              : 'rgba(255, 255, 255, 0.88)'
            : 'transparent',
          borderColor: scrolled ? 'var(--border)' : 'transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            {/* ── Brand Logo ── */}
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center group transition-transform duration-200 hover:scale-[1.02]"
            >
              <div className="relative flex items-center justify-center">
                {/* Ambient back-glow */}
                <div
                  className="absolute -inset-3 rounded-full opacity-40 blur-lg group-hover:opacity-75 transition-opacity duration-300"
                  style={{
                    background:
                      'radial-gradient(circle, var(--k-sky), var(--k-navy))',
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="NazStudio"
                  className="relative h-14 sm:h-16 w-auto object-contain"
                />
              </div>
            </Link>

            {/* ── Desktop Center Navigation Links ── */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] bg-opacity-70 backdrop-blur-md shadow-sm">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs xl:text-sm font-semibold rounded-full transition-all duration-200 text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
                  >
                    <Icon className="w-3.5 h-3.5 text-[var(--k-blue)] opacity-80" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* ── Desktop Right Controls & Auth ── */}
            <div className="hidden lg:flex items-center gap-3">
              {isLoggedIn && <CreditBalanceBadge />}
              {/* Language Switcher Pill */}
              <button
                onClick={toggleLocale}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--k-blue)] transition-all"
                style={{ color: 'var(--text)' }}
                aria-label="Toggle language"
              >
                <Globe className="w-3.5 h-3.5 text-[var(--k-sky)]" />
                <span className="uppercase">{locale === 'en' ? 'العربية' : 'EN'}</span>
              </button>

              {/* Theme Switcher Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--k-navy)] transition-all"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[var(--k-yellow)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--k-navy)]" />
                )}
              </button>

              {/* Auth Actions */}
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('dashboard_logout')}</span>
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-all"
                    >
                      {t('nav_login')}
                    </Link>
                    <Link
                      href="/register"
                      className="relative inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-white shadow-md overflow-hidden group transition-all duration-300 hover:shadow-[0_0_20px_rgba(30,144,255,0.4)]"
                      style={{
                        background:
                          'linear-gradient(135deg, #1E90FF 0%, #7C3AED 50%, #FF2E93 100%)',
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>{t('nav_register')}</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* ── Mobile Right Quick Actions & Hamburger ── */}
            <div className="flex lg:hidden items-center gap-2">
              {isLoggedIn && <CreditBalanceBadge />}
              <button
                onClick={toggleLocale}
                className="px-2 py-1 rounded-full text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
              >
                {locale === 'en' ? 'AR' : 'EN'}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[var(--k-yellow)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--k-navy)]" />
                )}
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Mobile Menu Backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile Side Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: isRTL ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed top-0 bottom-0 ${
              isRTL ? 'left-0' : 'right-0'
            } z-50 w-full max-w-sm bg-[var(--bg)] border-${
              isRTL ? 'r' : 'l'
            } border-[var(--border)] shadow-2xl flex flex-col p-6 overflow-y-auto lg:hidden`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-6 border-b border-[var(--border)]">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="NazStudio" className="h-12 w-auto object-contain" />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)]"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col gap-2 py-6">
              {navLinks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--k-blue)] transition-all"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--k-blue)]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Drawer Footer & Auth */}
            <div className="mt-auto pt-6 border-t border-[var(--border)] flex flex-col gap-3">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold border border-[var(--border)] text-[var(--text-2)] hover:text-red-500 hover:border-red-500 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('dashboard_logout')}</span>
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center w-full py-3 rounded-2xl font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                  >
                    {t('nav_login')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-white shadow-lg"
                    style={{
                      background:
                        'linear-gradient(135deg, #1E90FF 0%, #7C3AED 50%, #FF2E93 100%)',
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t('nav_register')}</span>
                  </Link>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
