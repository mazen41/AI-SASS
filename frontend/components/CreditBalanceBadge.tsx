'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { apiGetAiCredits } from '@/lib/api';
import { useLang } from '@/context/LangContext';

export default function CreditBalanceBadge() {
  const { locale } = useLang();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    apiGetAiCredits().then(({ credits }) => {
      if (active) setBalance(credits.available_credits);
    }).catch(() => {
      if (active) setBalance(null);
    });
    return () => { active = false; };
  }, []);

  return (
    <Link
      href="/billing#ai-credits"
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--k-blue)] transition-colors"
      title={locale === 'ar' ? 'رصيد الذكاء الاصطناعي' : 'AI credit balance'}
    >
      <Coins className="h-3.5 w-3.5 text-[var(--k-blue)]" />
      <span>{balance === null ? '—' : balance.toLocaleString(locale === 'ar' ? 'ar' : 'en')}</span>
      <span className="hidden sm:inline text-[var(--text-3)]">{locale === 'ar' ? 'رصيد' : 'credits'}</span>
    </Link>
  );
}
