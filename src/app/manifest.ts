import type { MetadataRoute } from 'next';

import { DESCRIPCION_SITIO, NOMBRE_SITIO } from '@/lib/sitio';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PsySim · Simulador de escenarios psicológicos',
    short_name: NOMBRE_SITIO,
    description: DESCRIPCION_SITIO,
    start_url: '/',
    display: 'standalone',
    lang: 'es',
    background_color: '#ffffff',
    theme_color: '#0c0c0e',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
