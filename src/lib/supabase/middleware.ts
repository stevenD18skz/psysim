import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware para manejar la sesión de Supabase en las rutas protegidas
 *
 * Este middleware:
 * 1. Refresca la sesión de Supabase si es necesario
 * 2. Protege las rutas bajo /(protected)/*
 * 3. Redirige usuarios no autenticados a /login
 * 4. Redirige usuarios autenticados lejos de /login
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANTE: No escribas código entre createServerClient y supabase.auth.getUser()
  // Se ejecutará un refresh de la sesión si ha expirado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protección de rutas
  const pathname = request.nextUrl.pathname;

  // Rutas protegidas (bajo /(protected) pero en URL se ven sin el grupo)
  const protectedRoutes = ['/inicio', '/configuracion', '/simulacion', '/resultados', '/perfil'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Ruta de login
  const isLoginRoute = pathname === '/login' || pathname.startsWith('/(auth)');

  // Si intenta acceder a una ruta protegida sin autenticación
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está autenticado y va al login, redirigir al inicio
  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  return supabaseResponse;
}
