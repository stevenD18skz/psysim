'use server';

import { redirect } from 'next/navigation';

import { ROL_PERMITIDO, RUTA_ACCESO_DENEGADO, rutaSiguienteSegura } from '@/lib/auth/routes';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/schemas/auth.schema';

export interface ResultadoLogin {
  error: string;
}

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';
const MENSAJE_LIMITE = 'Demasiados intentos de inicio de sesión. Espera unos minutos.';
const MENSAJE_GENERICO = 'No fue posible iniciar sesión. Inténtalo de nuevo.';

/**
 * HU-02: inicia la sesión del docente con Supabase Auth.
 *
 * Supabase escribe el token de sesión en cookies (vía @supabase/ssr), por lo que la sesión
 * sobrevive a recargas y nuevas pestañas. Si tiene éxito, redirige y no devuelve nada.
 */
export async function iniciarSesion(
  valores: unknown,
  siguiente?: string | null
): Promise<ResultadoLogin> {
  // Los datos del cliente nunca son confiables: se vuelven a validar en el servidor.
  const datos = loginSchema.safeParse(valores);
  if (!datos.success) {
    return { error: 'Revisa los datos del formulario.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: datos.data.correo,
    password: datos.data.contrasena,
  });

  if (error) {
    // Mensaje genérico: no se revela si falló el correo o la contraseña.
    if (error.code === 'invalid_credentials' || error.code === 'email_not_confirmed') {
      return { error: MENSAJE_CREDENCIALES };
    }
    if (error.status === 429) {
      return { error: MENSAJE_LIMITE };
    }
    console.error('[auth] Error inesperado al iniciar sesión:', error.code ?? error.status);
    return { error: MENSAJE_GENERICO };
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', data.user.id)
    .maybeSingle();

  if (errorPerfil) {
    await supabase.auth.signOut({ scope: 'local' });
    console.error('[auth] No se pudo leer el perfil tras el login:', errorPerfil.code);
    return { error: MENSAJE_GENERICO };
  }

  if (perfil?.rol !== ROL_PERMITIDO) {
    // Credenciales válidas pero sin rol de docente: no se deja una sesión abierta.
    await supabase.auth.signOut({ scope: 'local' });
    redirect(RUTA_ACCESO_DENEGADO);
  }

  redirect(rutaSiguienteSegura(siguiente));
}

/**
 * HU-04: cierra la sesión en este dispositivo. Invalida el refresh token en Supabase y
 * elimina las cookies de sesión. La limpieza del store y la navegación las hace el cliente.
 */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    // signOut elimina las cookies locales aunque falle la revocación remota.
    console.error('[auth] Error al revocar la sesión:', error.code ?? error.status);
  }
}
