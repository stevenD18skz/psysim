import 'server-only';

import { type MotivoCierre } from '@/lib/conversacion/cierre';
import { type ParteTurno } from '@/lib/ia/partes';

import { type CierreAjeno, decidirCierre, decidirCierrePorEstado } from './cierre';
import { type ClienteOrquestador, clienteOrquestador } from './cliente';
import { type CuentaOrquestador } from './cuentas';
import { registrarEvento, reservarTurno } from './datos';
import { ErrorOrquestador } from './errores';
import { type MensajeOrquestador, type MetricasTurno } from './tipos';

/*
 * Tiempos de un turno (el Route Handler tiene `maxDuration` de 60 s y responde siempre antes de
 * los 55 s, para devolver un error controlado y no el corte de la plataforma):
 *
 *   hasta 20 s  esperando cupo del turnero (si hace falta más, se responde 429 con Retry-After)
 *   hasta 23 s  para que el orquestador empiece a responder (su primer turno tarda hasta 20 s)
 *   12 s        reservados para que Gemini responda si el orquestador falla
 */

/** Plazo de toda la petición, menor que el `maxDuration` de la ruta (60 s). */
export const PLAZO_PETICION_MS = 55_000;
/** Tiempo que siempre se guarda para que Gemini pueda responder como respaldo. */
export const RESERVA_RESPALDO_MS = 12_000;
/** Lo que necesita el orquestador para responder un turno: sin esto, no vale la pena esperar. */
export const MINIMO_PARA_TURNO_MS = 23_000;
/** Plazo para que empiece a llegar la respuesta del orquestador. */
export const TIEMPO_INICIO_MS = 25_000;
/** Plazo entre un fragmento y el siguiente. */
export const TIEMPO_SILENCIO_MS = 12_000;
/** Espera ante un 429 del orquestador que no dice cuánto esperar. */
export const RETROCESO_LIMITE_MS = 5_000;
/** Margen al despertar de una espera, por si los relojes no coinciden al milisegundo. */
const MARGEN_ESPERA_MS = 150;

/** Tiempo que le queda a la petición. */
export interface Plazo {
  restanteMs(): number;
}

export function crearPlazo(
  totalMs: number = PLAZO_PETICION_MS,
  ahora: () => number = () => performance.now()
): Plazo {
  const inicio = ahora();
  return { restanteMs: () => totalMs - (ahora() - inicio) };
}

export interface TurnoOrquestador {
  /** Práctica de PsySim (para los eventos). */
  sesionId: string;
  cuenta: CuentaOrquestador;
  sesionOrquestador: string;
  mensaje: string;
  /** El navegador reenvía un mensaje que falló: el turno pudo quedar guardado en el orquestador. */
  reintento: boolean;
  /** Intercambios que PsySim tiene guardados de esta práctica (todos respondidos allá). */
  intercambios: number;
  /** Severidad del turno anterior, para deducir la emoción si falta la etiqueta. */
  severidadAnterior: number | null;
  plazo: Plazo;
  cliente?: ClienteOrquestador;
  /** Espera inyectable (tests). */
  esperar?: (ms: number) => Promise<void>;
}

const esperarReal = (ms: number) => new Promise<void>(listo => setTimeout(listo, ms));

type Conciliacion =
  /** El turno quedó guardado en el orquestador con su respuesta: se aprovecha. */
  | { estado: 'guardado'; respuesta: MensajeOrquestador; banderasDelTurno: string[] }
  /** El turno no dejó rastro: se puede enviar de nuevo. */
  | { estado: 'limpio' }
  /** Los dos historiales ya no coinciden: la práctica no puede seguir en el orquestador. */
  | { estado: 'inconsistente' };

/**
 * Compara el historial del orquestador con lo que PsySim tiene guardado. PsySim guarda un
 * intercambio solo después de recibir la respuesta, así que allá debe haber tantos mensajes del
 * estudiante como intercambios guardados; uno más, con este mismo texto y ya respondido, es el
 * turno que se perdió. Se cuentan los mensajes del estudiante y no el total, por si el
 * orquestador añade alguno propio (un saludo inicial).
 */
export function conciliar(
  historial: readonly MensajeOrquestador[],
  intercambios: number,
  mensaje: string
): Conciliacion {
  const delEstudiante = historial.filter(m => m.role === 'trainee').length;
  if (delEstudiante === intercambios) return { estado: 'limpio' };
  const estudiante = historial.at(-2);
  const paciente = historial.at(-1);
  if (
    delEstudiante === intercambios + 1 &&
    estudiante?.role === 'trainee' &&
    paciente?.role === 'patient' &&
    estudiante.content.trim() === mensaje.trim() &&
    paciente.content.trim()
  ) {
    // El abuso lo detecta en lo que escribió el estudiante: la bandera puede venir en su mensaje.
    return {
      estado: 'guardado',
      respuesta: paciente,
      banderasDelTurno: [...estudiante.risk_flags, ...paciente.risk_flags],
    };
  }
  return { estado: 'inconsistente' };
}

function comoError(error: unknown): ErrorOrquestador {
  return error instanceof ErrorOrquestador
    ? error
    : new ErrorOrquestador('respuesta_invalida', { cause: error });
}

/**
 * Un turno con el orquestador. Entrega la respuesta por partes y termina con `fin`.
 *
 * - Antes de cada llamada reserva cupo en el turnero de la cuenta; si no hay, espera (avisando con
 *   `espera`) mientras quede tiempo para responder.
 * - Un 429 real se espera y se reintenta: nunca pasa a Gemini.
 * - Un 502 o un `error` con `discarded: true` se reintenta una vez (el orquestador descartó el
 *   turno). Si el descarte no es seguro, lee el historial antes de reenviar para no duplicarlo.
 *
 * Lanza `ErrorOrquestador`: `limite` si la espera no cabe en la petición (se responde 429 al
 * estudiante) y, para lo demás, el tipo del fallo; quien llama decide si responde Gemini.
 */
export async function* conversarConOrquestador({
  sesionId,
  cuenta,
  sesionOrquestador,
  mensaje,
  reintento,
  intercambios,
  severidadAnterior,
  plazo,
  cliente = clienteOrquestador(),
  esperar = esperarReal,
}: TurnoOrquestador): AsyncGenerator<ParteTurno, void, void> {
  const evento = { sesionId, cuenta: cuenta.clave };

  const fin = (
    texto: string,
    datos: {
      severidad: number;
      banderas: string[];
      cierre: MotivoCierre | null;
      cierreAjeno: CierreAjeno | null;
      metricas: MetricasTurno;
    }
  ): ParteTurno => ({
    tipo: 'fin',
    resultado: {
      proveedor: 'orquestador',
      texto,
      modelo: datos.metricas.modelo ?? datos.metricas.proveedor,
      tokensEntrada: datos.metricas.tokensEntrada,
      tokensSalida: datos.metricas.tokensSalida,
      severidad: datos.severidad,
      severidadAnterior,
      banderas: datos.banderas,
      cierre: datos.cierre,
      cierreAjeno: datos.cierreAjeno,
    },
  });

  /** Lee el historial del orquestador y, si el turno quedó guardado, lo entrega como respuesta. */
  async function* recuperar(): AsyncGenerator<ParteTurno, 'entregado' | 'limpio', void> {
    const historial = await cliente.historial(cuenta, sesionOrquestador);
    const resultado = conciliar(historial, intercambios, mensaje);
    if (resultado.estado === 'limpio') return 'limpio';
    if (resultado.estado === 'inconsistente') throw new ErrorOrquestador('descarte_incierto');

    const { respuesta, banderasDelTurno } = resultado;
    // El historial no dice si el orquestador cerró la sesión con este turno: se le pregunta. Con
    // los mismos hechos debe concluir lo mismo que el stream (`completed` no es una crisis).
    const sesion = await cliente.sesion(cuenta, sesionOrquestador);
    const decision = decidirCierrePorEstado(sesion.status, banderasDelTurno);
    yield { tipo: 'fragmento', texto: respuesta.content };
    yield fin(respuesta.content, {
      severidad: respuesta.severity,
      banderas: respuesta.risk_flags,
      cierre: decision.tipo === 'termina' ? decision.motivo : null,
      cierreAjeno: decision.tipo === 'cerrada_alla' ? decision.codigo : null,
      metricas: {
        proveedor: respuesta.ai_provider ?? null,
        modelo: null,
        tokensEntrada: null,
        tokensSalida: respuesta.tokens_used ?? null,
      },
    });
    return 'entregado';
  }

  if (reintento && (yield* recuperar()) === 'entregado') return;

  for (let fallos = 0; ;) {
    // Turnero: un cupo de la cuenta en el último minuto, o esperar a que se libere.
    for (;;) {
      const esperaMs = await reservarTurno(cuenta.clave);
      if (esperaMs === 0) break;
      if (plazo.restanteMs() - esperaMs < RESERVA_RESPALDO_MS + MINIMO_PARA_TURNO_MS) {
        void registrarEvento({ ...evento, tipo: 'limite', detalle: 'turnero', esperaMs });
        throw new ErrorOrquestador('limite', { esperaS: Math.ceil(esperaMs / 1000) });
      }
      void registrarEvento({ ...evento, tipo: 'espera', detalle: 'turnero', esperaMs });
      yield { tipo: 'espera', segundos: Math.ceil(esperaMs / 1000) };
      await esperar(esperaMs + MARGEN_ESPERA_MS);
    }

    let texto = '';
    try {
      const tiempoInicioMs = Math.floor(
        Math.min(TIEMPO_INICIO_MS, plazo.restanteMs() - RESERVA_RESPALDO_MS)
      );
      if (tiempoInicioMs < 1_000) throw new ErrorOrquestador('tiempo_agotado');

      for await (const parte of cliente.conversar(cuenta, sesionOrquestador, mensaje, {
        tiempoInicioMs,
        tiempoSilencioMs: TIEMPO_SILENCIO_MS,
      })) {
        if (parte.tipo === 'fragmento') {
          texto += parte.texto;
          yield parte;
        } else if (parte.tipo === 'fin') {
          // Un cierre `success`, sin motivo o con un valor desconocido NO es una crisis: la
          // práctica sigue (ver `cierre.ts`). El 2026-11-15 una práctica en la que la paciente se
          // calmaba se cerró como crisis por asumir lo contrario.
          const decision = decidirCierre(parte.debeCerrar, parte.cierre);
          yield fin(texto, {
            severidad: parte.severidad,
            banderas: [],
            cierre: decision.tipo === 'termina' ? decision.motivo : null,
            cierreAjeno: decision.tipo === 'cerrada_alla' ? decision.codigo : null,
            metricas: parte.metricas,
          });
          return;
        } else if (parte.tipo === 'error') {
          // `discarded: true` equivale a un 502: el orquestador garantiza que borró el turno.
          throw parte.descartado
            ? new ErrorOrquestador('servidor', { estado: 502 })
            : new ErrorOrquestador('descarte_incierto');
        }
      }
      throw new ErrorOrquestador('red');
    } catch (error) {
      const fallo = comoError(error);
      // Lo que alcanzó a llegar de este intento ya no vale.
      if (texto) yield { tipo: 'reinicio' };

      if (fallo.tipo === 'limite') {
        // El turnero debería evitarlo; si pasa (otro cliente usa la cuenta), se espera igual.
        const esperaMs = fallo.esperaS === null ? RETROCESO_LIMITE_MS : fallo.esperaS * 1000;
        void registrarEvento({ ...evento, tipo: 'limite', detalle: 'orquestador', esperaMs });
        if (plazo.restanteMs() - esperaMs < RESERVA_RESPALDO_MS + MINIMO_PARA_TURNO_MS) {
          throw new ErrorOrquestador('limite', { esperaS: Math.ceil(esperaMs / 1000) });
        }
        yield { tipo: 'espera', segundos: Math.ceil(esperaMs / 1000) };
        await esperar(esperaMs + MARGEN_ESPERA_MS);
        continue;
      }

      void registrarEvento({ ...evento, tipo: 'error', detalle: fallo.tipo });
      const quedaTiempo = plazo.restanteMs() > RESERVA_RESPALDO_MS + MINIMO_PARA_TURNO_MS;
      if (fallos > 0 || !quedaTiempo) throw fallo;
      fallos++;

      const descartado = fallo.tipo === 'servidor' && fallo.estado === 502;
      if (descartado) continue;
      if (fallo.tipo === 'servidor' || fallo.tipo === 'descarte_incierto') {
        // No es seguro que el turno se haya descartado: se mira el historial antes de reenviar.
        if ((yield* recuperar()) === 'entregado') return;
        continue;
      }
      throw fallo;
    }
  }
}
