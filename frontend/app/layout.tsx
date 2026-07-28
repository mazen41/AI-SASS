import type { Metadata } from 'next';
import './globals.css';
import { LangProvider } from '@/context/LangContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ThemeProvider>
          <AuthProvider>
            <LangProvider>{children}</LangProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
