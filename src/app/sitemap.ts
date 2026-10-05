import type { MetadataRoute } from 'next';

import { URL_SITIO } from '@/lib/sitio';

/** Solo las páginas públicas e indexables. El login y el panel del docente quedan fuera. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${URL_SITIO}/`, changeFrequency: 'monthly', priority: 1 }];
}
