'use server';

import { requerirDocente } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { type TablesInsert } from '@/types/database.types';
import {
  comenzarSesionSchema,
  finalizarSesionSchema,
  iniciarSimulacionSchema,
} from '@/schemas/configuracion.schema';

export type ResultadoAccion<T> = { ok: true; datos: T } | { ok: false; error: string };

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos del formulario.';

/** Código de PostgreSQL para violaciones de clave foránea (p. ej. escenario inexistente). */
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * HU-06 · T04 — Crea el registro de la sesión de simulación (`estado = en_curso`). Si el
 * estudiante es nuevo, queda registrado; si ya existía, la sesión se suma a su historial.
 *
 * El `usuario_id` lo asigna la base de datos (`default auth.uid()`) y RLS impide crear
 * sesiones a nombre de otro docente. El prompt enviado se guarda como copia en la sesión.
 */
export async function iniciarSimulacion(
  valores: unknown
): Promise<ResultadoAccion<{ sesionId: string }>> {
  await requerirDocente();

  const datos = iniciarSimulacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  // `estudiante_id` no se envía: el trigger `sesion_registrar_estudiante` registra (o reconoce)
  // al estudiante por su código y enlaza la sesión en la misma inserción.
  const fila: Omit<TablesInsert<'sesion'>, 'estudiante_id'> = {
    escenario_id: datos.data.escenarioId,
    codigo_estudiante: datos.data.codigoEstudiante,
    nombre_estudiante: datos.data.nombreEstudiante,
    prompt_sistema: datos.data.promptSistema,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .insert(fila as TablesInsert<'sesion'>)
    .select('id')
    .single();

  if (error) {
    console.error('[sesion] No se pudo crear la sesión:', error.code);
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { ok: false, error: 'El escenario seleccionado ya no está disponible.' };
    }
    return { ok: false, error: 'No fue posible iniciar la simulación. Inténtalo de nuevo.' };
  }

  return { ok: true, datos: { sesionId: data.id } };
}

/**
 * HU-16 · T02 — Cierra una sesión en curso (`estado = finalizada`). La hora de fin la asigna la
 * base de datos (trigger `sesion_asignar_fin`). El Sprint 4 (HU-19/20) añade aquí la
 * persistencia de las métricas y la redirección a los resultados.
 */
export async function finalizarSesion(
  valores: unknown
): Promise<ResultadoAccion<{ inicio: string; fin: string }>> {
  await requerirDocente();

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
  await requerirDocente();

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
