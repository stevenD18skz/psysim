'use server';

import { type ResultadoAccion } from '@/lib/acciones';
import { requerirEstudiante } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import {
  actividadSesionSchema,
  comenzarSesionSchema,
  finalizarSesionSchema,
} from '@/schemas/configuracion.schema';
import { type EstadoSesion } from '@/types';

export type { ResultadoAccion } from '@/lib/acciones';

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos del formulario.';

/*
 * Acciones del estudiante durante la simulación. La sesión la crea el canje del código de acceso
 * (src/lib/asignaciones/actions.ts); RLS solo deja al estudiante dueño comenzarla y finalizarla.
 */

/**
 * HU-16 · T02 — Cierra una sesión en curso (`estado = finalizada`). La hora de fin la asigna la
 * base de datos (trigger `sesion_asignar_fin`). El Sprint 4 (HU-19/20) añade aquí la
 * persistencia de las métricas y la redirección a los resultados.
 */
export async function finalizarSesion(
  valores: unknown
): Promise<ResultadoAccion<{ inicio: string; fin: string }>> {
  await requerirEstudiante();

  const datos = finalizarSesionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .update({ estado: 'finalizada' })
    .eq('id', datos.data.sesionId)
    .eq('estado', 'en_curso')
    .select('inicio, fin')
    .maybeSingle();

  if (error || !data?.fin) {
    if (error) console.error('[sesion] No se pudo finalizar:', error.code);
    return { ok: false, error: 'No fue posible finalizar la sesión. Inténtalo de nuevo.' };
  }

  return { ok: true, datos: { inicio: data.inicio, fin: data.fin } };
}

/**
 * HU-23 · T03 — El estudiante confirmó las instrucciones del caso: la sesión comienza. La base
 * de datos fija `inicio` con su propia hora (trigger `sesion_marcar_comienzo`), así el tiempo de
 * lectura no cuenta como duración. Es idempotente: si ya había comenzado, conserva su inicio.
 */
export async function comenzarSesion(
  valores: unknown
): Promise<ResultadoAccion<{ inicio: string }>> {
  await requerirEstudiante();

  const datos = comenzarSesionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .update({ comenzada: true })
    .eq('id', datos.data.sesionId)
    .eq('estado', 'en_curso')
    .select('inicio')
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[sesion] No se pudo comenzar:', error.code);
    return { ok: false, error: 'No fue posible comenzar la simulación. Inténtalo de nuevo.' };
  }

  return { ok: true, datos: { inicio: data.inicio } };
}

/**
 * Latido de la simulación: el estudiante sigue interactuando. La base de datos actualiza
 * `ultima_actividad` con su propia hora; si la sesión ya llevaba 10 minutos inactiva, la
 * interrumpe en ese momento. `enCurso: false` indica que la sesión ya terminó.
 */
export async function registrarActividad(
  valores: unknown
): Promise<ResultadoAccion<{ enCurso: boolean }>> {
  await requerirEstudiante();

  const datos = actividadSesionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('registrar_actividad_sesion', {
    p_sesion_id: datos.data.sesionId,
  });

  if (error) {
    console.error('[sesion] No se pudo registrar la actividad:', error.code);
    return { ok: false, error: 'No fue posible registrar la actividad.' };
  }
  return { ok: true, datos: { enCurso: data === true } };
}

/**
 * La simulación lleva 10 minutos sin interacción: la sesión pasa a `interrumpida` y su hora de
 * fin es la de la última actividad (trigger `sesion_asignar_fin`). Si el barrido de la base de
 * datos ya la había cerrado, devuelve igualmente sus horas para mostrar el resumen.
 */
export async function cerrarSesionPorInactividad(
  valores: unknown
): Promise<ResultadoAccion<{ inicio: string; fin: string; estado: EstadoSesion }>> {
  await requerirEstudiante();

  const datos = actividadSesionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data: cerrada, error } = await supabase
    .from('sesion')
    .update({ estado: 'interrumpida' })
    .eq('id', datos.data.sesionId)
    .eq('estado', 'en_curso')
    .select('inicio, fin, estado')
    .maybeSingle();

  let sesion = cerrada;
  if (!error && !sesion) {
    const { data: yaCerrada } = await supabase
      .from('sesion')
      .select('inicio, fin, estado')
      .eq('id', datos.data.sesionId)
      .neq('estado', 'en_curso')
      .maybeSingle();
    sesion = yaCerrada;
  }

  if (error || !sesion?.fin) {
    if (error) console.error('[sesion] No se pudo cerrar por inactividad:', error.code);
    return { ok: false, error: 'No fue posible cerrar la sesión. Inténtalo de nuevo.' };
  }

  return { ok: true, datos: { inicio: sesion.inicio, fin: sesion.fin, estado: sesion.estado } };
}
