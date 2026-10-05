import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Source_Sans_3, Source_Serif_4 } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';

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
  metadataBase: new URL(URL_SITIO),
  title: {
    default: TITULO_SITIO,
    template: `%s · ${NOMBRE_SITIO}`,
  },
  description: DESCRIPCION_SITIO,
  applicationName: NOMBRE_SITIO,
  authors: [{ name: 'Brayan Steven Narváez Valdés' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: NOMBRE_SITIO,
    locale: 'es_CO',
    title: TITULO_SITIO,
    description: DESCRIPCION_SITIO,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: TITULO_SITIO, description: DESCRIPCION_SITIO },
  // Verificación de Search Console (opcional): define GOOGLE_SITE_VERIFICATION en Vercel.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
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
