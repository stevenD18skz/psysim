import 'server-only';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  APICallError,
  generateText,
  type LanguageModel,
  LoadAPIKeyError,
  type ModelMessage,
  RetryError,
} from 'ai';

import { type EmocionNpc, extraerEmocion } from '@/lib/conversacion/emociones';
import { getIaEnv } from '@/lib/env/ia';
import { type MensajeHistorial } from '@/schemas/npc-chat.schema';

import { componerInstrucciones } from './reglas';

const URL_BASE_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Tiempo máximo de la llamada a la IA (HU-12 · T04). Es menor que el `maxDuration` del Route
 * Handler (30 s) para que la función responda con un 504 controlado antes de que la plataforma
 * la corte.
 */
export const TIEMPO_MAXIMO_IA_MS = 25_000;

/**
 * Tiempo que se concede al modelo principal antes de pasar al de respaldo. Deja margen para que
 * el respaldo responda dentro de `TIEMPO_MAXIMO_IA_MS`.
 */
export const TIEMPO_MODELO_PRINCIPAL_MS = 12_000;

/** Tiempo mínimo que debe quedar para que valga la pena intentar con el modelo de respaldo. */
const TIEMPO_MINIMO_RESPALDO_MS = 3_000;

/** Mensajes previos que se envían como contexto: acota el coste y la latencia. */
export const MAX_MENSAJES_CONTEXTO = 40;

export type TipoErrorIA =
  'tiempo_agotado' | 'autenticacion' | 'limite' | 'respuesta_invalida' | 'proveedor';

/** Error de la IA ya clasificado; el mensaje original nunca se reenvía al cliente. */
export class ErrorIA extends Error {
  constructor(
    readonly tipo: TipoErrorIA,
    options?: { cause?: unknown }
  ) {
    super(`Fallo de la IA: ${tipo}`, options);
    this.name = 'ErrorIA';
  }
}

export interface EntradaPaciente {
  /** Prompt del caso (sin las reglas fijas: `componerInstrucciones` las añade al enviarlo). */
  promptSistema: string;
  historial: readonly MensajeHistorial[];
  mensaje: string;
  /** Nombre del paciente, para limpiar respuestas que empiezan con "Nombre:". */
  nombrePaciente?: string;
}

export interface RespuestaPaciente {
  texto: string;
  /** Emoción que eligió el modelo para la respuesta, o `null` si no la indicó. */
  emocion: EmocionNpc | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
  /** Modelo que generó la respuesta (el principal o el de respaldo), para los logs. */
  modelo: string;
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
 * HU-12 · T04 — Ensambla los mensajes en orden: el historial reciente (empezando siempre por un
 * mensaje del estudiante, como exige la API) y, al final, la intervención actual. El prompt del
 * sistema va aparte, en `instructions`.
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

/**
 * Normaliza la respuesta del modelo: quita espacios, comillas envolventes y el prefijo
 * "Nombre:" que algunos modelos añaden al interpretar un personaje.
 */
export function limpiarRespuesta(texto: string, nombrePaciente?: string): string {
  let limpio = texto.trim();
  if (nombrePaciente) {
    const escapado = nombrePaciente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    limpio = limpio.replace(new RegExp(`^\\**${escapado}\\**\\s*:\\s*`, 'i'), '');
  }
  const comillas = /^(["“«])([\s\S]*)(["”»])$/.exec(limpio);
  if (comillas) limpio = comillas[2]!.trim();
  return limpio;
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
 * HU-12 · T04/T05 — Pide al modelo de lenguaje la respuesta del paciente virtual.
 *
 * Primero intenta con el modelo principal (hasta `TIEMPO_MODELO_PRINCIPAL_MS`). Si no responde a
 * tiempo, está saturado o falla el proveedor, reintenta con el modelo de respaldo usando el
 * tiempo restante, siempre dentro de `TIEMPO_MAXIMO_IA_MS`. Los errores de autenticación no se
 * reintentan (la clave es la misma). Lanza `ErrorIA` si no hay respuesta válida.
 */
export async function generarRespuestaPaciente(
  entrada: EntradaPaciente,
  modelos: ModelosPaciente = crearModelos(),
  ahora: () => number = () => performance.now()
): Promise<RespuestaPaciente> {
  const inicio = ahora();

  try {
    return await generarCon(modelos.principal, entrada, TIEMPO_MODELO_PRINCIPAL_MS);
  } catch (error) {
    const fallo = error instanceof ErrorIA ? error : new ErrorIA('proveedor', { cause: error });
    // Entero: el SDK exige milisegundos enteros en `timeout`.
    const restante = Math.floor(TIEMPO_MAXIMO_IA_MS - (ahora() - inicio));
    if (
      !modelos.respaldo ||
      fallo.tipo === 'autenticacion' ||
      restante < TIEMPO_MINIMO_RESPALDO_MS
    ) {
      throw fallo;
    }
    return await generarCon(modelos.respaldo, entrada, restante);
  }
}

async function generarCon(
  { id, modelo }: { id: string; modelo: LanguageModel },
  entrada: EntradaPaciente,
  tiempoMaximoMs: number
): Promise<RespuestaPaciente> {
  const { AI_TEMPERATURE, AI_MAX_TOKENS } = getIaEnv();

  let resultado: Awaited<ReturnType<typeof generateText>>;
  try {
    resultado = await generateText({
      model: modelo,
      instructions: componerInstrucciones(entrada.promptSistema),
      messages: construirMensajes(entrada.historial, entrada.mensaje),
      temperature: AI_TEMPERATURE,
      maxOutputTokens: AI_MAX_TOKENS,
      // Razonamiento mínimo: respuestas conversacionales rápidas.
      reasoning: 'minimal',
      // Sin reintentos internos: ante un fallo se pasa al modelo de respaldo.
      maxRetries: 0,
      timeout: tiempoMaximoMs,
    });
  } catch (error) {
    throw new ErrorIA(clasificarError(error), { cause: error });
  }

  const { texto: sinEtiqueta, emocion } = extraerEmocion(resultado.text);
  const texto = limpiarRespuesta(sinEtiqueta, entrada.nombrePaciente);
  if (!texto) throw new ErrorIA('respuesta_invalida');

  return {
    texto,
    emocion,
    tokensEntrada: resultado.usage.inputTokens ?? null,
    tokensSalida: resultado.usage.outputTokens ?? null,
    modelo: id,
  };
}
