'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { apiRegister } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setError('');
    const res = await apiRegister({ name, email, password, password_confirmation: confirm });
    login(res.token, res.user);
    router.push('/dashboard');
  }

  return <main className="auth-wrap"><div className="auth-bg alt" /><motion.form className="auth-card glass" onSubmit={onSubmit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}><h1>Create your account</h1><input className="inp" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required /><input className="inp" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /><input className="inp" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /><input className="inp" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />{error && <p>{error}</p>}<button className="btn btn-primary" type="submit">Register</button><Link href="/login">Already have an account?</Link></motion.form></main>;
}
