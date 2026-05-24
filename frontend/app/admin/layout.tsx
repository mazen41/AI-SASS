'use client';

import { useAuth } from '@/context/AuthContext';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Home,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/plans', label: 'Plans', icon: FileText },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/admin/payments', label: 'Integrations', icon: Settings },
  { href: '/admin/activity', label: 'Activity Logs', icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'super_admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const currentPage = navItems.find(
    (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
  );

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--expanded' : 'admin-sidebar--collapsed'} ${
          mobileMenuOpen ? 'admin-sidebar--mobile-open' : ''
        }`}
      >
        {/* Logo */}
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <div className="admin-logo-icon">
              <Shield size={20} />
            </div>
            {sidebarOpen && (
              <div className="admin-logo-text">
                <span className="admin-logo-title">StoryHero</span>
                <span className="admin-logo-subtitle">Super Admin</span>
              </div>
            )}
          </div>
          <button
            className="admin-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={20} className="admin-nav-icon" />
                {sidebarOpen && <span className="admin-nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-nav-item" title="Back to Site">
            <Home size={20} className="admin-nav-icon" />
            {sidebarOpen && <span className="admin-nav-label">Back to Site</span>}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="admin-sidebar-toggle"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              className="admin-mobile-toggle"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="admin-breadcrumb">
              <span className="admin-breadcrumb-item">Admin</span>
              <span className="admin-breadcrumb-sep">/</span>
              <span className="admin-breadcrumb-current">
                {currentPage?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="admin-header-right">
            <button className="admin-header-btn" title="Notifications">
              <Bell size={20} />
            </button>
            <div className="admin-user-info">
              <div className="admin-user-avatar">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="admin-user-details">
                <span className="admin-user-name">{user.name}</span>
                <span className="admin-user-role">Super Admin</span>
              </div>
            </div>
            <button onClick={logout} className="admin-logout-btn" title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">{children}</main>
      </div>

      <style jsx global>{`
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: #0f0f1a;
          color: #e2e8f0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .admin-loading {
          min-height: 100vh;
          background: #0f0f1a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Sidebar */
        .admin-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
          border-right: 1px solid rgba(139, 92, 246, 0.15);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width 0.3s ease, transform 0.3s ease;
        }

        .admin-sidebar--expanded {
          width: 260px;
        }

        .admin-sidebar--collapsed {
          width: 72px;
        }

        .admin-sidebar-header {
          padding: 1.25rem;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .admin-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .admin-logo-text {
          display: flex;
          flex-direction: column;
        }

        .admin-logo-title {
          font-weight: 700;
          font-size: 1.1rem;
          color: #fff;
        }

        .admin-logo-subtitle {
          font-size: 0.7rem;
          color: #8b5cf6;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .admin-mobile-close {
          display: none;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.5rem;
        }

        /* Navigation */
        .admin-nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          font-size: 0.9rem;
        }

        .admin-nav-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #e2e8f0;
        }

        .admin-nav-item--active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%);
          color: #fff;
          border-left: 3px solid #8b5cf6;
        }

        .admin-nav-icon {
          flex-shrink: 0;
        }

        .admin-nav-label {
          white-space: nowrap;
        }

        .admin-sidebar--collapsed .admin-nav-item {
          justify-content: center;
          padding: 0.75rem;
        }

        .admin-sidebar--collapsed .admin-nav-label {
          display: none;
        }

        /* Sidebar footer */
        .admin-sidebar-footer {
          padding: 0.75rem;
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-sidebar-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: rgba(139, 92, 246, 0.1);
          border: none;
          border-radius: 6px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-sidebar-toggle:hover {
          background: rgba(139, 92, 246, 0.2);
          color: #fff;
        }

        /* Main content area */
        .admin-main {
          flex: 1;
          margin-left: 260px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          transition: margin-left 0.3s ease;
        }

        .admin-sidebar--collapsed ~ .admin-main {
          margin-left: 72px;
        }

        /* Header */
        .admin-header {
          height: 64px;
          background: rgba(26, 26, 46, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .admin-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .admin-mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.5rem;
        }

        .admin-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .admin-breadcrumb-item {
          color: #64748b;
        }

        .admin-breadcrumb-sep {
          color: #475569;
        }

        .admin-breadcrumb-current {
          color: #e2e8f0;
          font-weight: 500;
        }

        .admin-header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .admin-header-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(139, 92, 246, 0.1);
          border: none;
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-header-btn:hover {
          background: rgba(139, 92, 246, 0.2);
          color: #fff;
        }

        .admin-user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: rgba(139, 92, 246, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(139, 92, 246, 0.1);
        }

        .admin-user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .admin-user-details {
          display: flex;
          flex-direction: column;
        }

        .admin-user-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: #fff;
        }

        .admin-user-role {
          font-size: 0.7rem;
          color: #8b5cf6;
        }

        .admin-logout-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #f87171;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .admin-logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Content */
        .admin-content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }

        /* Mobile overlay */
        .admin-mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 90;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .admin-sidebar {
            transform: translateX(-100%);
            width: 260px !important;
          }

          .admin-sidebar--mobile-open {
            transform: translateX(0);
          }

          .admin-mobile-overlay {
            display: block;
          }

          .admin-mobile-close {
            display: block;
          }

          .admin-mobile-toggle {
            display: block;
          }

          .admin-main {
            margin-left: 0 !important;
          }

          .admin-sidebar-toggle {
            display: none;
          }

          .admin-user-details {
            display: none;
          }

          .admin-logout-btn span {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .admin-header {
            padding: 0 1rem;
          }

          .admin-content {
            padding: 1rem;
          }

          .admin-user-info {
            padding: 0.5rem;
          }

          .admin-breadcrumb {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
