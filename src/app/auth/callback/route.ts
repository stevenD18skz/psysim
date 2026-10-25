import { type NextRequest, NextResponse } from 'next/server';

import { type ErrorGoogle, PARAM_ERROR_LOGIN } from '@/lib/auth/google';
import {
  esRol,
  PARAM_SIGUIENTE,
  RUTA_ACCESO_DENEGADO,
  RUTA_LOGIN,
  rutaSiguienteSegura,
} from '@/lib/auth/routes';
import {
  COOKIE_ENTREGA,
  leerEntrega,
  PARAM_CUENTA_RECHAZADA,
  RUTA_ENTREGA,
} from '@/lib/equipo-compartido/entrega';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/log';

/**
 * Retorno del inicio de sesión con Google (flujo PKCE de Supabase).
 *
 * 1. Canjea el código por la sesión (las cookies las escribe el cliente de Supabase).
 * 2. Solo entran las cuentas con perfil: el docente registró al estudiante con ese correo
 *    (la plataforma no admite registros abiertos: Supabase rechaza los correos desconocidos con
 *    `signup_disabled`).
 * 3. En un equipo entregado a un estudiante (modo presencial) solo entra una cuenta de
 *    estudiante: si alguien elige en Google la cuenta del docente, se cierra y vuelve a la entrega.
 * 4. Redirige a la ruta pedida antes del login, si el rol puede abrirla, o a la de inicio del rol.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const codigo = searchParams.get('code');
  const siguiente = searchParams.get(PARAM_SIGUIENTE);

  const aLogin = (motivo: ErrorGoogle) => {
    const url = new URL(RUTA_LOGIN, request.url);
    url.searchParams.set(PARAM_ERROR_LOGIN, motivo);
    if (siguiente) url.searchParams.set(PARAM_SIGUIENTE, siguiente);
    return NextResponse.redirect(url);
  };
  const aAccesoDenegado = () => NextResponse.redirect(new URL(RUTA_ACCESO_DENEGADO, request.url));

  if (!codigo) {
    // Correo que ningún docente ha registrado: Supabase no crea cuentas nuevas.
    if (searchParams.get('error_code') === 'signup_disabled') return aAccesoDenegado();
    return aLogin(searchParams.get('error') === 'access_denied' ? 'cancelado' : 'fallo');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error || !data.user) {
    log.error('auth.google_no_completado', { codigo: error?.code ?? error?.status });
    return aLogin('fallo');
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', data.user.id)
    .maybeSingle();

  if (errorPerfil) {
    await supabase.auth.signOut({ scope: 'local' });
    log.error('auth.perfil_no_leido', { origen: 'google', codigo: errorPerfil.code });
    return aLogin('fallo');
  }

  if (!esRol(perfil?.rol)) {
    await supabase.auth.signOut({ scope: 'local' });
    return aAccesoDenegado();
  }

  if (perfil.rol !== 'estudiante' && leerEntrega(request.cookies.get(COOKIE_ENTREGA)?.value)) {
    await supabase.auth.signOut({ scope: 'local' });
    const url = new URL(RUTA_ENTREGA, request.url);
    url.searchParams.set(PARAM_CUENTA_RECHAZADA, '1');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(rutaSiguienteSegura(siguiente, perfil.rol), request.url));
}
