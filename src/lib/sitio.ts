/**
 * Datos públicos del sitio, compartidos por los metadatos, el sitemap, el robots y el JSON-LD.
 * `NEXT_PUBLIC_SITE_URL` permite apuntar a otro dominio (p. ej. uno propio) sin tocar código.
 */
export const URL_SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://psysim.vercel.app').replace(
  /\/$/,
  ''
);

export const NOMBRE_SITIO = 'PsySim';

export const TITULO_SITIO = 'PsySim: simulador de entrevista clínica con pacientes virtuales de IA';

export const DESCRIPCION_SITIO =
  'Plataforma web 3D de la Universidad del Valle donde estudiantes de psicología practican la entrevista clínica con pacientes virtuales guiados por inteligencia artificial.';

/** Rutas privadas del docente: no deben indexarse ni rastrearse. */
export const RUTAS_PRIVADAS = [
  '/configuracion',
  '/simulacion',
  '/laboratorio',
  '/acceso-denegado',
  '/dev',
  '/api',
] as const;
