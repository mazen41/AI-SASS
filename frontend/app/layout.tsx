import type { Metadata } from 'next';
import { Baloo_2, Fredoka, Nunito } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/context/LangContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
});

const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-baloo',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
});

export const metadata: Metadata = {
  title: 'AI StoryVerse',
  description: 'Turn your child into the hero of an AI-powered story.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${nunito.className} ${baloo.variable} ${fredoka.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <LangProvider>{children}</LangProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
