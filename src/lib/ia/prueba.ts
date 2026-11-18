import 'server-only';

import {
  type EntradaPaciente,
  ErrorIA,
  type ModelosPaciente,
  transmitirRespuestaPaciente,
} from './paciente';
import { procesarTurno, type RespuestaProcesada, RespuestaRechazada } from './procesar';
import { TEXTO_REGLAS } from './reglas';

/**
 * Respuesta del paciente de una sola vez, para quien no la muestra mientras llega (el chat de
 * prueba del constructor de casos). Recorre el mismo camino que la práctica real: el flujo de
 * Gemini con su modelo de respaldo, la limpieza y el filtro de fuga de `procesarTurno`. Así un
 * cambio en las reglas o en el proveedor se hace en un solo sitio y el docente prueba al mismo
 * paciente que después conversa con el estudiante.
 *
 * Lanza `ErrorIA`, igual que el turno de la práctica.
 */
export async function responderDeUnaVez(
  entrada: EntradaPaciente,
  modelos?: ModelosPaciente
): Promise<RespuestaProcesada> {
  try {
    for await (const evento of procesarTurno(transmitirRespuestaPaciente(entrada, modelos), {
      nombrePaciente: entrada.nombrePaciente,
      // La nota de escena también es una instrucción: copiarla sería una fuga.
      fuentes: [
        entrada.promptSistema,
        TEXTO_REGLAS,
        ...(entrada.notaDeEscena ? [entrada.notaDeEscena] : []),
      ],
      emocionAnterior: null,
    })) {
      if (evento.tipo === 'completo') return evento.respuesta;
    }
  } catch (error) {
    if (error instanceof RespuestaRechazada) throw new ErrorIA(error.motivo);
    throw error instanceof ErrorIA ? error : new ErrorIA('proveedor', { cause: error });
  }
  throw new ErrorIA('respuesta_invalida');
}
