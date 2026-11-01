import { z } from 'zod';

/**
 * Telemetría del navegador (errores y Core Web Vitals) que se envía a `/api/telemetria`.
 * Se limita a lo mínimo para diagnosticar y no lleva datos personales: la ruta se recorta sin
 * parámetros ni fragmento, los textos se truncan y no hay identificadores de persona.
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

/** Solo la ruta: fuera `?parametros` y `#fragmento`, que pueden llevar códigos de acceso. */
export function rutaSinParametros(url: string): string {
  const sinParametros = url.split(/[?#]/)[0] ?? '/';
  return sinParametros.startsWith('/') ? sinParametros.slice(0, 200) : '/';
}

/** Quita direcciones y códigos largos que podrían colarse en un mensaje de error. */
export function limpiarMensaje(mensaje: string): string {
  return mensaje
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]')
    .replace(/\b[a-z0-9]{3,}(?:-[a-z0-9]{3,}){2,}\b/gi, '[código]')
    .slice(0, 300);
}
