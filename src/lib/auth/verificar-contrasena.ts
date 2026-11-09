import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { publicEnv } from '@/lib/env/public';

/**
 * Comprueba la contraseña actual antes de cambiarla. Sin esto, quien encuentre una sesión abierta
 * en un equipo compartido podría ponerle una contraseña nueva a la cuenta y quedarse con ella.
 *
 * Usa un cliente aparte, sin cookies: el inicio de sesión de prueba no reemplaza la sesión del
 * navegador, y se cierra en el acto para no dejar una sesión huérfana. Devuelve `null` si la
 * contraseña es correcta, o el código de error de Supabase.
 */
export async function verificarContrasenaActual(
  correo: string,
  contrasena: string
): Promise<string | null> {
  const supabase = createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) return error.code ?? String(error.status ?? 'desconocido');
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}
