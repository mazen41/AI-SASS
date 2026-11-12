'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { apiResetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[var(--bg)]" />}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale } = useLang();
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ar = locale === 'ar';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiResetPassword({ email, token, password, password_confirmation: confirmation });
      router.replace('/login?password_reset=1');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : (ar ? 'الرابط غير صالح أو منتهي الصلاحية.' : 'This reset link is invalid or expired.'));
    } finally {
      setLoading(false);
    }
  }

  return <main dir={ar ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-12 text-[var(--text)]">
    <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-2xl sm:p-10">
      <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--text)]"><ArrowLeft className="h-4 w-4" />{ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</Link>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--k-blue)]/10 text-[var(--k-blue)]"><KeyRound className="h-6 w-6" /></div>
      <h1 className="text-3xl font-bold">{ar ? 'تعيين كلمة مرور جديدة' : 'Set a new password'}</h1>
      {!email || !token ? <p role="alert" className="mt-4 text-sm text-red-400">{ar ? 'رابط إعادة التعيين غير مكتمل. اطلب رابطًا جديدًا.' : 'This reset link is incomplete. Request a new one.'}<Link className="ms-1 underline" href="/forgot-password">{ar ? 'طلب رابط جديد' : 'Request a new link'}</Link></p> : <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="new-password">{ar ? 'كلمة المرور الجديدة' : 'New password'}</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--k-blue)]" />
        <label className="block text-sm font-semibold" htmlFor="confirm-password">{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--k-blue)]" />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--k-blue)] px-4 py-3 font-semibold text-white disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{ar ? 'تحديث كلمة المرور' : 'Update password'}</button>
      </form>}
    </section>
  </main>;
}
