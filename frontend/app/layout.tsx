import type { Metadata } from 'next';
import { Syne, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/context/LangContext';
import { AuthProvider } from '@/context/AuthContext';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'StoryHero — AI-Powered Stories for Your Child',
  description:
    'Upload a photo, choose an adventure, and watch your child become the hero of a cinematic AI-powered story with voice narration and personalized visuals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#04040a] text-white antialiased">
        <AuthProvider>
          <LangProvider>{children}</LangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
