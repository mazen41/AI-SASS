'use client';

import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Activity,
  FileText,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Home,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { locale } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isRTL = locale === 'ar';
  const isLoginPage = pathname === '/admin/login';

  const navItems = [
    { href: '/admin', label: isRTL ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: isRTL ? 'المستخدمين' : 'Users', icon: Users },
    { href: '/admin/plans', label: isRTL ? 'الخطط' : 'Plans', icon: FileText },
    { href: '/admin/subscriptions', label: isRTL ? 'الاشتراكات' : 'Subscriptions', icon: RefreshCw },
    { href: '/admin/transactions', label: isRTL ? 'المعاملات' : 'Transactions', icon: CreditCard },
    { href: '/admin/payments', label: isRTL ? 'التكاملات' : 'Integrations', icon: Settings },
    { href: '/admin/activity', label: isRTL ? 'سجل النشاط' : 'Activity', icon: Activity },
  ];

  useEffect(() => {
    if (!loading && !isLoginPage) {
      if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
        router.push('/admin/login');
      }
    }
  }, [user, loading, router, isLoginPage]);

  // If on login page, just render children
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="admin-loading" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="admin-spinner" />
        <style jsx>{`
          .admin-loading {
            min-height: 100vh;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
          }
          .admin-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return null;
  }

  const currentPage = navItems.find(
    (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
  );

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  return (
    <div className="admin-shell" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="admin-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo">StoryHero</h1>
          <span className="sidebar-badge">{isRTL ? 'المدير' : 'Admin'}</span>
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link href="/" className="nav-item">
            <Home size={18} />
            <span>{isRTL ? 'العودة للموقع' : 'Back to Site'}</span>
          </Link>
          <button onClick={handleLogout} className="nav-item logout">
            <LogOut size={18} />
            <span>{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button className="mobile-toggle" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <h2 className="page-title">{currentPage?.label || (isRTL ? 'لوحة التحكم' : 'Dashboard')}</h2>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
              <span className="user-name">{user.name}</span>
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>

      <style jsx global>{`
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          cursor: default;
        }

        .admin-shell * {
          cursor: inherit;
        }

        .admin-shell a, .admin-shell button {
          cursor: pointer;
        }

        .admin-sidebar {
          width: 240px;
          background: #fff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 100;
          transition: transform 0.3s ease;
        }

        [dir="rtl"] .admin-sidebar {
          left: auto;
          right: 0;
          border-right: none;
          border-left: 1px solid #e2e8f0;
        }

        .sidebar-header {
          padding: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sidebar-logo {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .sidebar-badge {
          font-size: 0.65rem;
          background: #6366f1;
          color: white;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .mobile-close {
          display: none;
          margin-left: auto;
          background: none;
          border: none;
          color: #64748b;
          padding: 0.25rem;
        }

        [dir="rtl"] .mobile-close {
          margin-left: 0;
          margin-right: auto;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0.75rem;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 6px;
          color: #64748b;
          text-decoration: none;
          font-size: 0.875rem;
          transition: all 0.15s;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }

        [dir="rtl"] .nav-item {
          text-align: right;
        }

        .nav-item:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .nav-item.active {
          background: #6366f1;
          color: white;
        }

        .nav-item.logout {
          color: #dc2626;
        }

        .nav-item.logout:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .sidebar-footer {
          padding: 0.75rem;
          border-top: 1px solid #e2e8f0;
        }

        .admin-main {
          flex: 1;
          margin-left: 240px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        [dir="rtl"] .admin-main {
          margin-left: 0;
          margin-right: 240px;
        }

        .admin-header {
          height: 60px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: #64748b;
          padding: 0.25rem;
        }

        .page-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: #6366f1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1e293b;
        }

        .admin-content {
          flex: 1;
          padding: 1.5rem;
        }

        .admin-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 90;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            transform: translateX(-100%);
          }

          [dir="rtl"] .admin-sidebar {
            transform: translateX(100%);
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .admin-overlay {
            display: block;
          }

          .mobile-close {
            display: block;
          }

          .mobile-toggle {
            display: block;
          }

          .admin-main {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .user-name {
            display: none;
          }

          .admin-header {
            padding: 0 1rem;
          }

          .admin-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
