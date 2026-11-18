import 'server-only';

import { type EntradaDeAcceso } from '@/lib/auth/metodo-acceso';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { DURACION_ENTREGA_S } from './entrega';

/*
 * Ventana de entrega (modo presencial). Al entregar su computador, el docente deja en el
 * servidor hasta cuándo su cuenta no entra con Google (`usuario.entrega_hasta`). PsySim cierra su
 * sesión, pero no la de Google de ese navegador: sin esto, el estudiante podría volver al acceso
 * y elegir la cuenta del docente en el selector de Google, que no pide contraseña. Las cookies de
 * la entrega no bastan, porque el navegador está en manos del estudiante.
 *
 * El docente recupera su cuenta con correo y contraseña, que es lo que demuestra que es él.
 *
 * Sin la migración `20261117010000` se puede iniciar sesión, pero no entregar el equipo.
 */

/** La base todavía no tiene la columna. */
const SIN_MIGRAR = new Set(['42703', 'PGRST204']);

function registrar(evento: string, codigo: string | undefined) {
  if (!codigo || !SIN_MIGRAR.has(codigo)) log.error(evento, { codigo });
}

/** El docente acaba de entregar su equipo: su cuenta deja de entrar con Google por una jornada. */
export async function abrirVentanaDeEntrega(usuarioId: string): Promise<boolean> {
  try {
    const hasta = new Date(Date.now() + DURACION_ENTREGA_S * 1000).toISOString();
    const { data, error } = await createAdminClient()
      .from('usuario')
      .update({ entrega_hasta: hasta })
      .eq('id', usuarioId)
      .eq('activo', true)
      .select('id')
      .maybeSingle();
    if (!error && data) return true;
    log.error('entrega.ventana_no_abierta', { codigo: error?.code });
  } catch {
    log.error('entrega.ventana_no_abierta', {});
  }
  return false;
}

/**
 * Devuelve la fecha de entrega, `null` cuando no hay entrega y `undefined` si la consulta falló.
 */
export async function leerVentanaDeEntrega(usuarioId: string): Promise<string | null | undefined> {
  try {
    const { data, error } = await createAdminClient()
      .from('usuario')
      .select('entrega_hasta')
      .eq('id', usuarioId)
      .maybeSingle();
    if (error) {
      if (error.code && SIN_MIGRAR.has(error.code)) return null;
      log.error('entrega.ventana_no_leida', { codigo: error.code });
      return undefined;
    }
    return data?.entrega_hasta ?? null;
  } catch {
    log.error('entrega.ventana_no_leida', {});
    return undefined;
  }
}

/** El docente volvió a entrar con su contraseña: su cuenta vuelve a aceptar Google. */
export async function cerrarVentanaDeEntrega(usuarioId: string): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from('usuario')
      .update({ entrega_hasta: null })
      .eq('id', usuarioId)
      .not('entrega_hasta', 'is', null);
    if (error) registrar('entrega.ventana_no_cerrada', error.code);
  } catch {
    log.error('entrega.ventana_no_cerrada', {});
  }
}

/** ¿Sigue vigente la entrega? */
export function entregaVigente(entregaHasta: string | null, ahora: number = Date.now()): boolean {
  if (!entregaHasta) return false;
  const hasta = Date.parse(entregaHasta);
  return Number.isFinite(hasta) && hasta > ahora;
}

/**
 * ¿La sesión se abrió con Google después de entregar el equipo? Esas son las que no valen. Una
 * sesión de Google anterior a la entrega (la del teléfono del docente, por ejemplo) sigue
 * sirviendo, igual que cualquier sesión abierta con contraseña. Si el token no dice cuándo se usó
 * Google, se toma como posterior: el docente siempre puede entrar con su contraseña.
 */
export function googleDuranteLaEntrega(
  entregaHasta: string | null,
  entradas: readonly EntradaDeAcceso[],
  ahora: number = Date.now()
): boolean {
  if (!entregaHasta || !entregaVigente(entregaHasta, ahora)) return false;
  // Supabase expresa el momento de acceso en segundos enteros.
  const desde = Math.floor(Date.parse(entregaHasta) / 1000) - DURACION_ENTREGA_S;
  return entradas.some(
    ({ metodo, momento }) => metodo === 'oauth' && (momento === null || momento >= desde)
  );
}
