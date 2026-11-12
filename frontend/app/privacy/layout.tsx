import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | NazStudio',
  description: 'Learn how NazStudio handles account information, uploaded photos, generated media, and privacy requests.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy Policy | NazStudio', url: 'https://nazstudio.art/privacy', type: 'article' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
