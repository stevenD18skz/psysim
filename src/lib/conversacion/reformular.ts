import { sePuedeReformular } from '@/lib/conversacion/intentos';
import { reformularIntervencion } from '@/lib/escenarios/actions';
import { type AppStore } from '@/store/app-store';

export type ResultadoReformular = { ok: true; texto: string } | { ok: false; motivo: string };

/**
 * Ensayar otra respuesta: vuelve a una intervención del estudiante. El servidor marca esa
 * intervención y lo que vino después como descartados (el docente los verá) y, si lo logra, el
 * historial local se recorta hasta ese punto. Devuelve el texto de la intervención para que el
 * estudiante lo reformule. Solo se puede mientras el paciente espera (nunca con una respuesta en
 * camino).
 */
export async function reformularDesde(
  store: AppStore,
  mensajeId: string,
  accion: typeof reformularIntervencion = reformularIntervencion
): Promise<ResultadoReformular> {
  const estado = store.getState();
  const mensaje = estado.conversacion.mensajes.find(m => m.id === mensajeId);
  if (!mensaje || !sePuedeReformular(mensaje)) {
    return { ok: false, motivo: 'No se puede volver a esa intervención.' };
  }
  if (estado.npc.estado !== 'esperando_input') {
    return { ok: false, motivo: 'Espera a que el paciente termine de responder.' };
  }

  let resultado: Awaited<ReturnType<typeof reformularIntervencion>>;
  try {
    resultado = await accion({ mensajeId });
  } catch {
    return {
      ok: false,
      motivo: 'No pudimos volver a ese momento. Tu conversación sigue igual; inténtalo de nuevo.',
    };
  }
  if (!resultado.ok) return { ok: false, motivo: resultado.error };

  store.getState().conversacion.volverA(mensajeId);
  return { ok: true, texto: mensaje.contenido };
}
