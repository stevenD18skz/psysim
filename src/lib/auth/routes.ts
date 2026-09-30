import { type Route } from 'next';

/** Rol de la tabla `usuario` que tiene acceso a la plataforma. */
export const ROL_PERMITIDO = 'docente';

/**
 * Nombre del claim que el Custom Access Token Hook de Supabase añade al JWT con el rol
 * del usuario (ver supabase/migrations). Permite al proxy verificar el rol sin consultar la BD.
 */
export const CLAIM_ROL = 'rol_usuario';

export const RUTA_LOGIN = '/login' satisfies Route;
export const RUTA_INICIO_DOCENTE = '/configuracion' satisfies Route;
export const RUTA_ACCESO_DENEGADO = '/acceso-denegado' satisfies Route;

/** Prefijos que exigen una sesión de docente. Incluyen todas sus subrutas. */
export const PREFIJOS_PROTEGIDOS = ['/configuracion', '/simulacion'] as const;

/** Parámetro de búsqueda con la ruta a la que volver tras iniciar sesión. */
export const PARAM_SIGUIENTE = 'siguiente';

export function esRutaProtegida(pathname: string): boolean {
  return PREFIJOS_PROTEGIDOS.some(
    prefijo => pathname === prefijo || pathname.startsWith(`${prefijo}/`)
  );
}

/**
 * Devuelve una ruta interna segura a la que redirigir tras el login.
 * Solo acepta rutas protegidas de la propia aplicación para evitar redirecciones abiertas
 * (p. ej. `//sitio-malicioso.com` o `/\sitio-malicioso.com`).
 */
export function rutaSiguienteSegura(siguiente: string | null | undefined): Route {
  if (!siguiente || !siguiente.startsWith('/') || /^\/[/\\]/.test(siguiente)) {
    return RUTA_INICIO_DOCENTE;
  }

  let url: URL;
  try {
    url = new URL(siguiente, 'http://localhost');
  } catch {
    return RUTA_INICIO_DOCENTE;
  }

  if (url.origin !== 'http://localhost' || !esRutaProtegida(url.pathname)) {
    return RUTA_INICIO_DOCENTE;
  }

  return `${url.pathname}${url.search}` as Route;
}
