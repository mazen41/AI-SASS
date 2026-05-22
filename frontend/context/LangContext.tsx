'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Locale, TranslationKey } from '@/lib/i18n';

interface LangContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  toggleLocale: () => void;
  isRTL: boolean;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved === 'ar' || saved === 'en') setLocale(saved);
  }, []);

  useEffect(() => {
    // Apply dir and lang to <html> for proper RTL support
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, [locale]);

  const toggleLocale = () => {
    const next: Locale = locale === 'en' ? 'ar' : 'en';
    setLocale(next);
    localStorage.setItem('locale', next);
  };

  const t = (key: TranslationKey): string => translations[locale][key];
  const isRTL = locale === 'ar';

  return (
    <LangContext.Provider value={{ locale, t, toggleLocale, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
