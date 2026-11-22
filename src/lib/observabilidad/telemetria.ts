import { z } from 'zod';

/**
 * Telemetría del navegador (errores y Core Web Vitals) que se envía a `/api/telemetria`.
 * Envía el patrón de la pantalla y limita el texto al necesario para diagnosticar el error.
 */
export const MAX_BYTES_TELEMETRIA = 2048;

export const METRICAS_WEB = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;

const ruta = z.string().max(200).startsWith('/');

export const telemetriaSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('error'),
    ruta,
    mensaje: z.string().max(300),
    /** `digest` de Next.js, para cruzarlo con el error del servidor. */
    digest: z.string().max(64).optional(),
  }),
  z.object({
    tipo: z.literal('vital'),
    ruta,
    nombre: z.enum(METRICAS_WEB),
    valor: z.number().finite().min(0).max(600_000),
    valoracion: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  }),
]);

export type Telemetria = z.infer<typeof telemetriaSchema>;

const PANTALLAS = new Set([
  '/',
  '/acceso-denegado',
  '/admin',
  '/admin/ia',
  '/configuracion',
  '/configuracion/casos',
  '/configuracion/casos/nuevo',
  '/contrasena',
  '/dev/modelos',
  '/dev/pasos',
  '/entrega',
  '/entrega/fin',
  '/estudiantes',
  '/inicio',
  '/laboratorio',
  '/laboratorio/npc',
  '/login',
  '/manual',
  '/practicas',
  '/privacidad',
  '/resultados',
  '/sesiones',
  '/simulacion',
]);

const PANTALLAS_DINAMICAS = [
  [/^\/admin\/docentes\/[^/]+$/, '/admin/docentes/[id]'],
  [/^\/configuracion\/casos\/[^/]+$/, '/configuracion/casos/[id]'],
  [/^\/dev\/escena\/[^/]+$/, '/dev/escena/[archivo]'],
  [/^\/estudiantes\/[^/]+\/notas$/, '/estudiantes/[id]/notas'],
  [/^\/estudiantes\/[^/]+$/, '/estudiantes/[id]'],
  [/^\/practicas\/[^/]+$/, '/practicas/[id]'],
  [/^\/sesiones\/[^/]+$/, '/sesiones/[id]'],
  [/^\/unirse\/[^/]+$/, '/unirse/[codigo]'],
] as const;

/** Nunca conserva segmentos que podrían haber sido escritos por el navegador. */
export function patronDePantalla(url: string): string {
  if (!url.startsWith('/') || url.startsWith('//')) return '/otra';
  const ruta = url.split(/[?#]/)[0]?.replace(/\/+$/, '') || '/';
  if (PANTALLAS.has(ruta)) return ruta;
  return PANTALLAS_DINAMICAS.find(([patron]) => patron.test(ruta))?.[1] ?? '/otra';
}

/** Quita direcciones y códigos largos que podrían colarse en un mensaje de error. */
export function limpiarMensaje(mensaje: string): string {
  return mensaje
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]')
    .replace(/\b[a-z0-9]{3,}(?:-[a-z0-9]{3,}){2,}\b/gi, '[código]')
    .slice(0, 300);
}
