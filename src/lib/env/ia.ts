import 'server-only';

import { z } from 'zod';

import { parseEnv } from './parse';

/** Modelo por defecto: el más rápido que mantiene la calidad conversacional (ver README). */
export const MODELO_IA_POR_DEFECTO = 'gemini-3.5-flash';
/** Respaldo: más ligero y con latencia estable (~1 s); se usa si el principal falla o tarda. */
export const MODELO_IA_RESPALDO_POR_DEFECTO = 'gemini-3.5-flash-lite';

const iaEnvSchema = z.object({
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().trim().min(1).default(MODELO_IA_POR_DEFECTO),
  /** Modelo de respaldo. `ninguno` desactiva el respaldo. */
  AI_MODEL_RESPALDO: z
    .string()
    .trim()
    .min(1)
    .default(MODELO_IA_RESPALDO_POR_DEFECTO)
    .transform(valor => (valor === 'ninguno' ? null : valor)),
  /** Aleatoriedad de las respuestas del paciente (0 = determinista). */
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.8),
  /** Tope de tokens de salida: las respuestas del paciente deben ser breves. */
  AI_MAX_TOKENS: z.coerce.number().int().min(32).max(2048).default(300),
});

export type IaEnv = z.infer<typeof iaEnvSchema>;

let cached: IaEnv | undefined;

/**
 * Configuración de la API de IA, solo en el servidor. Se valida de forma diferida: un fallo
 * aquí afecta únicamente al chat con el paciente, no al resto de la aplicación.
 */
export function getIaEnv(): IaEnv {
  cached ??= parseEnv(
    iaEnvSchema,
    {
      AI_API_KEY: process.env.AI_API_KEY,
      AI_MODEL: process.env.AI_MODEL || undefined,
      AI_MODEL_RESPALDO: process.env.AI_MODEL_RESPALDO || undefined,
      AI_TEMPERATURE: process.env.AI_TEMPERATURE || undefined,
      AI_MAX_TOKENS: process.env.AI_MAX_TOKENS || undefined,
    },
    'IA'
  );
  return cached;
}
