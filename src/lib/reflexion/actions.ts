'use server';

import { type ResultadoAccion } from '@/lib/acciones';
import { requerirEstudiante } from '@/lib/auth/dal';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';
import { guardarReflexionSchema } from '@/schemas/reflexion.schema';

const MENSAJE_GENERICO = 'No pudimos guardar tu reflexión. Inténtalo de nuevo.';

/**
 * Guarda, corrige o retira (texto vacío) la reflexión del estudiante sobre una práctica ya
 * terminada. La función `guardar_reflexion` comprueba que la sesión es suya y que no sigue en
 * curso; su docente la lee al revisar.
 */
export async function guardarReflexion(
  valores: unknown
): Promise<ResultadoAccion<{ retirada: boolean }>> {
  await requerirEstudiante();

  const datos = guardarReflexionSchema.safeParse(valores);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? MENSAJE_GENERICO };
  }
  const { sesionId, contenido } = datos.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc('guardar_reflexion', {
    p_sesion_id: sesionId,
    p_contenido: contenido,
  });

  if (error) {
    // 55000: la práctica sigue en curso; P0002: la sesión no existe o no es suya.
    if (error.code === '55000') {
      return { ok: false, error: 'Podrás escribir tu reflexión cuando termines la práctica.' };
    }
    log.error('reflexion.no_guardada', { codigo: error.code, sesion_id: sesionId });
    return { ok: false, error: MENSAJE_GENERICO };
  }
  return { ok: true, datos: { retirada: contenido === '' } };
}
