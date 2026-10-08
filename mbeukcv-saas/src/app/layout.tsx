import type { Metadata } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import { HubGateBoot } from '@/components/HubGateBoot';
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
  icons: { apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${sans.variable} ${serif.variable} font-sans`}>
        <ThemeProvider />
        <HubGateBoot />
        {children}
      </body>
    </html>
  );
}
