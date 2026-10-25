import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';

import { ConfigurarZod } from '@/components/layout/configurar-zod';
import { TelemetriaCliente } from '@/components/layout/telemetria-cliente';
import { Toaster } from '@/components/ui/sonner';
import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';

import './globals.css';

/**
 * Archivo (Omnibus-Type, Buenos Aires) es la única familia de la interfaz. Su eje de ancho es parte
 * del sistema: expandido para la identidad y los títulos, normal para el trabajo y condensado para
 * metadatos (ver `ancho-*` en globals.css).
 */
const archivo = Archivo({
  variable: '--font-archivo',
  // Solo `latin`: cubre todo el español (ñ, tildes, ¿ ¡ « »). `latin-ext` sumaba ~85 KiB a cada visita.
  subsets: ['latin'],
  axes: ['wdth'],
});

/** Monoespaciada solo para datos: códigos de acceso y de caso. */
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  // Solo se ve en códigos de acceso y de caso: no se precarga en las páginas que no la usan.
  preload: false,
});

/**
 * El nonce de la política de seguridad de contenido llega con cada petición, así que las páginas
 * se renderizan en el servidor en cada visita (una página estática no podría llevarlo).
 */
export const dynamic = 'force-dynamic';

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
  themeColor: '#3a2418',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${archivo.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ConfigurarZod />
        <TelemetriaCliente />
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
