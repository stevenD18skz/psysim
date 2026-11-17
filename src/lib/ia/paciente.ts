import 'server-only';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  APICallError,
  type LanguageModel,
  LoadAPIKeyError,
  type ModelMessage,
  RetryError,
  streamText,
} from 'ai';

import { getIaEnv } from '@/lib/env/ia';
import { type MensajeHistorial } from '@/schemas/npc-chat.schema';

import { MAX_MENSAJES_CONTEXTO } from './historial';
import { type ParteTurno } from './partes';
import { componerInstrucciones } from './reglas';

const URL_BASE_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Tiempo máximo de la llamada a Gemini (HU-12 · T04), con sus dos modelos. Cabe en el plazo de la
 * petición del chat (55 s, ver `lib/orquestador/turno.ts`) para responder un 504 controlado antes
 * de que la plataforma corte la función.
 */
export const TIEMPO_MAXIMO_IA_MS = 25_000;

/**
 * Tiempo que se concede al modelo principal antes de pasar al de respaldo. Deja margen para que
 * el respaldo responda dentro de `TIEMPO_MAXIMO_IA_MS`.
 */
export const TIEMPO_MODELO_PRINCIPAL_MS = 12_000;

/** Tiempo mínimo que debe quedar para que valga la pena intentar con el modelo de respaldo. */
const TIEMPO_MINIMO_RESPALDO_MS = 3_000;

export type TipoErrorIA =
  | 'tiempo_agotado'
  | 'autenticacion'
  | 'limite'
  | 'respuesta_invalida'
  /** La respuesta copiaba las instrucciones del paciente (LLM07). */
  | 'fuga_de_instrucciones'
  | 'proveedor'
  /** El orquestador sigue en su límite de mensajes por minuto: se le pide al estudiante esperar. */
  | 'espera_del_paciente'
  /** Todas las cuentas del orquestador alcanzaron el tope de prácticas simultáneas. */
  | 'consultorio_ocupado';

/** Error de la IA ya clasificado; el mensaje original nunca se reenvía al cliente. */
export class ErrorIA extends Error {
  readonly tipo: TipoErrorIA;
  /** Con `espera_del_paciente`: segundos que faltan para poder reintentar. */
  readonly esperaS: number | null;
  /** Con `consultorio_ocupado`: prácticas en curso en ese momento. */
  readonly enCurso: number | null;

  constructor(
    tipo: TipoErrorIA,
    options: { cause?: unknown; esperaS?: number; enCurso?: number } = {}
  ) {
    super(`Fallo de la IA: ${tipo}`, { cause: options.cause });
    this.name = 'ErrorIA';
    this.tipo = tipo;
    this.esperaS = options.esperaS ?? null;
    this.enCurso = options.enCurso ?? null;
  }
}

export interface EntradaPaciente {
  /** Prompt del caso (sin las reglas fijas: `componerInstrucciones` las añade al enviarlo). */
  promptSistema: string;
  historial: readonly MensajeHistorial[];
  mensaje: string;
  /** Nombre del paciente, para limpiar respuestas que empiezan con "Nombre:". */
  nombrePaciente?: string;
  /**
   * Indicación del servidor válida solo para este turno (p. ej. que se cumplió el tiempo de la
   * consulta). Va en las instrucciones del sistema, después de las reglas: nunca en lo que
   * escribió el estudiante ni en el historial.
   */
  notaDeEscena?: string | null;
}

/** Instrucciones del sistema de un turno: el caso, las reglas fijas y la nota de escena, si hay. */
export function instruccionesDelTurno(entrada: EntradaPaciente): string {
  const base = componerInstrucciones(entrada.promptSistema);
  return entrada.notaDeEscena ? `${base}\n\n${entrada.notaDeEscena}` : base;
}

export interface ModelosPaciente {
  principal: { id: string; modelo: LanguageModel };
  /** Modelo alternativo si el principal no responde a tiempo o está saturado. */
  respaldo?: { id: string; modelo: LanguageModel };
}

function crearModelos(): ModelosPaciente {
  const { AI_API_KEY, AI_MODEL, AI_MODEL_RESPALDO } = getIaEnv();
  const google = createGoogleGenerativeAI({ apiKey: AI_API_KEY, baseURL: URL_BASE_GEMINI });
  return {
    principal: { id: AI_MODEL, modelo: google(AI_MODEL) },
    ...(AI_MODEL_RESPALDO &&
      AI_MODEL_RESPALDO !== AI_MODEL && {
        respaldo: { id: AI_MODEL_RESPALDO, modelo: google(AI_MODEL_RESPALDO) },
      }),
  };
}

/**
 * HU-12 · T04 — Ensambla los mensajes en orden: el historial de la práctica (empezando siempre
 * por un mensaje del estudiante, como exige la API) y, al final, la intervención actual. El
 * prompt del sistema va aparte, en `instructions`.
 */
export function construirMensajes(
  historial: readonly MensajeHistorial[],
  mensaje: string
): ModelMessage[] {
  let reciente = historial.slice(-MAX_MENSAJES_CONTEXTO);
  const primerUsuario = reciente.findIndex(m => m.rol === 'user');
  reciente = primerUsuario === -1 ? [] : reciente.slice(primerUsuario);

  return [
    ...reciente.map((m): ModelMessage =>
      m.rol === 'user'
        ? { role: 'user', content: m.contenido }
        : { role: 'assistant', content: m.contenido }
    ),
    { role: 'user', content: mensaje },
  ];
}

/** HU-16 · T01 — Traduce cualquier error del SDK o del proveedor a un tipo conocido. */
export function clasificarError(error: unknown): TipoErrorIA {
  const causa = RetryError.isInstance(error) ? error.lastError : error;

  // `AbortSignal.timeout` rechaza con un DOMException, que no siempre es `instanceof Error`.
  const nombre =
    typeof causa === 'object' && causa !== null && 'name' in causa ? causa.name : undefined;
  if (nombre === 'TimeoutError' || nombre === 'AbortError') return 'tiempo_agotado';
  if (LoadAPIKeyError.isInstance(causa)) return 'autenticacion';
  if (APICallError.isInstance(causa)) {
    if (causa.statusCode === 401 || causa.statusCode === 403) return 'autenticacion';
    if (causa.statusCode === 429) return 'limite';
    if (causa.statusCode === 408 || causa.statusCode === 504) return 'tiempo_agotado';
    return 'proveedor';
  }
  return 'proveedor';
}

/**
 * HU-12 · T04/T05 — Pide a Gemini la respuesta del paciente y la entrega por partes
 * (`streamText`), con el mismo protocolo que el orquestador: fragmentos de texto crudo y, al
 * final, el resultado. La limpieza y el filtro de fuga los aplica quien consume el flujo
 * (`procesarTurno`). Es el único camino hacia Gemini: lo usan la práctica y el chat de prueba.
 *
 * Si el modelo principal falla, sigue con el de respaldo dentro del tiempo que quede; si ya había
 * entregado texto, avisa con `reinicio` para que se descarte.
 */
export async function* transmitirRespuestaPaciente(
  entrada: EntradaPaciente,
  modelos: ModelosPaciente = crearModelos(),
  opciones: { ahora?: () => number; tiempoMaximoMs?: number } = {}
): AsyncGenerator<ParteTurno, void, void> {
  const ahora = opciones.ahora ?? (() => performance.now());
  const total = Math.min(opciones.tiempoMaximoMs ?? TIEMPO_MAXIMO_IA_MS, TIEMPO_MAXIMO_IA_MS);
  const inicio = ahora();
  let entregoTexto = false;

  try {
    const principal = Math.floor(Math.min(TIEMPO_MODELO_PRINCIPAL_MS, total));
    for await (const parte of transmitirCon(modelos.principal, entrada, principal)) {
      if (parte.tipo === 'fragmento') entregoTexto = true;
      yield parte;
    }
    return;
  } catch (error) {
    const fallo = error instanceof ErrorIA ? error : new ErrorIA('proveedor', { cause: error });
    const restante = Math.floor(total - (ahora() - inicio));
    if (
      !modelos.respaldo ||
      fallo.tipo === 'autenticacion' ||
      restante < TIEMPO_MINIMO_RESPALDO_MS
    ) {
      throw fallo;
    }
    if (entregoTexto) yield { tipo: 'reinicio' };
    yield* transmitirCon(modelos.respaldo, entrada, restante);
  }
}

async function* transmitirCon(
  { id, modelo }: { id: string; modelo: LanguageModel },
  entrada: EntradaPaciente,
  tiempoMaximoMs: number
): AsyncGenerator<ParteTurno, void, void> {
  const { AI_TEMPERATURE, AI_MAX_TOKENS } = getIaEnv();

  // `streamText` no lanza los errores del proveedor: los entrega en el flujo y en `onError`.
  let fallo: unknown = null;
  const resultado = streamText({
    model: modelo,
    instructions: instruccionesDelTurno(entrada),
    messages: construirMensajes(entrada.historial, entrada.mensaje),
    temperature: AI_TEMPERATURE,
    maxOutputTokens: AI_MAX_TOKENS,
    reasoning: 'minimal',
    maxRetries: 0,
    timeout: tiempoMaximoMs,
    onError({ error }) {
      fallo = error;
    },
  });

  let texto = '';
  try {
    for await (const parte of resultado.stream) {
      if (parte.type === 'text-delta') {
        if (!parte.text) continue;
        texto += parte.text;
        yield { tipo: 'fragmento', texto: parte.text };
      } else if (parte.type === 'error') {
        throw parte.error;
      } else if (parte.type === 'abort') {
        throw new DOMException('La IA no respondió a tiempo.', 'TimeoutError');
      }
    }
  } catch (error) {
    throw new ErrorIA(clasificarError(error), { cause: error });
  }
  if (fallo) throw new ErrorIA(clasificarError(fallo), { cause: fallo });
  if (!texto.trim()) throw new ErrorIA('respuesta_invalida');

  // El consumo llega al cerrar el flujo; si el proveedor no lo informa, queda sin dato.
  const uso = await Promise.resolve(resultado.usage).catch(() => null);
  yield {
    tipo: 'fin',
    resultado: {
      proveedor: 'gemini',
      texto,
      modelo: id,
      tokensEntrada: uso?.inputTokens ?? null,
      tokensSalida: uso?.outputTokens ?? null,
      severidad: null,
      severidadAnterior: null,
      banderas: [],
      cierre: null,
      cierreAjeno: null,
    },
  };
}
