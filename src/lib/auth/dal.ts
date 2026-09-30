import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ROL_PERMITIDO, RUTA_ACCESO_DENEGADO, RUTA_LOGIN } from '@/lib/auth/routes';
import { createClient } from '@/lib/supabase/server';
import { type PerfilDocente } from '@/types';

export type SesionDocente =
  | { estado: 'sin-sesion' }
  | { estado: 'sin-permiso' }
  | { estado: 'autorizado'; perfil: PerfilDocente };

/**
 * Data Access Layer: verificación autoritativa de la sesión y del rol.
 *
 * A diferencia del proxy (que confía en el JWT firmado), aquí se valida la sesión contra
 * el servidor de Auth con `getUser()` —detecta sesiones cerradas o revocadas— y el rol se
 * lee de la tabla `usuario`. Se memoriza por petición con `cache`.
 */
export const obtenerSesionDocente = cache(async (): Promise<SesionDocente> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    return { estado: 'sin-sesion' };
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuario')
    .select('id, nombre, correo, codigo_institucional, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (errorPerfil) {
    // Un fallo de la base de datos no debe interpretarse como "sin permiso".
    throw new Error('No fue posible cargar el perfil del usuario.', { cause: errorPerfil });
  }

  if (!perfil || perfil.rol !== ROL_PERMITIDO) {
    return { estado: 'sin-permiso' };
  }

  return {
    estado: 'autorizado',
    perfil: {
      id: perfil.id,
      nombre: perfil.nombre,
      correo: perfil.correo,
      codigoInstitucional: perfil.codigo_institucional,
      rol: perfil.rol,
    },
  };
});

/**
 * Exige una sesión de docente válida. Redirige a /login o a /acceso-denegado si no la hay.
 * Úsalo en layouts, páginas, Server Actions y Route Handlers protegidos.
 */
export async function requerirDocente(): Promise<PerfilDocente> {
  const sesion = await obtenerSesionDocente();

  if (sesion.estado === 'sin-sesion') {
    redirect(RUTA_LOGIN);
  }
  if (sesion.estado === 'sin-permiso') {
    redirect(RUTA_ACCESO_DENEGADO);
  }

  return sesion.perfil;
}
