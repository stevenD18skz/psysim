'use server';

import { CODIGO_PG, type ResultadoAccion } from '@/lib/acciones';
import { requerirDocente } from '@/lib/auth/dal';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';
import { type Anotacion } from '@/types';
import { type TablesUpdate } from '@/types/database.types';
import {
  actualizarAnotacionSchema,
  crearAnotacionSchema,
  guardarRetroalimentacionSchema,
  idAnotacionSchema,
  idSesionSchema,
  publicarRetroalimentacionSchema,
} from '@/schemas/retroalimentacion.schema';

/*
 * Revisión del docente: retroalimentación general, nota y frases subrayadas con comentarios.
 * RLS limita todo a las sesiones propias que ya terminaron; los triggers fechan la publicación y
 * validan que cada subrayado caiga en una intervención del estudiante sin solaparse con otro.
 */

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos de la retroalimentación.';
const MENSAJE_GENERICO = 'No fue posible guardar la retroalimentación. Inténtalo de nuevo.';
const MENSAJE_EN_CURSO = 'La sesión sigue en curso: podrás revisarla cuando el estudiante termine.';

type Cliente = Awaited<ReturnType<typeof createClient>>;
type CambiosRetroalimentacion = Omit<TablesUpdate<'retroalimentacion'>, 'sesion_id' | 'docente_id'>;

/**
 * Crea la retroalimentación de la sesión o actualiza la existente. No se usa `upsert`: PostgREST
 * reescribiría también `sesion_id`, que el docente no puede actualizar.
 */
async function guardarFila(supabase: Cliente, sesionId: string, cambios: CambiosRetroalimentacion) {
  const { data: existente, error: errorLectura } = await supabase
    .from('retroalimentacion')
    .select('sesion_id')
    .eq('sesion_id', sesionId)
    .maybeSingle();
  if (errorLectura) return { data: null, error: errorLectura };

  const columnas = 'publicada_en, actualizado_en';
  if (!existente) {
    return supabase
      .from('retroalimentacion')
      .insert({ sesion_id: sesionId, ...cambios })
      .select(columnas)
      .single();
  }
  // Sin cambios (p. ej. antes de una anotación) basta con saber que existe.
  if (Object.keys(cambios).length === 0) {
    return supabase.from('retroalimentacion').select(columnas).eq('sesion_id', sesionId).single();
  }
  return supabase
    .from('retroalimentacion')
    .update(cambios)
    .eq('sesion_id', sesionId)
    .select(columnas)
    .single();
}

function errorDeGuardado(codigo: string | undefined): string {
  if (codigo === CODIGO_PG.INSUFFICIENT_PRIVILEGE) return MENSAJE_EN_CURSO;
  log.error('retroalimentacion.no_guardada', { codigo });
  return MENSAJE_GENERICO;
}

/** Guarda el borrador (el estudiante aún no lo ve; si ya estaba publicada, lo ve actualizado). */
export async function guardarRetroalimentacion(
  valores: unknown
): Promise<ResultadoAccion<{ publicadaEn: string | null; actualizadoEn: string }>> {
  await requerirDocente();

  const datos = guardarRetroalimentacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_DATOS_INVALIDOS };
  }
  const { sesionId, comentarioGeneral, nota } = datos.data;

  const supabase = await createClient();
  const { data, error } = await guardarFila(supabase, sesionId, {
    comentario_general: comentarioGeneral,
    nota,
  });
  if (error || !data) return { ok: false, error: errorDeGuardado(error?.code) };

  return {
    ok: true,
    datos: { publicadaEn: data.publicada_en, actualizadoEn: data.actualizado_en },
  };
}

/** Publica la retroalimentación: desde ese momento el estudiante la ve en su panel. */
export async function publicarRetroalimentacion(
  valores: unknown
): Promise<ResultadoAccion<{ publicadaEn: string; actualizadoEn: string }>> {
  await requerirDocente();

  const datos = publicarRetroalimentacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_DATOS_INVALIDOS };
  }
  const { sesionId, comentarioGeneral, nota } = datos.data;

  // La hora real la fija el trigger `retroalimentacion_preparar`.
  const supabase = await createClient();
  const { data, error } = await guardarFila(supabase, sesionId, {
    comentario_general: comentarioGeneral,
    nota,
    publicada_en: new Date().toISOString(),
  });
  if (error || !data?.publicada_en) return { ok: false, error: errorDeGuardado(error?.code) };

  return {
    ok: true,
    datos: { publicadaEn: data.publicada_en, actualizadoEn: data.actualizado_en },
  };
}

/** Subraya una frase de una intervención del estudiante y la comenta. */
export async function crearAnotacion(valores: unknown): Promise<ResultadoAccion<Anotacion>> {
  await requerirDocente();

  const datos = crearAnotacionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_DATOS_INVALIDOS };
  }
  const { sesionId, mensajeId, inicio, fin, comentario } = datos.data;

  const supabase = await createClient();
  // Las anotaciones cuelgan de la retroalimentación: se crea vacía si aún no existe.
  const { error: errorRetro } = await guardarFila(supabase, sesionId, {});
  if (errorRetro) return { ok: false, error: errorDeGuardado(errorRetro.code) };

  const { data, error } = await supabase
    .from('anotacion')
    // `fragmento` no se envía: lo calcula el trigger `anotacion_validar` a partir del mensaje.
    .insert({ sesion_id: sesionId, mensaje_id: mensajeId, inicio, fin, comentario })
    .select('id, mensaje_id, inicio, fin, fragmento, comentario')
    .single();

  if (error) {
    if (error.code === CODIGO_PG.EXCLUSION_VIOLATION) {
      return { ok: false, error: 'Ese fragmento se cruza con otro comentario. Elige otro.' };
    }
    if (error.code === CODIGO_PG.CHECK_VIOLATION) {
      return { ok: false, error: 'Solo puedes subrayar las intervenciones del estudiante.' };
    }
    log.error('anotacion.no_creada', { codigo: error.code });
    return { ok: false, error: 'No fue posible guardar el comentario. Inténtalo de nuevo.' };
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
    return { ok: false, error: 'No fue posible guardar el comentario. Inténtalo de nuevo.' };
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
    return { ok: false, error: 'No fue posible quitar el comentario. Inténtalo de nuevo.' };
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
    return { ok: false, error: 'La sesión ya no está en curso. Recarga la página.' };
  }
  return { ok: true, datos: { id: data.id } };
}
