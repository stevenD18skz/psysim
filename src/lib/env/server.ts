import 'server-only';

import { z } from 'zod';

import { parseEnv } from './parse';

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Variables secretas, solo accesibles desde el servidor.
 * Se validan de forma diferida para que un módulo que no las usa no falle al importarse.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseEnv(
    serverEnvSchema,
    { SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY },
    'servidor'
  );
  return cached;
}
