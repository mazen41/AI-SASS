import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | NazStudio',
  description: 'Review the terms that apply to NazStudio accounts, subscriptions, credits, generated content, and service use.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms of Service | NazStudio', url: 'https://nazstudio.art/terms', type: 'article' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
