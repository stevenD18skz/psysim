import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Source_Sans_3, Source_Serif_4 } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';

import './globals.css';

/** Texto de interfaz: sans humanista, sobria y muy legible en pantalla. */
const sourceSans = Source_Sans_3({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/** Serifa para títulos: tono académico, de la misma familia que el texto. */
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
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sourceSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
