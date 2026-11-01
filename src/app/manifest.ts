import type { MetadataRoute } from 'next';

import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO } from '@/lib/sitio';

/** Colores de la marca (globals.css): el nogal de la franja superior y el lino de las páginas. */
export const COLOR_TEMA = '#3a2418';
export const COLOR_FONDO = '#f1f3ee';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: TITULO_SITIO,
    short_name: NOMBRE_SITIO,
    description: DESCRIPCION_SITIO,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'es-CO',
    categories: ['education'],
    background_color: COLOR_FONDO,
    theme_color: COLOR_TEMA,
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
