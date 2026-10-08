import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { esRol, RUTA_ACCESO_DENEGADO, RUTA_INICIO, RUTA_LOGIN } from '@/lib/auth/routes';
import { createClient } from '@/lib/supabase/server';
import { type PerfilUsuario, type RolUsuario } from '@/types';

export type SesionUsuario =
  | { estado: 'sin-sesion' }
  | { estado: 'sin-permiso' }
  | { estado: 'autorizado'; perfil: PerfilUsuario };

/**
 * Data Access Layer: verificación autoritativa de la sesión y del rol.
 *
 * A diferencia del proxy (que confía en el JWT firmado), aquí se valida la sesión contra
 * el servidor de Auth con `getUser()` —detecta sesiones cerradas o revocadas— y el rol se
 * lee de la tabla `usuario`. Se memoriza por petición con `cache`.
 */
export const obtenerSesionUsuario = cache(async (): Promise<SesionUsuario> => {
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

  if (!perfil || !esRol(perfil.rol)) {
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
 * Exige una sesión válida con cualquier rol. Redirige a /login o a /acceso-denegado si no la hay.
 */
export async function requerirUsuario(): Promise<PerfilUsuario> {
  const sesion = await obtenerSesionUsuario();

  if (sesion.estado === 'sin-sesion') {
    redirect(RUTA_LOGIN);
  }
  if (sesion.estado === 'sin-permiso') {
    redirect(RUTA_ACCESO_DENEGADO);
  }

  return sesion.perfil;
}

/** Exige el rol indicado. Con otro rol válido, lleva a la ruta de inicio de ese rol. */
async function requerirRol(rol: RolUsuario): Promise<PerfilUsuario> {
  const perfil = await requerirUsuario();
  if (perfil.rol !== rol) {
    redirect(RUTA_INICIO[perfil.rol]);
  }
  return perfil;
}

/**
 * Exige una sesión de docente. Úsalo en las páginas, Server Actions y Route Handlers del panel
 * del docente (configurar, asignar, revisar).
 */
export function requerirDocente(): Promise<PerfilUsuario> {
  return requerirRol('docente');
}

/** Exige una sesión de estudiante (canjear códigos, practicar y ver su retroalimentación). */
export function requerirEstudiante(): Promise<PerfilUsuario> {
  return requerirRol('estudiante');
}
