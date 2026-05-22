'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * Applies data-theme to <html> so CSS variables work globally.
 * Also syncs dir="rtl" via LangContext in layout.
 */
export function ThemeDataApplier() {
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}
