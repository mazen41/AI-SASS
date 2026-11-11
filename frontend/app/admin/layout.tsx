'use client';

import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Activity,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Home,
  Server,
  Globe,
  Mail,
  Loader2,
  Database,
  Package,
  ShoppingBag,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { locale, toggleLocale } = useLang();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isRTL = locale === 'ar';
  const isLoginPage = pathname === '/admin/login';

  const navGroups = [
    {
      group: isRTL ? 'التحكم العام' : 'STUDIO CONTROL',
      items: [
        { href: '/admin', label: isRTL ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard },
        { href: '/admin/stories', label: isRTL ? 'القصص والتوليد' : 'Stories & Content', icon: BookOpen },
      ],
    },
    {
      group: isRTL ? 'المستخدمين والإيرادات' : 'USERS & REVENUE',
      items: [
        { href: '/admin/users', label: isRTL ? 'المستخدمين' : 'Users', icon: Users },
        { href: '/admin/subscriptions', label: isRTL ? 'الاشتراكات' : 'Subscriptions', icon: RefreshCw },
        { href: '/admin/transactions', label: isRTL ? 'المعاملات' : 'Transactions', icon: CreditCard },
      ],
    },
    {
      group: isRTL ? 'المنتجات والباقات' : 'CATALOG & BILLING',
      items: [
        { href: '/admin/products', label: isRTL ? 'المنتجات' : 'Products', icon: Package },
        { href: '/admin/packages', label: isRTL ? 'الباقات والأسعار' : 'Packages', icon: ShoppingBag },
        { href: '/admin/payments', label: isRTL ? 'بوابات الدفع' : 'Payment Gateways', icon: Settings },
      ],
    },
    {
      group: isRTL ? 'النظام والصيانة' : 'SYSTEM & LOGS',
      items: [
        { href: '/admin/email', label: isRTL ? 'خدمة البريد' : 'Email Service', icon: Mail },
        { href: '/admin/backup', label: isRTL ? 'النسخ الاحتياطي' : 'Backups', icon: Database },
        { href: '/admin/activity', label: isRTL ? 'سجل النشاط' : 'Activity Stream', icon: Activity },
        { href: '/admin/system', label: isRTL ? 'صحة النظام' : 'System Health', icon: Server },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);

  useEffect(() => {
    if (!loading && !isLoginPage) {
      if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
        router.push('/admin/login');
      }
    }
  }, [user, loading, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--k-blue)]"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--k-blue)]" />
          <span className="text-xs font-mono tracking-widest text-[var(--text-3)] uppercase">
            {isRTL ? 'جارٍ التحقق من الصلاحيات...' : 'AUTHENTICATING STUDIO ADMIN...'}
          </span>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return null;
  }

  const currentPage = allNavItems.find(
    (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
  );

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex font-sans antialiased relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Volumetric Ambient Background ── */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" style={{ opacity: 0.1 }} />
        <div className="studio-glow-orb-3" style={{ opacity: 0.08 }} />
        <div className="absolute inset-0 studio-grid-pattern opacity-15" />
      </div>

      {/* ── Mobile Backdrop ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Admin Sidebar ── */}
      <aside
        className={`fixed inset-y-0 ${
          isRTL ? 'right-0' : 'left-0'
        } z-50 bg-[var(--surface)] border-${isRTL ? 'l' : 'r'} border-[var(--border)] flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen
            ? 'translate-x-0'
            : isRTL
            ? 'translate-x-full'
            : '-translate-x-full'
        } lg:static lg:shrink-0 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
          <Link
            href="/admin"
            className={`flex items-center gap-2.5 overflow-hidden ${
              collapsed ? 'justify-center w-full' : ''
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NazStudio" className="h-9 w-auto object-contain shrink-0" />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base tracking-tight gradient-text font-display truncate">
                  NazStudio
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--k-blue)]">
                  {user.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN PORTAL'}
                </span>
              </div>
            )}
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text)]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-3)]">
                  {group.group}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group relative ${
                        isActive
                          ? 'bg-[var(--surface-2)] text-[var(--k-blue)] border border-[var(--border)] shadow-sm'
                          : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? 'text-[var(--k-blue)]'
                            : 'text-[var(--text-3)] group-hover:text-[var(--k-blue)]'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}

                      {isActive && (
                        <div
                          className={`absolute ${
                            isRTL ? 'left-1' : 'right-1'
                          } w-1.5 h-1.5 rounded-full bg-[var(--k-blue)] shadow-[0_0_8px_var(--k-blue)]`}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[var(--border)] space-y-1 shrink-0">
          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-all ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title={collapsed ? (isRTL ? 'العودة للموقع' : 'Live Platform') : undefined}
          >
            <Home size={16} className="text-[var(--text-3)] shrink-0" />
            {!collapsed && (
              <span className="flex items-center justify-between w-full">
                <span>{isRTL ? 'العودة للموقع' : 'Live Platform'}</span>
                <ExternalLink size={12} className="opacity-60" />
              </span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title={collapsed ? (isRTL ? 'تسجيل الخروج' : 'Sign Out') : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>{isRTL ? 'تسجيل الخروج' : 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Viewport Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 sticky top-0">
          {/* Left: Mobile Toggle & Collapse & Page Title */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Menu"
            >
              <Menu size={18} />
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
              aria-label="Toggle Sidebar"
            >
              {collapsed ? (
                isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />
              ) : (
                isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />
              )}
            </button>

            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-3)] hidden sm:inline">
                STUDIO /
              </span>
              <h1 className="text-sm sm:text-base font-bold text-[var(--text)] font-display truncate">
                {currentPage?.label || (isRTL ? 'لوحة التحكم' : 'Dashboard')}
              </h1>
            </div>
          </div>

          {/* Right: Controls & Profile */}
          <div className="flex items-center gap-2.5">
            {/* Language Toggle */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--k-blue)] transition-all"
              title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
            >
              <Globe size={14} className="text-[var(--k-sky)]" />
              <span>{locale === 'ar' ? 'EN' : 'العربية'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)]"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-[var(--k-yellow)]" />
              ) : (
                <Moon size={15} className="text-[var(--k-navy)]" />
              )}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-[var(--border)] rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--k-blue)] to-[var(--k-navy)] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left rtl:text-right">
                <span className="text-xs font-bold text-[var(--text)] leading-tight">{user.name}</span>
                <span className="text-[10px] font-mono text-[var(--text-3)] uppercase">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
