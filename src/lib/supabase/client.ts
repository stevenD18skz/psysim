import { createBrowserClient } from '@supabase/ssr';
import { User } from '@/types';

/**
 * Cliente de Supabase para el navegador
 * Usa la ANON_KEY para operaciones de autenticación desde el cliente
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Helper para obtener el usuario actual desde el cliente
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
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
 * Helper para iniciar sesión con email y contraseña
 */
export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Helper para cerrar sesión
 */
export async function signOut() {
  const supabase = createClient();
  return await supabase.auth.signOut();
}
