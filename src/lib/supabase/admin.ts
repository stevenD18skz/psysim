import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { getServerEnv } from '@/lib/env/server';
import { publicEnv } from '@/lib/env/public';
import { type Database } from '@/types/database.types';

/**
 * Cliente de Supabase con la clave secreta (equivalente a `service_role`).
 *
 * OMITE las políticas RLS: úsalo solo en Route Handlers o Server Actions para operaciones
 * privilegiadas que no dependen del usuario (p. ej. persistir métricas), y nunca con datos
 * sin validar. No lee ni escribe cookies: no representa a ningún usuario.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
