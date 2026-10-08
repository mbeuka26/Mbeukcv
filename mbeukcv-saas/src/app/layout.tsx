import type { Metadata } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import { HubGateBoot } from '@/components/HubGateBoot';
import { PwaBootstrap } from '@/components/PwaBootstrap';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'MbeukCV — Offres et candidatures',
  description: 'CV, correspondance avec les offres actives, et candidature par e-mail.',
  manifest: '/manifest.webmanifest',
  applicationName: 'MbeukCV',
  appleWebApp: { capable: true, title: 'MbeukCV' },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/icons/mbeuk-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/mbeuk-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${sans.variable} ${serif.variable} font-sans`}>
        <PwaBootstrap />
        <ThemeProvider />
        <HubGateBoot />
        {children}
      </body>
    </html>
  );
}
