import { type IntensidadEmocion } from '@/lib/conversacion/emociones';
import { crearLectorSse } from '@/lib/sse';
import {
  type EventoChat,
  eventoChatSchema,
  LIMITES_CHAT,
  type NpcChatRequest,
  npcChatErrorSchema,
  type NpcChatResponse,
  npcChatResponseSchema,
} from '@/schemas/npc-chat.schema';
import { type AppStore } from '@/store/app-store';
import { type MensajeConversacion } from '@/types';

export const RUTA_CHAT = '/api/npc/chat';

/**
 * Tiempo máximo que el cliente espera la respuesta completa: algo más que el límite del servidor
 * (60 s), para recibir su error controlado antes de abortar por su cuenta.
 */
export const TIEMPO_MAXIMO_CLIENTE_MS = 65_000;

export const MENSAJE_NO_DISPONIBLE = 'El paciente no está disponible por ahora.';

/** Caracteres de la respuesta que se esperan antes de mostrar la burbuja del paciente. */
export const MINIMO_PARA_EMPEZAR = 24;

export type ResultadoEnvio = { ok: true } | { ok: false; motivo: string };

interface OpcionesEnvio {
  fetch?: typeof fetch;
  /** Reloj monotónico inyectable (tests). */
  ahora?: () => number;
}

/**
 * La sesión vencida (401), la práctica ya terminada (409) y los límites (429) tienen un aviso
 * propio: con el genérico, el estudiante reintentaría algo que no puede funcionar.
 */
const mensajeDeError = (status: number, detalle: string | null) =>
  [401, 409, 429].includes(status) && detalle ? detalle : MENSAJE_NO_DISPONIBLE;

/** Lee la respuesta por partes del servidor (Server-Sent Events) y entrega sus eventos válidos. */
async function* leerEventos(
  cuerpo: ReadableStream<Uint8Array>
): AsyncGenerator<EventoChat, void, void> {
  const lector = crearLectorSse();
  const decodificador = new TextDecoder();
  const flujo = cuerpo.getReader();
  try {
    for (;;) {
      const { value, done } = await flujo.read();
      if (done) return;
      for (const { evento, datos } of lector.alimentar(
        decodificador.decode(value, { stream: true })
      )) {
        let json: unknown;
        try {
          json = JSON.parse(datos);
        } catch {
          continue;
        }
        if (typeof json !== 'object' || json === null) continue;
        const valido = eventoChatSchema.safeParse({ ...json, tipo: evento });
        if (valido.success) yield valido.data;
      }
    }
  } finally {
    await flujo.cancel().catch(() => undefined);
  }
}

/**
 * HU-13 · T03 — Envía una intervención del estudiante al paciente.
 *
 * 1. Pasa el NPC a `procesando` (si la transición no es válida, p. ej. un doble envío, no hace
 *    nada) y agrega el mensaje del estudiante al historial.
 * 2. Llama a /api/npc/chat con el mensaje: el servidor arma el contexto con lo que guardó.
 * 3. La respuesta llega por partes: con el primer fragmento aparece la burbuja del paciente y el
 *    NPC pasa a `respondiendo`; al completarse se reemplaza por el texto guardado, con su latencia
 *    y sus tokens. Si el servidor responde un JSON completo, se trata igual, de una vez. Si falla,
 *    pasa a `error_comunicacion` y lo que hubiera llegado se quita (HU-16 · T01).
 *
 * La latencia se mide con el reloj monotónico del navegador (envío → respuesta completa), no
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
  if (!sesion) return { ok: false, motivo: 'No hay una práctica abierta. Vuelve a Mis prácticas.' };
  if (estado.conversacion.cierre) return { ok: false, motivo: 'La práctica ya terminó.' };

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
      sinGuardar: true,
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
  conversacion.establecerEspera(null);
  const enviadoEn = Date.now();

  const cuerpo: NpcChatRequest = {
    sesion_id: sesion.id,
    npc_id: sesion.npc.id,
    mensaje_usuario: mensaje.contenido,
    por_partes: true,
    // Si la respuesta anterior se perdió después de guardarse, el servidor devuelve la guardada en
    // lugar de duplicar el intercambio.
    ...(typeof texto === 'string' ? {} : { reintento: true }),
  };

  // La respuesta puede llegar cuando el estudiante ya salió o abrió otra práctica (el store vive en
  // el layout y sobrevive a la navegación): si la práctica abierta ya no es la del envío, se descarta
  // para no duplicar la burbuja que el historial del servidor ya trae ni mezclar conversaciones.
  const DESCARTADA: ResultadoEnvio = { ok: false, motivo: 'La práctica ya no está abierta.' };
  const sigueAbierta = () => store.getState().sesion.activa === sesion;

  /** Id local de la burbuja del paciente mientras su respuesta llega por partes. */
  let idRespuesta: string | null = null;

  const fallar = (motivo: string): ResultadoEnvio => {
    if (!sigueAbierta()) return DESCARTADA;
    const actual = store.getState();
    // Lo que alcanzó a llegar no se guardó: se quita para que el reintento empiece limpio.
    if (idRespuesta) actual.conversacion.quitarMensaje(idRespuesta);
    actual.conversacion.establecerEspera(null);
    actual.conversacion.establecerError(motivo);
    actual.npc.actualizarEstadoNPC('error_comunicacion');
    return { ok: false, motivo };
  };

  const inicio = ahora();

  /** La respuesta completa y guardada: cierra el turno. */
  const completar = (datos: NpcChatResponse): ResultadoEnvio => {
    if (!sigueAbierta()) return DESCARTADA;
    const final = store.getState();
    const campos = {
      contenido: datos.respuesta_npc,
      timestamp: datos.timestamp_respuesta,
      latencia_ms: Math.max(0, Math.round(ahora() - inicio)),
      ...(datos.emocion_npc && { emocion: datos.emocion_npc }),
      ...(datos.intensidad_npc && { intensidad: datos.intensidad_npc as IntensidadEmocion }),
    };
    if (idRespuesta) {
      final.conversacion.actualizarMensaje(idRespuesta, { ...campos, enCurso: false });
    } else {
      idRespuesta = crypto.randomUUID();
      final.conversacion.agregarMensaje({
        id: idRespuesta,
        remitente: 'npc',
        sinGuardar: true,
        ...campos,
      });
    }
    // Con los ids de la base de datos se puede volver a este momento para ensayar otra respuesta.
    final.conversacion.confirmarGuardado({
      [mensaje.id]: datos.id_mensaje_estudiante,
      [idRespuesta]: datos.id_mensaje_npc,
    });
    final.metricas.registrarTokens(datos.tokens_entrada, datos.tokens_salida);
    final.conversacion.establecerPendiente(null);
    final.conversacion.establecerEspera(null);
    if (datos.cierre) final.conversacion.establecerCierre(datos.cierre);
    final.npc.actualizarEstadoNPC('respondiendo');
    return { ok: true };
  };

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

  const porPartes =
    respuesta.ok &&
    respuesta.body !== null &&
    (respuesta.headers.get('Content-Type') ?? '').includes('text/event-stream');
  if (!porPartes) {
    const json: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      const error = npcChatErrorSchema.safeParse(json);
      return fallar(mensajeDeError(respuesta.status, error.success ? error.data.error : null));
    }
    const datos = npcChatResponseSchema.safeParse(json);
    return datos.success ? completar(datos.data) : fallar(MENSAJE_NO_DISPONIBLE);
  }

  // La emoción suele llegar antes que el texto: se guarda hasta que exista la burbuja.
  let emocion: Pick<MensajeConversacion, 'emocion' | 'intensidad'> = {};
  let inicioRespuesta = '';
  try {
    for await (const evento of leerEventos(respuesta.body!)) {
      if (!sigueAbierta()) return DESCARTADA;
      const actual = store.getState();
      if (evento.tipo === 'espera') {
        actual.conversacion.establecerEspera({
          desde: enviadoEn,
          hasta: Date.now() + evento.segundos * 1000,
        });
      } else if (evento.tipo === 'emocion') {
        emocion = {
          emocion: evento.emocion,
          ...(evento.intensidad && { intensidad: evento.intensidad as IntensidadEmocion }),
        };
        if (idRespuesta) actual.conversacion.actualizarMensaje(idRespuesta, emocion);
      } else if (evento.tipo === 'fragmento') {
        if (idRespuesta) {
          actual.conversacion.ampliarMensaje(idRespuesta, evento.texto);
          continue;
        }
        // El paciente toma la palabra cuando ya se conocen sus primeras palabras: de ellas sale
        // su gesto al responder (asentir, negar) y el arranque de su voz.
        inicioRespuesta += evento.texto;
        if (inicioRespuesta.trim().length < MINIMO_PARA_EMPEZAR) continue;
        idRespuesta = crypto.randomUUID();
        actual.conversacion.establecerEspera(null);
        actual.conversacion.agregarMensaje({
          id: idRespuesta,
          remitente: 'npc',
          contenido: inicioRespuesta,
          timestamp: new Date().toISOString(),
          sinGuardar: true,
          enCurso: true,
          ...emocion,
        });
        actual.npc.actualizarEstadoNPC('respondiendo');
      } else if (evento.tipo === 'reinicio') {
        // Otro proveedor responde desde cero: lo mostrado hasta ahora se borra.
        inicioRespuesta = '';
        if (idRespuesta) actual.conversacion.actualizarMensaje(idRespuesta, { contenido: '' });
      } else if (evento.tipo === 'fin') {
        return completar(evento.respuesta);
      } else {
        return fallar(mensajeDeError(evento.status, evento.error));
      }
    }
  } catch {
    // La conexión se cortó o se agotó el tiempo a mitad de la respuesta.
    return fallar(MENSAJE_NO_DISPONIBLE);
  }
  // El flujo terminó sin `fin`: la respuesta quedó incompleta.
  return fallar(MENSAJE_NO_DISPONIBLE);
}
