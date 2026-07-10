import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { User } from '@/types';

/**
 * Cliente de Supabase para el servidor (Server Components y Route Handlers)
 * Usa la SERVICE_ROLE_KEY para operaciones privilegiadas
 *
 * IMPORTANTE: Este cliente solo debe usarse en:
 * - Server Components
 * - Route Handlers (app/api/*)
 * - Server Actions
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
            // La cookie no puede ser modificada en un Server Component
            // Esto es normal y no requiere manejo especial
          }
        },
      },
    }
  );
}

/**
 * Versión cacheada del cliente del servidor para Server Components
 * Evita múltiples instanciaciones en el mismo render
 */
export const createCachedClient = cache(async () => {
  return await createClient();
});

/**
 * Helper para obtener el usuario actual desde el servidor
 * Usa el token de la cookie para validar la sesión
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email!,
    role: user.user_metadata?.role || 'teacher',
    created_at: user.created_at,
  };
}

/**
 * Helper para verificar si el usuario tiene rol de administrador
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Helper para realizar consultas privilegiadas a la base de datos
 * Solo disponible en el servidor con SERVICE_ROLE_KEY
 */
export async function queryDatabase<T>(
  query: (
    supabase: Awaited<ReturnType<typeof createClient>>
  ) => Promise<{ data: T | null; error: unknown }>
): Promise<{ data: T | null; error: unknown }> {
  const supabase = await createClient();
  return await query(supabase);
}
