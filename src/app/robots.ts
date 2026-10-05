import type { MetadataRoute } from 'next';

import { RUTAS_PRIVADAS, URL_SITIO } from '@/lib/sitio';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...RUTAS_PRIVADAS] },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
