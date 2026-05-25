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
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { locale, toggleLocale } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isRTL = locale === 'ar';
  const isLoginPage = pathname === '/admin/login';

  const navItems = [
    { href: '/admin', label: isRTL ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: isRTL ? 'المستخدمين' : 'Users', icon: Users },
    { href: '/admin/subscriptions', label: isRTL ? 'الاشتراكات' : 'Subscriptions', icon: RefreshCw },
    { href: '/admin/transactions', label: isRTL ? 'المعاملات' : 'Transactions', icon: CreditCard },
    { href: '/admin/payments', label: isRTL ? 'التكاملات' : 'Integrations', icon: Settings },
    { href: '/admin/email', label: isRTL ? 'البريد' : 'Email', icon: Mail },
    { href: '/admin/backup', label: isRTL ? 'النسخ الاحتياطي' : 'Backups', icon: Database },
    { href: '/admin/activity', label: isRTL ? 'سجل النشاط' : 'Activity', icon: Activity },
    { href: '/admin/system', label: isRTL ? 'صحة النظام' : 'System Health', icon: Server },
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Loader2 size={40} className="animate-spin text-indigo-600" />
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-white dark:bg-gray-800 border-x border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')} lg:static lg:shrink-0`}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">StoryHero</h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 rounded-md shrink-0">
              {isRTL ? 'المدير' : 'Admin'}
            </span>
          </div>
          <button 
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" 
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 shrink-0">
          <Link 
            href="/" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white transition-all group"
          >
            <Home size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            {isRTL ? 'العودة للموقع' : 'Back to Site'}
          </Link>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-all group"
          >
            <LogOut size={18} className="text-red-500 dark:text-red-400" />
            {isRTL ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1" 
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white hidden sm:block truncate">
              {currentPage?.label || (isRTL ? 'لوحة التحكم' : 'Dashboard')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <button 
              onClick={toggleLocale} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors"
              title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
            >
              <Globe size={16} className="text-gray-500 dark:text-gray-400" />
              <span>{locale === 'ar' ? 'EN' : 'AR'}</span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{user.role}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 shadow-sm shrink-0">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
