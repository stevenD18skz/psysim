import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/** Serifa para títulos: da el tono editorial y cálido del tema. */
const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'PsySim',
    template: '%s · PsySim',
  },
  description: 'Plataforma Web 3D para la Simulación de Escenarios Psicológicos',
};

export const viewport: Viewport = {
  themeColor: '#f7f3ec',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
