import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { CODIGO_PG } from '@/lib/acciones';
import { entradasDeAcceso, esCuentaDePrueba } from '@/lib/auth/metodo-acceso';
import {
  esRol,
  ROLES_DOCENTE,
  RUTA_ACCESO_DENEGADO,
  RUTA_CAMBIAR_CONTRASENA,
  RUTA_INICIO,
  RUTA_LOGIN,
} from '@/lib/auth/routes';
import { esAvatarId } from '@/lib/avatares/catalogo';
import { googleDuranteLaEntrega, leerVentanaDeEntrega } from '@/lib/equipo-compartido/ventana';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { type PerfilUsuario, type RolUsuario } from '@/types';

export type SesionUsuario =
  | { estado: 'sin-sesion' }
  | { estado: 'sin-permiso' }
  | { estado: 'autorizado'; perfil: PerfilUsuario };

const COLUMNAS_PERFIL =
  'id, nombre, correo, codigo_institucional, rol, activo, contrasena_temporal';

/**
 * Data Access Layer: verificación autoritativa de la sesión y del rol.
 *
 * A diferencia del proxy (que confía en el JWT firmado), aquí se valida la sesión contra
 * el servidor de Auth con `getUser()` —detecta sesiones cerradas o revocadas— y el rol se
 * lee de la tabla `usuario`. Una cuenta desactivada por el Administrador no tiene permiso aunque
 * su JWT aún no haya caducado. Se memoriza por petición con `cache`.
 *
 * El perfil se lee con la clave secreta, filtrado por el id que confirmó el servidor de Auth: el
 * cliente solo puede leer `id`, `nombre` y `rol` de `usuario` (así el estudiante no ve el correo
 * ni el estado de la cuenta de sus docentes).
 *
 * El estudiante entra con Google. La acción de cambiar contraseña no le deja crearse una, pero la
 * API de Supabase Auth sí acepta una contraseña nueva de cualquiera que tenga un token de sesión:
 * quien encontrara su sesión abierta podría crearle esa segunda puerta. Por eso una sesión de
 * estudiante abierta con contraseña no tiene permiso (salvo las cuentas de prueba).
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

  const admin = createAdminClient();
  const consultaPerfil = await admin
    .from('usuario')
    .select(`${COLUMNAS_PERFIL}, avatar_id`)
    .eq('id', user.id)
    .maybeSingle();
  // Un entorno con la migración del avatar pendiente todavía puede iniciar sesión.
  const { data: perfil, error: errorPerfil } =
    consultaPerfil.error?.code === CODIGO_PG.UNDEFINED_COLUMN
      ? await admin.from('usuario').select(COLUMNAS_PERFIL).eq('id', user.id).maybeSingle()
      : consultaPerfil;

  if (errorPerfil) {
    // Un fallo de la base de datos no debe interpretarse como "sin permiso".
    throw new Error('No pudimos cargar el perfil del usuario.', { cause: errorPerfil });
  }

  if (!perfil || !perfil.activo || !esRol(perfil.rol)) {
    return { estado: 'sin-permiso' };
  }

  // El token es el de la sesión que `getUser()` acaba de validar con el servidor de Auth.
  const { data: sesion } = await supabase.auth.getSession();
  const entradas = entradasDeAcceso(sesion.session?.access_token);
  const entroCon = (metodo: string) => entradas.some(entrada => entrada.metodo === metodo);

  if (perfil.rol === 'estudiante') {
    if (!esCuentaDePrueba(perfil.correo) && entroCon('password')) {
      log.warn('auth.estudiante_con_contrasena', { usuario_id: perfil.id });
      return { estado: 'sin-permiso' };
    }
  } else if (entroCon('oauth')) {
    // Modo presencial: tras entregar su equipo, la cuenta del docente no vale con una sesión de
    // Google abierta después de la entrega (`ventana.ts`). `/auth/callback` ya lo rechaza con su
    // aviso; esto cubre una sesión conseguida sin pasar por ahí. Solo cuesta una lectura a quien
    // entró con Google.
    const entregaHasta = await leerVentanaDeEntrega(perfil.id);
    if (entregaHasta === undefined) return { estado: 'sin-permiso' };
    if (googleDuranteLaEntrega(entregaHasta, entradas)) {
      log.warn('auth.google_tras_entregar_el_equipo', { usuario_id: perfil.id });
      return { estado: 'sin-permiso' };
    }
  }

  return {
    estado: 'autorizado',
    perfil: {
      id: perfil.id,
      nombre: perfil.nombre,
      correo: perfil.correo,
      codigoInstitucional: perfil.codigo_institucional,
      rol: perfil.rol,
      avatarId: 'avatar_id' in perfil && esAvatarId(perfil.avatar_id) ? perfil.avatar_id : null,
      contrasenaTemporal: perfil.contrasena_temporal,
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

/**
 * ¿La cuenta sigue con la contraseña temporal que generó el Administrador? Mientras sea así, el
 * panel del docente no abre nada más que el cambio de contraseña: una temporal suele viajar por
 * un chat o un correo, y quien la haya visto entraría a la cuenta mientras siga sirviendo.
 * El estudiante no entra con contraseña, así que no aplica.
 */
export function debeCambiarContrasena(perfil: Pick<PerfilUsuario, 'rol' | 'contrasenaTemporal'>) {
  return perfil.contrasenaTemporal && ROLES_DOCENTE.includes(perfil.rol);
}

/**
 * Exige uno de los roles indicados. Con otro rol válido, lleva a la ruta de inicio de ese rol; con
 * la contraseña temporal sin cambiar, a cambiarla (también desde una Server Action).
 */
async function requerirRol(roles: readonly RolUsuario[]): Promise<PerfilUsuario> {
  const perfil = await requerirUsuario();
  if (!roles.includes(perfil.rol)) {
    redirect(RUTA_INICIO[perfil.rol]);
  }
  if (debeCambiarContrasena(perfil)) {
    redirect(RUTA_CAMBIAR_CONTRASENA);
  }
  return perfil;
}

/**
 * Exige una sesión de docente (o del Administrador, que también es docente). Úsalo en las
 * páginas, Server Actions y Route Handlers del panel del docente (configurar, asignar, revisar).
 */
export function requerirDocente(): Promise<PerfilUsuario> {
  return requerirRol(ROLES_DOCENTE);
}

/** Exige una sesión de estudiante (canjear códigos, practicar y ver su retroalimentación). */
export function requerirEstudiante(): Promise<PerfilUsuario> {
  return requerirRol(['estudiante']);
}

/** Exige una sesión del Administrador (gestión de docentes y herramientas de desarrollo). */
export function requerirSuperadmin(): Promise<PerfilUsuario> {
  return requerirRol(['superadmin']);
}
