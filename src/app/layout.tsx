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
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mockdown.design'),
  title: 'Mockdown — ASCII Wireframe Editor',
  description: 'Quick ASCII wireframe prototyping tool',
  openGraph: {
    title: 'Mockdown — ASCII Wireframe Editor',
    description: 'Quick ASCII wireframe prototyping tool',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mockdown — ASCII Wireframe Editor',
    description: 'Quick ASCII wireframe prototyping tool',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} antialiased`}>
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
