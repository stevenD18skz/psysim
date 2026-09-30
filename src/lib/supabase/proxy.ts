import { type JwtPayload } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/lib/env/public';
import { type Database } from '@/types/database.types';

export interface SessionUpdate {
  /** Respuesta que continúa la petición, con las cookies de sesión refrescadas. */
  response: NextResponse;
  /** Claims del JWT verificado, o `null` si no hay una sesión válida. */
  claims: JwtPayload | null;
}

/**
 * Refresca la sesión de Supabase y devuelve los claims verificados del usuario.
 *
 * `getClaims()` valida la firma del JWT (con las claves públicas JWKS del proyecto) y
 * renueva el token si ha expirado. Un token manipulado o expirado sin posibilidad de
 * renovarse produce `claims = null`.
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdate> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Las cookies nuevas se propagan a la petición (para los Server Components de esta
          // misma petición) y a la respuesta (para el navegador).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          // Evita que una CDN almacene en caché una respuesta con el token de otro usuario.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // IMPORTANTE: no ejecutar código entre la creación del cliente y getClaims().
  const { data, error } = await supabase.auth.getClaims();

  return { response, claims: error ? null : (data?.claims ?? null) };
}

/**
 * Crea una redirección conservando las cookies y encabezados de sesión de `response`,
 * para no perder un token recién renovado.
 */
export function redirectWithSession(url: URL, response: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);

  response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }

  return redirect;
}
