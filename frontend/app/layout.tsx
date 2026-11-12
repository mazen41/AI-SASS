import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LangProvider } from '@/context/LangContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://nazstudio.art'),
  title: 'NazStudio — AI Storytelling & Cinematic Studio',
  description: 'Turn imagination into cinema. Create personalized illustrated storybooks, cinematic videos, printable coloring sheets, and stories with AI.',
  applicationName: 'NazStudio',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://nazstudio.art/',
    siteName: 'NazStudio',
    title: 'NazStudio — AI Storytelling & Cinematic Studio',
    description: 'Create personalized storybooks, stories, coloring pages, narration, and videos with AI.',
    images: [{ url: '/logo.png', alt: 'NazStudio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NazStudio — AI Storytelling & Cinematic Studio',
    description: 'Create personalized storybooks, stories, coloring pages, narration, and videos with AI.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = { themeColor: '#0B0F1A' };

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
