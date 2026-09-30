import { createBrowserClient } from '@supabase/ssr';

import { publicEnv } from '@/lib/env/public';
import { type Database } from '@/types/database.types';

/**
 * Cliente de Supabase para Client Components.
 * Usa la clave publicable: todas sus consultas están sujetas a las políticas RLS.
 * `createBrowserClient` reutiliza una única instancia en el navegador.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
