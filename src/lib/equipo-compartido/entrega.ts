import { z } from 'zod';

import { PATRON_CODIGO_ACCESO } from '@/lib/asignaciones/codigo';

/*
 * Modo presencial: el docente asigna la práctica en su computador y se lo entrega al estudiante,
 * que entra con su propia cuenta. Los roles nunca se mezclan: la sesión del docente se cierra antes
 * de la entrega y la práctica queda en la cuenta del estudiante, que después lee ahí la
 * retroalimentación.
 *
 * Dos cookies acompañan la entrega:
 * - `COOKIE_ENTREGA` (solo servidor): para quién es el equipo y con qué código, para la pantalla
 *   de entrega. No da acceso a nada: el código solo funciona con la cuenta de ese estudiante.
 * - `COOKIE_EQUIPO_COMPARTIDO` (legible en el navegador): marca el equipo como compartido para
 *   que la práctica termine cerrando la sesión del estudiante.
 */

export const COOKIE_ENTREGA = 'psysim-entrega';
export const COOKIE_EQUIPO_COMPARTIDO = 'psysim-equipo-compartido';

/** Una jornada de clase: después el equipo deja de considerarse compartido. */
export const DURACION_ENTREGA_S = 4 * 60 * 60;

export const RUTA_ENTREGA = '/entrega';
export const RUTA_FIN_ENTREGA = '/entrega/fin';

/** Parámetro de /entrega: alguien intentó entrar con una cuenta que no es de estudiante. */
export const PARAM_CUENTA_RECHAZADA = 'cuenta-rechazada';

/**
 * Cierra la sesión de todas las cuentas de Google del navegador. Cerrar la sesión de PsySim no lo
 * hace: sin este paso, el siguiente estudiante vería la cuenta anterior en el selector de Google y
 * podría entrar con ella sin contraseña.
 */
export const URL_CERRAR_GOOGLE = 'https://accounts.google.com/Logout';

const datosEntregaSchema = z.object({
  codigo: z.string().regex(PATRON_CODIGO_ACCESO),
  estudiante: z.string().min(1).max(200),
  caso: z.string().min(1).max(200),
  /** El docente tiene Google vinculado: debe cerrar esa sesión antes de entregar el equipo. */
  docenteConGoogle: z.boolean(),
});

export type DatosEntrega = z.infer<typeof datosEntregaSchema>;

export function serializarEntrega(datos: DatosEntrega): string {
  return encodeURIComponent(JSON.stringify(datos));
}

/** Datos de la cookie de entrega, o `null` si no hay entrega o la cookie no es válida. */
export function leerEntrega(valor: string | undefined): DatosEntrega | null {
  if (!valor) return null;
  try {
    const datos = datosEntregaSchema.safeParse(JSON.parse(decodeURIComponent(valor)));
    return datos.success ? datos.data : null;
  } catch {
    return null;
  }
}

/** ¿Tiene el usuario Google entre sus formas de entrar? (`app_metadata` de Supabase Auth). */
export function usaGoogle(appMetadata: Record<string, unknown> | undefined): boolean {
  if (!appMetadata) return false;
  const proveedores = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];
  return appMetadata.provider === 'google' || proveedores.includes('google');
}

/** Primer nombre, para dirigirse al estudiante en la pantalla de entrega. */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}
