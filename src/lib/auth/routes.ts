import { type Route } from 'next';

import { type RolUsuario } from '@/types';

/** Roles de la tabla `usuario` con acceso a la plataforma. */
export const ROLES: readonly RolUsuario[] = ['superadmin', 'docente', 'estudiante'];

/** Nombre de cada rol en la interfaz. */
export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  superadmin: 'Administrador',
  docente: 'Docente',
  estudiante: 'Estudiante',
};

/** Roles que trabajan en el panel del docente (el Administrador también es docente). */
export const ROLES_DOCENTE: readonly RolUsuario[] = ['superadmin', 'docente'];

/**
 * Nombre del claim que el Custom Access Token Hook de Supabase añade al JWT con el rol
 * del usuario (ver supabase/migrations). Permite al proxy verificar el rol sin consultar la BD.
 */
export const CLAIM_ROL = 'rol_usuario';

export const RUTA_LOGIN = '/login' satisfies Route;
export const RUTA_INICIO_ADMIN = '/admin' satisfies Route;
export const RUTA_INICIO_DOCENTE = '/configuracion' satisfies Route;
export const RUTA_INICIO_ESTUDIANTE = '/practicas' satisfies Route;
export const RUTA_ACCESO_DENEGADO = '/acceso-denegado' satisfies Route;

/** Ruta de inicio de cada rol: a donde llega tras iniciar sesión. */
export const RUTA_INICIO: Record<RolUsuario, Route> = {
  superadmin: RUTA_INICIO_ADMIN,
  docente: RUTA_INICIO_DOCENTE,
  estudiante: RUTA_INICIO_ESTUDIANTE,
};

const PREFIJOS_DOCENTE = ['/configuracion', '/estudiantes', '/sesiones'];

/**
 * Prefijos protegidos que puede abrir cada rol (incluyen todas sus subrutas). El docente
 * prepara, asigna y revisa; el estudiante canjea su código, practica y ve su retroalimentación.
 * El Administrador gestiona a los docentes, usa las herramientas de desarrollo (laboratorio) y
 * además trabaja como docente.
 */
export const PREFIJOS_POR_ROL: Record<RolUsuario, readonly string[]> = {
  superadmin: ['/admin', '/laboratorio', ...PREFIJOS_DOCENTE],
  docente: PREFIJOS_DOCENTE,
  estudiante: ['/practicas', '/simulacion', '/unirse'],
};

/** Rutas protegidas para cualquier rol (redirigen a la ruta de inicio de cada uno). */
const PREFIJOS_COMUNES = ['/inicio'] as const;

/** Parámetro de búsqueda con la ruta a la que volver tras iniciar sesión. */
export const PARAM_SIGUIENTE = 'siguiente';

function coincide(pathname: string, prefijo: string) {
  return pathname === prefijo || pathname.startsWith(`${prefijo}/`);
}

export function esRol(valor: unknown): valor is RolUsuario {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

/** Roles que pueden abrir la ruta, `'cualquiera'` si basta con tener rol, o `null` si es pública. */
export function rolesDeRuta(pathname: string): readonly RolUsuario[] | 'cualquiera' | null {
  const roles = ROLES.filter(rol =>
    PREFIJOS_POR_ROL[rol].some(prefijo => coincide(pathname, prefijo))
  );
  if (roles.length > 0) return roles;
  return PREFIJOS_COMUNES.some(prefijo => coincide(pathname, prefijo)) ? 'cualquiera' : null;
}

export function esRutaProtegida(pathname: string): boolean {
  return rolesDeRuta(pathname) !== null;
}

/** ¿Puede el rol abrir la ruta? */
export function rolPuedeAbrir(rol: RolUsuario, pathname: string): boolean {
  const permitidos = rolesDeRuta(pathname);
  return permitidos === 'cualquiera' || (permitidos?.includes(rol) ?? false);
}

/**
 * Devuelve una ruta interna segura a la que redirigir tras el login.
 * Solo acepta rutas protegidas que el rol puede abrir, para evitar redirecciones abiertas
 * (p. ej. `//sitio-malicioso.com` o `/\sitio-malicioso.com`) y rebotes entre paneles.
 */
export function rutaSiguienteSegura(
  siguiente: string | null | undefined,
  rol: RolUsuario = 'docente'
): Route {
  const inicio = RUTA_INICIO[rol];
  if (!siguiente || !siguiente.startsWith('/') || /^\/[/\\]/.test(siguiente)) {
    return inicio;
  }

  let url: URL;
  try {
    url = new URL(siguiente, 'http://localhost');
  } catch {
    return inicio;
  }

  if (url.origin !== 'http://localhost' || !esRutaProtegida(url.pathname)) {
    return inicio;
  }
  if (!rolPuedeAbrir(rol, url.pathname)) {
    return inicio;
  }

  return `${url.pathname}${url.search}` as Route;
}
