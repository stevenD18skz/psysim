import { publicEnv } from '@/lib/env/public';

/** Bucket público de Supabase Storage con los modelos GLB comprimidos con Draco. */
export const BUCKET_MODELOS = 'modelos-3d';

/** Ruta pública de los decodificadores Draco (copiados de `three` en public/draco). */
export const RUTA_DRACO = '/draco/';

/**
 * Origen de los modelos 3D:
 * - Por defecto, el bucket `modelos-3d` de Supabase Storage (lo que usa Vercel).
 * - En desarrollo se puede apuntar a los archivos locales con
 *   `NEXT_PUBLIC_MODELOS_BASE_URL=/models` para probar sin subirlos.
 */
export function baseUrlModelos(): string {
  const personalizada = publicEnv.NEXT_PUBLIC_MODELOS_BASE_URL;
  if (personalizada) return personalizada.replace(/\/+$/, '');
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_MODELOS}`;
}

/** URL absoluta (o relativa al sitio) de un modelo, a partir de su ruta en el JSON de escena. */
export function resolverUrlModelo(ruta: string): string {
  return `${baseUrlModelos()}/${ruta.replace(/^\/+/, '')}`;
}
