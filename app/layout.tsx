import type { Metadata, Viewport } from 'next';
import { Outfit, Work_Sans } from 'next/font/google';
import './globals.css';
import ClientErrorReporter from '@/components/ClientErrorReporter';
import { I18nProvider } from '@/lib/i18n';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Area Barat — Coffee Shop', template: '%s — Area Barat' },
  description: 'Pesan kopi favoritmu di Area Barat. Tanpa antre, pantau pesananmu secara langsung.',
  icons: { icon: '/icon.png', apple: '/icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#081511',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${outfit.variable} ${workSans.variable}`}>
      <body>
        <ClientErrorReporter />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}