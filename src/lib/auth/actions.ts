'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { DOMINIO_ESTUDIANTES } from '@/lib/auth/google';
import {
  esRol,
  PARAM_SIGUIENTE,
  RUTA_ACCESO_DENEGADO,
  rutaSiguienteSegura,
} from '@/lib/auth/routes';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/schemas/auth.schema';

export interface ResultadoLogin {
  error: string;
}

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';
const MENSAJE_LIMITE = 'Demasiados intentos de inicio de sesión. Espera unos minutos.';
const MENSAJE_GENERICO = 'No fue posible iniciar sesión. Inténtalo de nuevo.';

/**
 * HU-02: inicia la sesión con correo y contraseña (docentes y cuentas de prueba).
 *
 * Supabase escribe el token de sesión en cookies (vía @supabase/ssr), por lo que la sesión
 * sobrevive a recargas y nuevas pestañas. Si tiene éxito, redirige a la ruta de inicio del rol
 * y no devuelve nada.
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

  if (!esRol(perfil?.rol)) {
    // Credenciales válidas pero sin rol en la plataforma: no se deja una sesión abierta.
    await supabase.auth.signOut({ scope: 'local' });
    redirect(RUTA_ACCESO_DENEGADO);
  }

  redirect(rutaSiguienteSegura(siguiente, perfil.rol));
}

/** Origen de la petición (p. ej. `https://psysim.vercel.app`), para la URL de retorno de OAuth. */
async function origenDePeticion(): Promise<string> {
  const encabezados = await headers();
  const origen = encabezados.get('origin');
  if (origen) return origen;
  const host = encabezados.get('x-forwarded-host') ?? encabezados.get('host') ?? 'localhost:3000';
  const protocolo = encabezados.get('x-forwarded-proto') ?? 'http';
  return `${protocolo}://${host}`;
}

/**
 * Inicio de sesión de los estudiantes con su cuenta de Google institucional.
 *
 * Supabase guarda el verificador PKCE en una cookie y devuelve la URL de Google; al volver, la
 * ruta /auth/callback canjea el código por la sesión. `hd` sugiere a Google la cuenta
 * @correounivalle.edu.co (la restricción real es que el docente haya registrado el correo).
 */
export async function iniciarSesionConGoogle(siguiente?: string | null): Promise<ResultadoLogin> {
  const supabase = await createClient();
  const retorno = new URL('/auth/callback', await origenDePeticion());
  if (siguiente) retorno.searchParams.set(PARAM_SIGUIENTE, siguiente);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: retorno.toString(),
      queryParams: { hd: DOMINIO_ESTUDIANTES, prompt: 'select_account' },
    },
  });

  if (error || !data.url) {
    console.error('[auth] No se pudo iniciar el acceso con Google:', error?.code ?? error?.status);
    return { error: 'No fue posible conectar con Google. Inténtalo de nuevo.' };
  }

  redirect(data.url as never);
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
