import type { Metadata } from 'next';
import './globals.css';
import { LangProvider } from '@/context/LangContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'NazStudio — AI Storytelling & Cinematic Studio',
  description: 'Turn imagination into cinema. Create personalized illustrated storybooks, cinematic videos, printable coloring sheets, and stories with AI.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <LangProvider>{children}</LangProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
