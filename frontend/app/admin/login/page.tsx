'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await apiLogin({ email, password });
      
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        setError(isRTL ? 'غير مصرح لك بالوصول إلى لوحة الإدارة' : 'You are not authorized to access the admin panel');
        setLoading(false);
        return;
      }
      
      login(token, user);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRTL ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isRTL ? 'لوحة الإدارة' : 'Admin Panel'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isRTL ? 'تسجيل الدخول للمتابعة' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isRTL ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-medium transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isRTL ? 'جاري التحميل...' : 'Loading...'}
              </>
            ) : (
              isRTL ? 'تسجيل الدخول' : 'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
