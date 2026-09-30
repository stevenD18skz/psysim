import { type NextRequest } from 'next/server';

import {
  CLAIM_ROL,
  PARAM_SIGUIENTE,
  ROL_PERMITIDO,
  RUTA_ACCESO_DENEGADO,
  RUTA_LOGIN,
  esRutaProtegida,
} from '@/lib/auth/routes';
import { redirectWithSession, updateSession } from '@/lib/supabase/proxy';

/**
 * Proxy de Next.js (antes `middleware`). Se ejecuta antes de renderizar cada ruta y:
 * 1. Refresca la sesión de Supabase en todas las peticiones.
 * 2. En rutas protegidas, redirige a /login si no hay sesión válida.
 * 3. En rutas protegidas, redirige a /acceso-denegado si el rol del JWT no es `docente`.
 *
 * Es una verificación optimista basada en el JWT firmado (sin consultar la BD). La
 * verificación definitiva contra la tabla `usuario` ocurre en el layout protegido
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

  if (claims[CLAIM_ROL] !== ROL_PERMITIDO) {
    return redirectWithSession(new URL(RUTA_ACCESO_DENEGADO, request.url), response);
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
