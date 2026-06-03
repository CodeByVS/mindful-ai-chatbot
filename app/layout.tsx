import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'MindfulAI — Mental Health Companion',
  description:
    'Your compassionate AI-powered mental health companion. Get evidence-based insights on anxiety management, mindfulness, emotional resilience, and positive psychology.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f8fafc',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-surface text-text antialiased">
        {/* Ambient background glow */}
        <div className="ambient-glow" aria-hidden="true" />

        {/* App content */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
