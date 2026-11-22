'use server';

import { CODIGO_PG, type ResultadoAccion } from '@/lib/acciones';
import { requerirDocente } from '@/lib/auth/dal';
import { log } from '@/lib/log';
import { cerrarDespues } from '@/lib/orquestador/diferido';
import { createClient } from '@/lib/supabase/server';
import { type Anotacion, type Retroalimentacion } from '@/types';
import {
  actualizarAnotacionSchema,
  crearAnotacionSchema,
  guardarRetroalimentacionSchema,
  idAnotacionSchema,
  idSesionSchema,
} from '@/schemas/retroalimentacion.schema';

/*
 * Revisión del docente: retroalimentación general, nota y frases subrayadas con comentarios.
 * RLS limita todo a las sesiones propias que ya terminaron; los triggers fechan la publicación y
 * validan que cada subrayado caiga en una intervención del estudiante sin solaparse con otro.
 */

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos de la retroalimentación.';
const MENSAJE_GENERICO = 'No pudimos guardar la retroalimentación. Inténtalo de nuevo.';
const MENSAJE_EN_CURSO =
  'La práctica sigue en curso: podrás revisarla cuando el estudiante termine.';

function errorDeGuardado(codigo: string | undefined): string {
  if (codigo === CODIGO_PG.INSUFFICIENT_PRIVILEGE) return MENSAJE_EN_CURSO;
  log.error('retroalimentacion.no_guardada', { codigo });
  return MENSAJE_GENERICO;
}

/** Guarda según la intención y la versión que tenía abierta el docente. */
export async function guardarRetroalimentacion(
  valores: unknown
): Promise<
  ResultadoAccion<{ conflicto: boolean; revision: Omit<Retroalimentacion, 'anotaciones'> }>
> {
  await requerirDocente();

  const datos = guardarRetroalimentacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_DATOS_INVALIDOS };
  }
  const { sesionId, modo, version, comentarioGeneral, nota } = datos.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('guardar_revision', {
      p_sesion_id: sesionId,
      p_modo: modo,
      p_version: version,
      p_comentario: comentarioGeneral,
      p_nota: nota,
    })
    .single();
  if (error || !data) return { ok: false, error: errorDeGuardado(error?.code) };

  return {
    ok: true,
    datos: {
      conflicto: data.resultado === 'conflicto',
      revision: {
        comentarioGeneral: data.comentario_general,
        nota: data.nota,
        publicadaEn: data.publicada_en,
        actualizadoEn: data.actualizado_en,
      },
    },
  };
}

/** Subraya una frase de una intervención del estudiante y la comenta. */
export async function crearAnotacion(valores: unknown): Promise<ResultadoAccion<Anotacion>> {
  await requerirDocente();

  const datos = crearAnotacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_DATOS_INVALIDOS };
  }
  const { id, sesionId, mensajeId, inicio, fin, comentario } = datos.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('crear_anotacion_revision', {
      p_id: id,
      p_sesion_id: sesionId,
      p_mensaje_id: mensajeId,
      p_inicio: inicio,
      p_fin: fin,
      p_comentario: comentario,
    })
    .single();

  if (error || !data) {
    if (error?.code === CODIGO_PG.EXCLUSION_VIOLATION) {
      return { ok: false, error: 'Ese fragmento se cruza con otro comentario. Elige otro.' };
    }
    if (error?.code === CODIGO_PG.CHECK_VIOLATION) {
      return { ok: false, error: 'Solo puedes subrayar las intervenciones del estudiante.' };
    }
    if (error?.code === CODIGO_PG.INSUFFICIENT_PRIVILEGE) {
      return { ok: false, error: MENSAJE_EN_CURSO };
    }
    log.error('anotacion.no_creada', { codigo: error?.code });
    return { ok: false, error: 'No pudimos guardar el comentario. Inténtalo de nuevo.' };
  }

  return {
    ok: true,
    datos: {
      id: data.id,
      mensajeId: data.mensaje_id,
      inicio: data.inicio,
      fin: data.fin,
      fragmento: data.fragmento,
      comentario: data.comentario,
    },
  };
}

/** Cambia el comentario de una frase subrayada. */
export async function actualizarAnotacion(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = actualizarAnotacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('anotacion')
    .update({ comentario: datos.data.comentario })
    .eq('id', datos.data.id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    if (error) log.error('anotacion.no_actualizada', { codigo: error.code });
    return { ok: false, error: 'No pudimos guardar el comentario. Inténtalo de nuevo.' };
  }
  return { ok: true, datos: { id: data.id } };
}

/** Quita el subrayado y su comentario. */
export async function eliminarAnotacion(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = idAnotacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('anotacion').delete().eq('id', datos.data.id);
  if (error) {
    log.error('anotacion.no_eliminada', { codigo: error.code });
    return { ok: false, error: 'No pudimos quitar el comentario. Inténtalo de nuevo.' };
  }
  return { ok: true, datos: { id: datos.data.id } };
}

/**
 * El docente da por interrumpida una sesión que el estudiante dejó abierta y no terminó. Después
 * puede revisarla igual que una finalizada.
 */
export async function interrumpirSesion(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = idSesionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .update({ estado: 'interrumpida' })
    .eq('id', datos.data.sesionId)
    .eq('estado', 'en_curso')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    if (error) log.error('sesion.no_interrumpida', { codigo: error.code });
    return { ok: false, error: 'La práctica ya no está en curso. Recarga la página.' };
  }
  cerrarDespues(data.id);
  return { ok: true, datos: { id: data.id } };
}
