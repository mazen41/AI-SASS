'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';

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
    <div className="admin-login-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>{isRTL ? 'لوحة الإدارة' : 'Admin Panel'}</h1>
          <p>{isRTL ? 'تسجيل الدخول للمتابعة' : 'Sign in to continue'}</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRTL ? 'admin@example.com' : 'admin@example.com'}
              required
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'كلمة المرور' : 'Password'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="admin-login-btn">
            {loading 
              ? (isRTL ? 'جاري التحميل...' : 'Loading...') 
              : (isRTL ? 'تسجيل الدخول' : 'Sign In')
            }
          </button>
        </form>
      </div>

      <style jsx>{`
        .admin-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 1rem;
          cursor: default;
        }

        .admin-login-card {
          width: 100%;
          max-width: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 2rem;
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .admin-login-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.5rem;
        }

        .admin-login-header p {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .admin-login-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          padding: 0.7rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .admin-login-btn {
          margin-top: 0.5rem;
          padding: 0.75rem 1rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .admin-login-btn:hover:not(:disabled) {
          background: #4f46e5;
        }

        .admin-login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
