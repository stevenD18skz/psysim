'use server';

import { requerirDocente } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import {
  eliminarConfiguracionSchema,
  guardarConfiguracionSchema,
  iniciarSimulacionSchema,
} from '@/schemas/configuracion.schema';
import { type ConfiguracionGuardada } from '@/types';

export type ResultadoAccion<T> = { ok: true; datos: T } | { ok: false; error: string };

const MENSAJE_DATOS_INVALIDOS = 'Revisa los datos del formulario.';

/** Código de PostgreSQL para violaciones de unicidad. */
const UNIQUE_VIOLATION = '23505';
/** Código de PostgreSQL para violaciones de clave foránea (p. ej. escenario inexistente). */
const FOREIGN_KEY_VIOLATION = '23503';
/** Código de PostgREST/PostgreSQL cuando RLS rechaza la fila. */
const INSUFFICIENT_PRIVILEGE = '42501';

/**
 * HU-06 · T04 — Crea el registro de la sesión de simulación (`estado = en_curso`).
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .insert({
      escenario_id: datos.data.escenarioId,
      codigo_estudiante: datos.data.codigoEstudiante,
      nombre_estudiante: datos.data.nombreEstudiante,
      prompt_sistema: datos.data.promptSistema,
    })
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

/** HU-07 · T02 — Guarda la configuración actual con un nombre elegido por el docente. */
export async function guardarConfiguracion(
  valores: unknown
): Promise<ResultadoAccion<ConfiguracionGuardada>> {
  await requerirDocente();

  const datos = guardarConfiguracionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('configuracion_guardada')
    .insert({
      escenario_id: datos.data.escenarioId,
      nombre_configuracion: datos.data.nombre,
      prompt_personalizado: datos.data.promptPersonalizado,
    })
    .select('id, nombre_configuracion, escenario_id, prompt_personalizado, creado_en')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, error: 'Ya tienes una configuración con ese nombre.' };
    }
    console.error('[configuracion] No se pudo guardar:', error.code);
    return { ok: false, error: 'No fue posible guardar la configuración. Inténtalo de nuevo.' };
  }

  return {
    ok: true,
    datos: {
      id: data.id,
      nombre: data.nombre_configuracion,
      escenarioId: data.escenario_id,
      promptPersonalizado: data.prompt_personalizado,
      creadoEn: data.creado_en,
    },
  };
}

/** Elimina una configuración guardada del docente. RLS impide borrar las de otros. */
export async function eliminarConfiguracion(
  valores: unknown
): Promise<ResultadoAccion<{ id: string }>> {
  await requerirDocente();

  const datos = eliminarConfiguracionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: MENSAJE_DATOS_INVALIDOS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('configuracion_guardada')
    .delete()
    .eq('id', datos.data.id)
    .select('id');

  if (error || data.length === 0) {
    if (error && error.code !== INSUFFICIENT_PRIVILEGE) {
      console.error('[configuracion] No se pudo eliminar:', error.code);
    }
    return { ok: false, error: 'No fue posible eliminar la configuración.' };
  }

  return { ok: true, datos: { id: datos.data.id } };
}
