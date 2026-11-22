import { z } from 'zod';

import { LIMITES_CHAT } from '@/schemas/npc-chat.schema';
import { type MensajeConversacion } from '@/types';

const clave = (cuentaId: string, sesionId: string) =>
  `psysim:intervencion-pendiente:${cuentaId}:${sesionId}`;
const pendienteSchema = z.object({
  id: z.uuid(),
  contenido: z.string().trim().min(1).max(LIMITES_CHAT.mensaje),
  timestamp: z.iso.datetime(),
});
const VIGENCIA_MS = 30 * 60_000;

export function leerIntervencionPendiente(
  cuentaId: string,
  sesionId: string
): MensajeConversacion | null {
  try {
    const valor = sessionStorage.getItem(clave(cuentaId, sesionId));
    if (!valor) return null;
    const pendiente = pendienteSchema.safeParse(JSON.parse(valor));
    if (!pendiente.success || Date.now() - Date.parse(pendiente.data.timestamp) > VIGENCIA_MS) {
      recordarIntervencionPendiente(cuentaId, sesionId, null);
      return null;
    }
    return { ...pendiente.data, remitente: 'estudiante', sinGuardar: true };
  } catch {
    return null;
  }
}

export function recordarIntervencionPendiente(
  cuentaId: string | undefined,
  sesionId: string,
  mensaje: MensajeConversacion | null
): void {
  if (!cuentaId) return;
  try {
    const llave = clave(cuentaId, sesionId);
    if (mensaje) {
      const { id, contenido, timestamp } = mensaje;
      sessionStorage.setItem(llave, JSON.stringify({ id, contenido, timestamp }));
    } else {
      sessionStorage.removeItem(llave);
    }
  } catch {
    // El reintento en memoria sigue disponible si el navegador no permite guardar.
  }
}

export function descartarIntervencionConfirmada(
  cuentaId: string,
  sesionId: string,
  turnosGuardados: readonly string[]
): void {
  const pendiente = leerIntervencionPendiente(cuentaId, sesionId);
  if (pendiente && turnosGuardados.includes(pendiente.id)) {
    recordarIntervencionPendiente(cuentaId, sesionId, null);
  }
}
