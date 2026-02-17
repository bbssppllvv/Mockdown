import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#2979FF',
};

const siteTitle = 'Mockdown — ASCII Wireframe Editor';
const siteDescription =
  'Free browser-based ASCII wireframe editor. Design UI mockups, lo-fi prototypes, and text diagrams with drag-and-drop components — no signup required.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mockdown.design'),
  title: siteTitle,
  description: siteDescription,
  applicationName: 'Mockdown',
  keywords: [
    'ASCII wireframe',
    'wireframe editor',
    'ASCII mockup',
    'text wireframe',
    'lo-fi prototype',
    'UI mockup tool',
    'ASCII diagram',
    'wireframe tool',
    'rapid prototyping',
    'free wireframe',
  ],
  authors: [{ name: 'Mockdown' }],
  creator: 'Mockdown',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Mockdown',
    title: siteTitle,
    description: siteDescription,
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: siteTitle }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [{ url: '/og.png', alt: siteTitle }],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Mockdown',
  url: 'https://www.mockdown.design',
  description: siteDescription,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  browserRequirements: 'Requires a modern web browser',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="97036071-936c-4ba5-a66b-5eff9c60b757"
        />
        {children}
      </body>
    </html>
  );
}
