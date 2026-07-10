import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware de Next.js para PsySim
 *
 * Este archivo exporta el middleware que maneja:
 * - Autenticación y sesiones de Supabase
 * - Protección de rutas privadas
 * - Redirecciones basadas en el estado de autenticación
 *
 * El matcher configura qué rutas deben pasar por el middleware.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Configuración del matcher para el middleware
 *
 * Excluye archivos estáticos y api routes para mejor rendimiento
 * Incluye todas las rutas protegidas y de autenticación
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
