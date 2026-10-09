import { type Route } from 'next';

import { type RolUsuario } from '@/types';

/** Roles de la tabla `usuario` con acceso a la plataforma. */
export const ROLES: readonly RolUsuario[] = ['docente', 'estudiante'];

/**
 * Nombre del claim que el Custom Access Token Hook de Supabase añade al JWT con el rol
 * del usuario (ver supabase/migrations). Permite al proxy verificar el rol sin consultar la BD.
 */
export const CLAIM_ROL = 'rol_usuario';

export const RUTA_LOGIN = '/login' satisfies Route;
export const RUTA_INICIO_DOCENTE = '/configuracion' satisfies Route;
export const RUTA_INICIO_ESTUDIANTE = '/practicas' satisfies Route;
export const RUTA_ACCESO_DENEGADO = '/acceso-denegado' satisfies Route;

/** Ruta de inicio de cada rol: a donde llega tras iniciar sesión. */
export const RUTA_INICIO: Record<RolUsuario, Route> = {
  docente: RUTA_INICIO_DOCENTE,
  estudiante: RUTA_INICIO_ESTUDIANTE,
};

/**
 * Prefijos protegidos y el rol que puede abrirlos (incluyen todas sus subrutas). El docente
 * prepara, asigna y revisa; el estudiante canjea su código, practica y ve su retroalimentación.
 */
export const PREFIJOS_POR_ROL: Record<RolUsuario, readonly string[]> = {
  docente: ['/configuracion', '/estudiantes', '/sesiones', '/laboratorio'],
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

/** Rol que puede abrir la ruta, `'cualquiera'` si basta con tener rol, o `null` si es pública. */
export function rolDeRuta(pathname: string): RolUsuario | 'cualquiera' | null {
  for (const rol of ROLES) {
    if (PREFIJOS_POR_ROL[rol].some(prefijo => coincide(pathname, prefijo))) return rol;
  }
  return PREFIJOS_COMUNES.some(prefijo => coincide(pathname, prefijo)) ? 'cualquiera' : null;
}

export function esRutaProtegida(pathname: string): boolean {
  return rolDeRuta(pathname) !== null;
}

/** ¿Puede el rol abrir la ruta? */
export function rolPuedeAbrir(rol: RolUsuario, pathname: string): boolean {
  const requerido = rolDeRuta(pathname);
  return requerido === 'cualquiera' || requerido === rol;
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
