import 'server-only';

import { type SupabaseClient } from '@supabase/supabase-js';

import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';
import { type Database } from '@/types/database.types';

import { terminoPorTiempo, type TiempoConsulta } from './tiempo-consulta';

type Cliente = SupabaseClient<Database>;

/**
 * Cuánto lleva la consulta de una práctica, según el reloj de la base de datos
 * (`tiempo_de_consulta`). Se llama con el cliente del usuario: RLS decide si puede verla.
 *
 * Devuelve `null` si no se pudo leer. El tiempo de consulta es un marco de la práctica, no una
 * condición para conversar: si falla la lectura, la práctica sigue sin él y queda en el registro.
 */
export async function leerTiempoDeConsulta(
  supabase: Cliente,
  sesionId: string
): Promise<TiempoConsulta | null> {
  try {
    const { data, error } = await supabase.rpc('tiempo_de_consulta', { p_sesion_id: sesionId });
    if (error) {
      log.error('practica.tiempo_no_leido', { codigo: error.code, sesion_id: sesionId });
      return null;
    }
    const fila = Array.isArray(data) ? data[0] : null;
    if (!fila || !Number.isInteger(fila.duracion_s) || fila.duracion_s <= 0) return null;
    return { duracionS: fila.duracion_s, transcurridoS: fila.transcurrido_s ?? null };
  } catch {
    log.error('practica.tiempo_no_leido', { sesion_id: sesionId });
    return null;
  }
}

/**
 * Se cumplieron el tiempo de la consulta y su margen, y el estudiante intentó seguir: la práctica
 * termina aquí, en el servidor, con el motivo neutro. Antes dependía de que el navegador avisara;
 * si la pestaña se cerraba, quedaba `interrumpida` y sin el motivo.
 *
 * Llamar solo con una práctica que ya pasó por RLS y cuyo tiempo midió la base de datos. Escribe
 * con la clave secreta porque el estudiante no puede escribir `fin_motivo`. No lanza: si falla, la
 * práctica sigue en curso y el navegador la termina por el camino de siempre.
 */
export async function terminarPorTiempo(sesionId: string): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from('sesion')
      .update({ estado: 'finalizada', fin_motivo: 'tiempo' })
      .eq('id', sesionId)
      .eq('estado', 'en_curso')
      .select('id');
    if (error) throw new Error('No pudimos terminar la práctica.', { cause: error });
    if (data.length > 0) log.info('practica.termino_por_tiempo', { sesion_id: sesionId });
    return data.length > 0;
  } catch {
    log.warn('practica.no_terminada_por_tiempo', { sesion_id: sesionId });
    return false;
  }
}

/**
 * La práctica acaba de terminar: si fue al cumplirse el tiempo de la consulta y su margen, lo
 * anota (`sesion.fin_motivo = 'tiempo'`) para que el docente lo vea en la transcripción. Es un
 * dato neutro: no es un error ni una falta del estudiante.
 *
 * Se decide con dos horas de la base de datos (inicio de la consulta y fin de la práctica), leídas
 * con el cliente del usuario (RLS demuestra que la práctica es suya); solo entonces se escribe con
 * la clave secreta, porque el estudiante no puede escribir esa columna. No lanza.
 */
export async function anotarFinPorTiempo(supabase: Cliente, sesionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('sesion')
      .select('estado, fin, consulta_inicio, duracion_minutos, fin_motivo')
      .eq('id', sesionId)
      .maybeSingle();
    if (error) throw new Error('No pudimos leer la práctica.', { cause: error });
    if (!data || data.estado !== 'finalizada' || data.fin_motivo) return false;
    const porTiempo = terminoPorTiempo({
      consultaInicio: data.consulta_inicio,
      fin: data.fin,
      duracionMinutos: data.duracion_minutos,
    });
    if (!porTiempo) return false;

    const { error: errorEscritura } = await createAdminClient()
      .from('sesion')
      .update({ fin_motivo: 'tiempo' })
      .eq('id', sesionId)
      .eq('estado', 'finalizada');
    if (errorEscritura) throw new Error('No pudimos anotar el motivo.', { cause: errorEscritura });
    log.info('practica.termino_por_tiempo', { sesion_id: sesionId });
    return true;
  } catch {
    log.warn('practica.fin_por_tiempo_no_anotado', { sesion_id: sesionId });
    return false;
  }
}
