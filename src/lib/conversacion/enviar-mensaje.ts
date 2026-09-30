import {
  LIMITES_CHAT,
  type MensajeHistorial,
  type NpcChatRequest,
  npcChatErrorSchema,
  npcChatResponseSchema,
} from '@/schemas/npc-chat.schema';
import { type AppStore } from '@/store/app-store';
import { type MensajeConversacion } from '@/types';

export const RUTA_CHAT = '/api/npc/chat';

/**
 * Tiempo máximo que el cliente espera la respuesta: algo más que el límite del servidor (30 s),
 * para recibir su 504 controlado antes de abortar por su cuenta.
 */
export const TIEMPO_MAXIMO_CLIENTE_MS = 35_000;

export const MENSAJE_NO_DISPONIBLE = 'El paciente virtual no está disponible temporalmente.';

export type ResultadoEnvio = { ok: true } | { ok: false; motivo: string };

interface OpcionesEnvio {
  fetch?: typeof fetch;
  /** Reloj monotónico inyectable (tests). */
  ahora?: () => number;
}

function historialParaContexto(
  mensajes: readonly MensajeConversacion[],
  excluirId: string
): MensajeHistorial[] {
  return mensajes
    .filter(m => m.id !== excluirId)
    .slice(-LIMITES_CHAT.historial)
    .map(m => ({
      rol: m.remitente === 'estudiante' ? 'user' : 'assistant',
      contenido: m.contenido,
    }));
}

/**
 * HU-13 · T03 — Envía una intervención del estudiante al paciente virtual.
 *
 * 1. Pasa el NPC a `procesando` (si la transición no es válida, p. ej. un doble envío, no hace
 *    nada) y agrega el mensaje del estudiante al historial.
 * 2. Llama a /api/npc/chat con el historial previo.
 * 3. Si responde, agrega el mensaje del NPC con su latencia, acumula los tokens y pasa a
 *    `respondiendo`. Si falla, pasa a `error_comunicacion` sin tocar el historial (HU-16 · T01).
 *
 * La latencia se mide con el reloj monotónico del navegador (envío → respuesta recibida), no
 * restando horas de dos equipos distintos, que pueden estar desfasados.
 *
 * Con `reintentar`, reenvía el mensaje pendiente que falló sin duplicarlo en el historial.
 */
export async function enviarMensaje(
  store: AppStore,
  texto: string | { reintentar: true },
  { fetch: hacerFetch = fetch, ahora = () => performance.now() }: OpcionesEnvio = {}
): Promise<ResultadoEnvio> {
  const estado = store.getState();
  const sesion = estado.sesion.activa;
  if (!sesion) return { ok: false, motivo: 'No hay una sesión activa.' };

  let mensaje: MensajeConversacion;
  if (typeof texto === 'string') {
    const contenido = texto.trim();
    if (!contenido) return { ok: false, motivo: 'Escribe un mensaje.' };
    if (contenido.length > LIMITES_CHAT.mensaje) {
      return {
        ok: false,
        motivo: `El mensaje no puede superar ${LIMITES_CHAT.mensaje} caracteres.`,
      };
    }
    // Solo se envía desde `esperando_input`: bloquea dobles envíos durante `procesando`.
    if (estado.npc.estado !== 'esperando_input' || !estado.npc.actualizarEstadoNPC('procesando')) {
      return { ok: false, motivo: 'Espera la respuesta del paciente.' };
    }
    mensaje = {
      id: crypto.randomUUID(),
      remitente: 'estudiante',
      contenido,
      timestamp: new Date().toISOString(),
    };
    estado.conversacion.agregarMensaje(mensaje);
  } else {
    const pendiente = estado.conversacion.pendiente;
    if (
      !pendiente ||
      estado.npc.estado !== 'error_comunicacion' ||
      !estado.npc.actualizarEstadoNPC('procesando')
    ) {
      return { ok: false, motivo: 'No hay un mensaje para reintentar.' };
    }
    mensaje = pendiente;
  }

  const { conversacion } = store.getState();
  conversacion.establecerPendiente(mensaje);
  conversacion.establecerError(null);

  const cuerpo: NpcChatRequest = {
    sesion_id: sesion.id,
    npc_id: sesion.npc.id,
    mensaje_usuario: mensaje.contenido,
    historial: historialParaContexto(conversacion.mensajes, mensaje.id),
  };

  const fallar = (motivo: string): ResultadoEnvio => {
    const actual = store.getState();
    actual.conversacion.establecerError(motivo);
    actual.npc.actualizarEstadoNPC('error_comunicacion');
    return { ok: false, motivo };
  };

  const inicio = ahora();
  let respuesta: Response;
  try {
    respuesta = await hacerFetch(RUTA_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_CLIENTE_MS),
    });
  } catch {
    return fallar(MENSAJE_NO_DISPONIBLE);
  }
  const latencia = Math.max(0, Math.round(ahora() - inicio));

  const json: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = npcChatErrorSchema.safeParse(json);
    const detalle = error.success ? error.data.error : null;
    return fallar(respuesta.status === 401 && detalle ? detalle : MENSAJE_NO_DISPONIBLE);
  }

  const datos = npcChatResponseSchema.safeParse(json);
  if (!datos.success) return fallar(MENSAJE_NO_DISPONIBLE);

  const final = store.getState();
  final.conversacion.agregarMensaje({
    id: crypto.randomUUID(),
    remitente: 'npc',
    contenido: datos.data.respuesta_npc,
    timestamp: datos.data.timestamp_respuesta,
    latencia_ms: latencia,
  });
  final.metricas.registrarTokens(datos.data.tokens_entrada, datos.data.tokens_salida);
  final.conversacion.establecerPendiente(null);
  final.npc.actualizarEstadoNPC('respondiendo');
  return { ok: true };
}
