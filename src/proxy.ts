import { type NextRequest } from 'next/server';

import {
  CLAIM_ROL,
  esRol,
  PARAM_SIGUIENTE,
  RUTA_ACCESO_DENEGADO,
  RUTA_INICIO,
  RUTA_LOGIN,
  rolPuedeAbrir,
  esRutaProtegida,
} from '@/lib/auth/routes';
import { redirectWithSession, updateSession } from '@/lib/supabase/proxy';

/**
 * Proxy de Next.js (antes `middleware`). Se ejecuta antes de renderizar cada ruta y:
 * 1. Refresca la sesión de Supabase en todas las peticiones.
 * 2. En rutas protegidas, redirige a /login si no hay sesión válida.
 * 3. Redirige a /acceso-denegado si el JWT no trae un rol de la plataforma.
 * 4. Si la ruta es del otro rol (p. ej. un estudiante abre /configuracion), lleva a la ruta de
 *    inicio de su propio rol.
 *
 * Es una verificación optimista basada en el JWT firmado (sin consultar la BD). La
 * verificación definitiva contra la tabla `usuario` ocurre en los layouts y páginas
 * (ver src/lib/auth/dal.ts).
 */
export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!esRutaProtegida(pathname)) {
    return response;
  }

  if (!claims) {
    const loginUrl = new URL(RUTA_LOGIN, request.url);
    loginUrl.searchParams.set(PARAM_SIGUIENTE, `${pathname}${search}`);
    return redirectWithSession(loginUrl, response);
  }

  const rol = claims[CLAIM_ROL];
  if (!esRol(rol)) {
    return redirectWithSession(new URL(RUTA_ACCESO_DENEGADO, request.url), response);
  }

  if (!rolPuedeAbrir(rol, pathname)) {
    return redirectWithSession(new URL(RUTA_INICIO[rol], request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    // Todas las rutas excepto recursos estáticos, optimización de imágenes y archivos
    // públicos (imágenes, modelos 3D, escenas JSON, etc.).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|glb|gltf|bin|ktx2|hdr|json|txt|xml)$).*)',
  ],
};
