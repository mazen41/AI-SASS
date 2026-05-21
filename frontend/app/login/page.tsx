'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { apiLogin } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiLogin({ email, password });
      login(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-wrap"><div className="auth-bg" /><motion.form className="auth-card glass" onSubmit={onSubmit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}><h1>Welcome back</h1><input className="inp" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /><input className="inp" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <p>{error}</p>}<button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Loading...' : 'Login'}</button><Link href="/register">Create account</Link></motion.form></main>;
}
