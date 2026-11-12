'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiExchangeSocialCode } from '@/lib/api';

export default function SocialAuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const providerError = url.searchParams.get('error');
    window.history.replaceState({}, '', '/auth/callback');

    if (providerError) {
      setError(providerError);
      return;
    }
    if (!code) {
      setError('The sign-in response is missing. Please try signing in again.');
      return;
    }

    apiExchangeSocialCode(code)
      .then((response) => {
        login(response.token, response.user);
        router.replace('/dashboard');
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Sign-in could not be completed. Please try again.');
      });
  }, [login, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 text-[var(--text)]">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--k-blue)]/10 text-[var(--k-blue)]">
          {error ? <AlertCircle className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
        </div>
        <h1 className="text-xl font-bold">{error ? 'Sign-in could not be completed' : 'Signing you in'}</h1>
        <p className="mt-3 text-sm text-[var(--text-2)]">
          {error || 'Your secure sign-in is being verified. This should only take a moment.'}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="studio-btn-primary mt-6 w-full py-3 text-sm font-semibold"
          >
            Back to sign in
          </button>
        ) : (
          <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-[var(--k-blue)]" aria-label="Loading" />
        )}
      </section>
    </main>
  );
}
