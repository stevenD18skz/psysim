import 'server-only';

import { log } from '@/lib/log';
import { mensajeConsultorioOcupado } from '@/lib/orquestador/cuentas';
import { createAdminClient } from '@/lib/supabase/admin';
import { type EventoChat, type NpcChatResponse } from '@/schemas/npc-chat.schema';

import { MAX_INTERVENCIONES_POR_SESION } from './historial';
import { ErrorIA, type TipoErrorIA } from './paciente';
import { type RespuestaProcesada } from './procesar';
import { transmitirTurno, type TurnoPaciente } from './turno';

export const mensajeTope = () =>
  `Llegaste al máximo de ${MAX_INTERVENCIONES_POR_SESION} intervenciones en esta práctica. Termínala para que tu docente la revise.`;

export const MENSAJE_PRACTICA_TERMINADA = 'La práctica ya terminó.';

/** Segundos que se sugieren antes de volver a intentar empezar con el consultorio lleno. */
const ESPERA_CONSULTORIO_S = 120;

type ErrorDeChat = Extract<EventoChat, { tipo: 'error' }>;

const fallo = (status: number, error: string, espera_s?: number): ErrorDeChat => ({
  tipo: 'error',
  status,
  error,
  ...(espera_s ? { espera_s } : {}),
});

/** HU-16 · T01 — Código HTTP y mensaje para cada tipo de fallo de la IA (sin detalles internos). */
const ERRORES_IA: Record<
  Exclude<TipoErrorIA, 'espera_del_paciente' | 'consultorio_ocupado'>,
  { status: number; mensaje: string }
> = {
  tiempo_agotado: { status: 504, mensaje: 'El paciente tardó demasiado en responder.' },
  autenticacion: { status: 502, mensaje: 'El servicio de IA no está disponible.' },
  limite: { status: 503, mensaje: 'El servicio de IA está saturado. Inténtalo en unos segundos.' },
  respuesta_invalida: {
    status: 502,
    mensaje: 'El servicio de IA devolvió una respuesta inválida.',
  },
  // Al estudiante no le explicamos por qué: se le pide reintentar como ante cualquier respuesta rara.
  fuga_de_instrucciones: {
    status: 502,
    mensaje: 'El servicio de IA devolvió una respuesta inválida.',
  },
  proveedor: { status: 502, mensaje: 'El servicio de IA no está disponible.' },
};

/** Lo que se le dice al estudiante cuando el paciente no pudo responder. */
export function errorDeIa(error: unknown): ErrorDeChat {
  if (!(error instanceof ErrorIA)) return fallo(502, ERRORES_IA.proveedor.mensaje);
  if (error.tipo === 'espera_del_paciente') {
    // No es un error del estudiante ni una caída: el paciente (su proveedor) va a su ritmo.
    const espera = Math.max(1, error.esperaS ?? 5);
    return fallo(429, `El paciente necesita unos segundos. Inténtalo en ${espera} s.`, espera);
  }
  if (error.tipo === 'consultorio_ocupado') {
    return fallo(429, mensajeConsultorioOcupado(error.enCurso ?? 0), ESPERA_CONSULTORIO_S);
  }
  const { status, mensaje } = ERRORES_IA[error.tipo];
  return fallo(status, mensaje);
}

/**
 * Responde una intervención del estudiante de punta a punta: pide el turno al proveedor de la
 * práctica, reenvía la respuesta por partes y, cuando está completa, guarda el intercambio.
 * Termina siempre con un evento `fin` (respuesta guardada) o `error`; nunca lanza.
 *
 * El estudiante no puede escribir en `mensaje` (podría fabricar turnos del paciente): el
 * intercambio lo guarda el servidor con la clave secreta, ya verificada la práctica con RLS. La
 * función de la base de datos vuelve a comprobar, con la práctica bloqueada, que sigue en curso y
 * el tope de intervenciones.
 */
export async function* responderIntercambio(
  turno: TurnoPaciente
): AsyncGenerator<EventoChat, void, void> {
  const { peticion, sesionId } = turno;
  const inicio = performance.now();

  let completa: RespuestaProcesada | null = null;
  try {
    for await (const evento of transmitirTurno(turno)) {
      if (evento.tipo === 'completo') {
        completa = evento.respuesta;
        break;
      }
      yield evento;
    }
  } catch (error) {
    const tipo = error instanceof ErrorIA ? error.tipo : 'proveedor';
    const nivel =
      tipo === 'espera_del_paciente' || tipo === 'consultorio_ocupado' ? 'info' : 'error';
    log[nivel]('npc_chat.ia_fallo', { peticion, tipo, sesion_id: sesionId });
    yield errorDeIa(error);
    return;
  }
  if (!completa) {
    log.error('npc_chat.ia_fallo', { peticion, tipo: 'respuesta_invalida', sesion_id: sesionId });
    yield errorDeIa(new ErrorIA('respuesta_invalida'));
    return;
  }

  const { resultado } = completa;
  const latenciaMs = Math.round(performance.now() - inicio);
  const timestampRespuesta = new Date().toISOString();

  const { data: guardado, error: errorGuardado } = await createAdminClient()
    .rpc('guardar_intercambio_ia', {
      p_sesion_id: sesionId,
      p_mensaje: turno.mensaje,
      p_respuesta: completa.texto,
      p_emocion: completa.emocion,
      p_latencia_ms: latenciaMs,
      p_tokens_entrada: resultado.tokensEntrada,
      p_tokens_salida: resultado.tokensSalida,
      p_proveedor: resultado.proveedor,
      p_modelo: resultado.modelo,
      p_severidad: resultado.severidad,
      p_banderas: resultado.banderas,
      p_emocion_deducida: completa.emocionDeducida,
      p_cierre: resultado.cierre,
    })
    .maybeSingle();
  if (errorGuardado) {
    log.error('npc_chat.mensajes_no_guardados', {
      peticion,
      codigo: errorGuardado.code,
      sesion_id: sesionId,
    });
    if (errorGuardado.code === '55000') yield fallo(409, MENSAJE_PRACTICA_TERMINADA);
    else if (errorGuardado.code === '54000') yield fallo(429, mensajeTope());
    // Sin guardar, el docente no vería el intercambio en la transcripción y el paciente lo
    // olvidaría en el siguiente turno: mejor que el estudiante lo reintente.
    else yield fallo(503, 'No pudimos guardar tu mensaje. Inténtalo de nuevo.');
    return;
  }

  // HU-12 · T05: el consumo se registra para monitoreo (sin el contenido de la conversación).
  log.info('npc_chat.respuesta', {
    peticion,
    sesion_id: sesionId,
    proveedor: resultado.proveedor,
    modelo: resultado.modelo,
    latencia_ms: latenciaMs,
    tokens_entrada: resultado.tokensEntrada,
    tokens_salida: resultado.tokensSalida,
    severidad: resultado.severidad,
    cierre: resultado.cierre,
  });

  const respuesta: NpcChatResponse = {
    respuesta_npc: completa.texto,
    emocion_npc: completa.emocion,
    intensidad_npc: completa.intensidad,
    timestamp_respuesta: timestampRespuesta,
    tokens_entrada: resultado.tokensEntrada,
    tokens_salida: resultado.tokensSalida,
    id_mensaje_estudiante: guardado?.id_estudiante ?? null,
    id_mensaje_npc: guardado?.id_npc ?? null,
    cierre: resultado.cierre,
  };
  yield { tipo: 'fin', respuesta };
}
