import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TRPCProvider } from '@/lib/trpc';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

// ===========================================
// Fonts
// ===========================================

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// ===========================================
// Metadata
// ===========================================

export const metadata: Metadata = {
  title: {
    default: 'PropertyClips',
    template: '%s | PropertyClips',
  },
  description:
    'Create stunning animated property videos with interactive maps and professional styling.',
  keywords: [
    'property videos',
    'real estate marketing',
    'animated maps',
    'video creation',
    'property showcase',
  ],
  authors: [{ name: 'PropertyClips' }],
  creator: 'PropertyClips',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://propertyclips.com'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: '/',
    title: 'PropertyClips',
    description:
      'Create stunning animated property videos with interactive maps and professional styling.',
    siteName: 'PropertyClips',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PropertyClips',
    description:
      'Create stunning animated property videos with interactive maps and professional styling.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

// ===========================================
// Root Layout
// ===========================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TRPCProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
