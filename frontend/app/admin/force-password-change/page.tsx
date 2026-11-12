'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { apiForceChangePassword } from '@/lib/api';

export default function ForcePasswordChangePage() {
  const { refreshUser } = useAuth();
  const { locale } = useLang();
  const router = useRouter();
  const ar = locale === 'ar';
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiForceChangePassword({ current_password: currentPassword, password, password_confirmation: confirmation });
      await refreshUser();
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : (ar ? 'تعذر تحديث كلمة المرور.' : 'Could not update password.'));
    } finally { setSaving(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-5" dir={ar ? 'rtl' : 'ltr'}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-2xl sm:p-9">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--k-blue)]/10 text-[var(--k-blue)]"><KeyRound size={26} /></div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400"><ShieldCheck size={15} />{ar ? 'إجراء أمني مطلوب' : 'SECURITY ACTION REQUIRED'}</div>
        <h1 className="text-2xl font-bold">{ar ? 'أنشئ كلمة مرور جديدة' : 'Set a new password'}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">{ar ? 'هذه كلمة مرور مؤقتة. غيّرها قبل استخدام لوحة الإدارة.' : 'Your administrator gave you a temporary password. Change it before using the admin dashboard.'}</p>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <label className="mt-6 block text-sm font-medium">{ar ? 'كلمة المرور المؤقتة' : 'Temporary password'}<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 outline-none focus:border-[var(--k-blue)]" /></label>
        <label className="mt-4 block text-sm font-medium">{ar ? 'كلمة المرور الجديدة' : 'New password'}<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 outline-none focus:border-[var(--k-blue)]" /><span className="mt-1 block text-xs text-[var(--text-3)]">{ar ? '12 حرفًا على الأقل، مع أحرف كبيرة وصغيرة وأرقام.' : 'At least 12 characters, including upper and lowercase letters and numbers.'}</span></label>
        <label className="mt-4 block text-sm font-medium">{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}<input required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 outline-none focus:border-[var(--k-blue)]" /></label>
        <button disabled={saving} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--k-blue)] px-4 py-3 font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}{ar ? 'تحديث كلمة المرور' : 'Update password'}</button>
      </form>
    </main>
  );
}
