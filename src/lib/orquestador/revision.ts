import 'server-only';

import { esMotivoCierre, type IaDeSesion } from '@/lib/conversacion/cierre';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Severidad de cada respuesta del paciente y motivo del cierre automático, si lo hubo. El
 * estudiante no puede leer estas tablas; el docente las ve a través del servidor: llamar solo con
 * una práctica que ya pasó por RLS con el cliente del docente.
 *
 * Es información de apoyo: si no se puede leer, la revisión funciona sin ella (`null`).
 */
export async function obtenerIaDeSesion(sesionId: string): Promise<IaDeSesion | null> {
  try {
    const admin = createAdminClient();
    const [sesion, mensajes] = await Promise.all([
      admin.from('sesion_ia').select('cierre_motivo').eq('sesion_id', sesionId).maybeSingle(),
      admin
        .from('mensaje_ia')
        .select('mensaje_id, severidad')
        .eq('sesion_id', sesionId)
        .not('severidad', 'is', null),
    ]);
    if (sesion.error || mensajes.error) {
      throw new Error('No pudimos leer los datos de la IA.', {
        cause: sesion.error ?? mensajes.error,
      });
    }

    const motivo = sesion.data?.cierre_motivo;
    const cierre = esMotivoCierre(motivo) ? motivo : null;
    const severidades: Record<string, number> = {};
    for (const { mensaje_id, severidad } of mensajes.data) {
      if (severidad !== null) severidades[mensaje_id] = severidad;
    }
    if (!cierre && Object.keys(severidades).length === 0) return null;
    return { cierre, severidades };
  } catch {
    log.warn('orquestador.revision_no_leida', { sesion_id: sesionId });
    return null;
  }
}
