import 'server-only';

import { type EmocionNpc } from '@/lib/conversacion/emociones';
import { getProveedorIa, type ProveedorIA } from '@/lib/env/orquestador';
import { log } from '@/lib/log';
import { fijarGemini, type SesionIa } from '@/lib/orquestador/datos';
import { ErrorOrquestador, esFalloDelServicio } from '@/lib/orquestador/errores';
import { olvidarSesionOrquestador, prepararPractica } from '@/lib/orquestador/practica';
import { conversarConOrquestador, type Plazo } from '@/lib/orquestador/turno';
import { type MensajeHistorial } from '@/schemas/npc-chat.schema';

import { ErrorIA, transmitirRespuestaPaciente } from './paciente';
import { type ParteTurno } from './partes';
import { type EventoTurno, procesarTurno, RespuestaRechazada } from './procesar';
import { TEXTO_REGLAS } from './reglas';

/** Margen para armar y enviar la respuesta después de que Gemini termina. */
const MARGEN_RESPUESTA_MS = 1_500;

export interface TurnoPaciente {
  /** Id de la petición, para los registros. */
  peticion: string;
  sesionId: string;
  escenarioId: string;
  /** Prompt de la práctica, sin las reglas fijas. */
  promptSistema: string;
  nombrePaciente: string;
  /** Conversación vigente guardada en PsySim (el contexto de Gemini). */
  historial: readonly MensajeHistorial[];
  mensaje: string;
  reintento: boolean;
  /** Intercambios vigentes guardados en PsySim. */
  intercambios: number;
  /** El estudiante volvió a un momento anterior («ensayar otra respuesta»). */
  hayDescartados: boolean;
  /** Emoción de la respuesta anterior del paciente. */
  emocionAnterior: EmocionNpc | null;
  /** Proveedor y sesión del orquestador de la práctica, ya leídos (`null`: aún no tiene). */
  sesionIa: SesionIa | null;
  plazo: Plazo;
}

/**
 * Responde un turno del paciente con el proveedor que le toca a la práctica y entrega la respuesta
 * por partes, ya limpia.
 *
 * El orquestador es el proveedor principal (`IA_PROVEEDOR=orquestador`). Gemini responde solo si
 * el orquestador falla de verdad (no contesta, 5xx que se repite, 401 tras volver a iniciar
 * sesión) y, desde ese turno, la práctica se queda en Gemini: el orquestador arma el contexto con
 * su propio historial y el completo solo lo tiene PsySim. Por lo mismo pasa a Gemini una práctica
 * en la que el estudiante reformuló una intervención (el orquestador no puede olvidar turnos).
 *
 * Lanza `ErrorIA`: el límite del orquestador (`espera_del_paciente`) y el tope de prácticas
 * (`consultorio_ocupado`) nunca activan Gemini, y tampoco los errores de datos (400, 403, 422).
 */
export async function* transmitirTurno(
  turno: TurnoPaciente
): AsyncGenerator<EventoTurno, void, void> {
  // Quién está respondiendo: si su respuesta se rechaza, la práctica no puede seguir con él.
  const estado: { proveedor: ProveedorIA } = { proveedor: 'gemini' };
  try {
    yield* procesarTurno(partesDelTurno(turno, estado), {
      nombrePaciente: turno.nombrePaciente,
      fuentes: [turno.promptSistema, TEXTO_REGLAS],
      emocionAnterior: turno.emocionAnterior,
    });
  } catch (error) {
    if (!(error instanceof RespuestaRechazada)) throw error;
    if (estado.proveedor === 'orquestador') {
      // El orquestador ya guardó esa respuesta en su historial y PsySim no: dejan de coincidir.
      await pasarAGemini(turno, error.motivo === 'fuga_de_instrucciones' ? 'fuga' : 'vacia');
    }
    throw new ErrorIA(error.motivo);
  }
}

async function pasarAGemini(turno: TurnoPaciente, motivo: string): Promise<void> {
  log.warn('npc_chat.pasa_a_gemini', {
    peticion: turno.peticion,
    sesion_id: turno.sesionId,
    motivo,
  });
  try {
    await fijarGemini(turno.sesionId, motivo);
  } catch {
    // Si no se pudo anotar, este turno lo responde Gemini igual; el siguiente lo detecta por el
    // historial (el orquestador tendrá un intercambio menos) y vuelve a fijarlo.
    log.error('npc_chat.proveedor_no_fijado', {
      peticion: turno.peticion,
      sesion_id: turno.sesionId,
    });
  }
}

async function* partesDelTurno(
  turno: TurnoPaciente,
  estado: { proveedor: ProveedorIA }
): AsyncGenerator<ParteTurno, void, void> {
  const { sesionId, sesionIa, plazo, peticion } = turno;

  async function* conGemini(): AsyncGenerator<ParteTurno, void, void> {
    estado.proveedor = 'gemini';
    yield* transmitirRespuestaPaciente(
      {
        promptSistema: turno.promptSistema,
        historial: turno.historial,
        mensaje: turno.mensaje,
        nombrePaciente: turno.nombrePaciente,
      },
      undefined,
      { tiempoMaximoMs: plazo.restanteMs() - MARGEN_RESPUESTA_MS }
    );
  }

  if (getProveedorIa() !== 'orquestador') {
    // Interruptor de emergencia: lo que venía en el orquestador queda fijo en Gemini, para que al
    // volver a activarlo no retome una conversación a la que le faltan turnos.
    if (sesionIa?.proveedor === 'orquestador' && sesionIa.sesionOrquestador) {
      await pasarAGemini(turno, 'interruptor');
    }
    yield* conGemini();
    return;
  }
  if (sesionIa?.proveedor === 'gemini') {
    yield* conGemini();
    return;
  }
  if (turno.hayDescartados) {
    await pasarAGemini(turno, 'reformulacion');
    yield* conGemini();
    return;
  }

  /** Decide qué hacer con un fallo del orquestador. Devuelve si el turno lo responde Gemini. */
  const alFallar = async (error: unknown, etapa: string): Promise<void> => {
    const fallo =
      error instanceof ErrorOrquestador
        ? error
        : new ErrorOrquestador('respuesta_invalida', { cause: error });
    if (fallo.tipo === 'limite') {
      throw new ErrorIA('espera_del_paciente', { esperaS: fallo.esperaS ?? 5 });
    }
    if (!esFalloDelServicio(fallo.tipo)) {
      // 400, 403, 404 o 422: PsySim envió algo mal o le faltan permisos. No se esconde con Gemini.
      log.error('npc_chat.orquestador_rechazo', {
        peticion,
        sesion_id: sesionId,
        etapa,
        tipo: fallo.tipo,
        estado: fallo.estado,
      });
      throw new ErrorIA('proveedor', { cause: fallo });
    }
    if (fallo.tipo === 'autenticacion') {
      // Alerta: las credenciales del orquestador dejaron de servir (docs/observabilidad.md).
      log.error('orquestador.credenciales_rechazadas', { peticion, sesion_id: sesionId, etapa });
    }
    log.error('npc_chat.orquestador_fallo', {
      peticion,
      sesion_id: sesionId,
      etapa,
      tipo: fallo.tipo,
      estado: fallo.estado,
    });
    await pasarAGemini(turno, fallo.tipo);
  };

  for (let preparaciones = 0; ; preparaciones++) {
    let preparacion;
    try {
      preparacion = await prepararPractica({
        sesionId,
        escenarioId: turno.escenarioId,
        prompt: turno.promptSistema,
        hayHistorial: turno.intercambios > 0,
        // Tras olvidar una sesión borrada hay que leer la fila otra vez.
        ...(preparaciones === 0 ? { sesionIa } : {}),
      });
    } catch (error) {
      if (!(error instanceof ErrorOrquestador)) {
        // Falló la base de datos de PsySim, no el orquestador: este turno lo responde Gemini.
        log.error('npc_chat.practica_no_preparada', { peticion, sesion_id: sesionId });
      } else {
        await alFallar(error, 'preparacion');
      }
      yield* conGemini();
      return;
    }
    if (preparacion.estado === 'sin_cupo') {
      throw new ErrorIA('consultorio_ocupado', { enCurso: preparacion.enCurso });
    }
    if (preparacion.estado === 'gemini') {
      yield* conGemini();
      return;
    }

    try {
      estado.proveedor = 'orquestador';
      yield* conversarConOrquestador({
        sesionId,
        cuenta: preparacion.cuenta,
        sesionOrquestador: preparacion.sesionOrquestador,
        mensaje: turno.mensaje,
        reintento: turno.reintento,
        intercambios: turno.intercambios,
        severidadAnterior: preparacion.severidad,
        plazo,
      });
      return;
    } catch (error) {
      if (error instanceof ErrorOrquestador && error.tipo === 'no_encontrado') {
        // La sesión ya no existe allá (borraron los datos de prueba). Sin conversación todavía,
        // se abre otra; con conversación, el historial solo lo tiene PsySim: sigue con Gemini.
        if (turno.intercambios === 0 && preparaciones === 0) {
          await olvidarSesionOrquestador(sesionId);
          continue;
        }
        await pasarAGemini(turno, 'sesion_borrada');
      } else {
        await alFallar(error, 'conversacion');
      }
      yield* conGemini();
      return;
    }
  }
}
