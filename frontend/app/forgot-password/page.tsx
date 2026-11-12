'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { apiRequestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const { locale } = useLang();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const ar = locale === 'ar';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiRequestPasswordReset(email.trim());
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : (ar ? 'تعذر إرسال رابط إعادة التعيين.' : 'Could not send the reset link.'));
    } finally {
      setLoading(false);
    }
  }

  return <main dir={ar ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-12 text-[var(--text)]">
    <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-2xl sm:p-10">
      <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--text)]"><ArrowLeft className="h-4 w-4" />{ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</Link>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--k-blue)]/10 text-[var(--k-blue)]"><Mail className="h-6 w-6" /></div>
      <h1 className="text-3xl font-bold">{ar ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-2)]">{ar ? 'أدخل البريد المرتبط بحسابك وسنرسل رابطًا لإعادة تعيين كلمة المرور.' : 'Enter the email linked to your account and we’ll send a password reset link.'}</p>
      {sent ? <div role="status" className="mt-7 flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400"><CheckCircle2 className="h-5 w-5 shrink-0" /><span>{ar ? 'إذا كان البريد مرتبطًا بحساب، فسيصلك رابط إعادة التعيين قريبًا. تحقق من صندوق الوارد والرسائل غير المرغوب فيها.' : 'If an account uses that email, a reset link is on its way. Check your inbox and spam folder.'}</span></div> : <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="reset-email">{ar ? 'البريد الإلكتروني' : 'Email address'}</label>
        <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none focus:border-[var(--k-blue)]" placeholder="you@example.com" />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--k-blue)] px-4 py-3 font-semibold text-white disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{ar ? 'إرسال رابط إعادة التعيين' : 'Send reset link'}</button>
      </form>}
    </section>
  </main>;
}
