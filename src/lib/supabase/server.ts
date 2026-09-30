import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { publicEnv } from '@/lib/env/public';
import { type Database } from '@/types/database.types';

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Actúa en nombre del usuario autenticado (sesión leída de las cookies) con la clave
 * publicable, por lo que RLS se aplica. Debe crearse uno nuevo por petición.
 * Para operaciones privilegiadas usa `createAdminClient` de `./admin`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Los Server Components no pueden escribir cookies. Es seguro ignorarlo porque
            // el proxy (src/proxy.ts) ya refresca la sesión en cada petición.
          }
        },
      },
    }
  );
}
