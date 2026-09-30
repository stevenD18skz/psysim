import { z } from 'zod';

import { parseEnv } from './parse';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /** Opcional: origen alternativo de los modelos 3D (p. ej. `/models` en desarrollo). */
  NEXT_PUBLIC_MODELOS_BASE_URL: z
    .string()
    .trim()
    .regex(/^(\/|https:\/\/)/, 'Debe empezar por "/" o "https://".')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

/**
 * Variables públicas (disponibles también en el navegador).
 * Cada una se referencia de forma literal para que Next.js pueda incrustarla en el bundle.
 */
export const publicEnv = parseEnv(
  publicEnvSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_MODELOS_BASE_URL: process.env.NEXT_PUBLIC_MODELOS_BASE_URL,
  },
  'públicas'
);
