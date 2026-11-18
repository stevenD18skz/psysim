import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateSession } from './proxy';
import { createClient } from './server';

/*
 * P1-04 de la auditoría: `@supabase/ssr` escribe la cookie de sesión legible desde JavaScript
 * porque espera un cliente de Supabase en el navegador. PsySim solo usa Supabase desde el servidor,
 * así que la cookie se escribe `httpOnly`: un script inyectado no podría llevarse el token.
 */
vi.mock('server-only', () => ({}));
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/env/public', () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_prueba',
  },
}));

type OpcionesCookie = Record<string, unknown>;
interface AdaptadorCookies {
  getAll(): unknown;
  setAll(
    cookies: { name: string; value: string; options: OpcionesCookie }[],
    encabezados: Record<string, string>
  ): void;
}

/** Lo que la biblioteca le pediría escribir al renovar la sesión. */
const RENOVADA = {
  name: 'sb-proyecto-auth-token',
  value: 'token-renovado',
  // Valores por defecto de `@supabase/ssr`.
  options: { path: '/', sameSite: 'lax', httpOnly: false, maxAge: 400 * 24 * 60 * 60 },
};

/** Adaptador de cookies que recibió `createServerClient` en la última llamada. */
function adaptador(): AdaptadorCookies {
  const [, , opciones] = vi.mocked(createServerClient).mock.calls.at(-1)!;
  return (opciones as unknown as { cookies: AdaptadorCookies }).cookies;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: 'u1' } }, error: null })) },
  } as never);
});

describe('cookies de sesión de Supabase', () => {
  it('el cliente del servidor las escribe httpOnly, conservando el resto de opciones', async () => {
    const almacen = { getAll: vi.fn(() => []), set: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(almacen as never);

    await createClient();
    adaptador().setAll([RENOVADA], {});

    expect(almacen.set).toHaveBeenCalledWith(RENOVADA.name, RENOVADA.value, {
      ...RENOVADA.options,
      httpOnly: true,
    });
  });

  it('en un Server Component, que no puede escribir cookies, no lanza', async () => {
    const almacen = {
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error('Cookies can only be modified in a Server Action or Route Handler.');
      }),
    };
    vi.mocked(cookies).mockResolvedValue(almacen as never);

    await createClient();
    expect(() => adaptador().setAll([RENOVADA], {})).not.toThrow();
  });

  it('el proxy las renueva httpOnly en la respuesta y las pasa a la petición', async () => {
    const peticion = new NextRequest('https://psysim.test/inicio');
    vi.mocked(createServerClient).mockImplementation(((
      _url: string,
      _clave: string,
      opciones: { cookies: AdaptadorCookies }
    ) => {
      // La biblioteca renueva el token mientras verifica la sesión.
      const cookiesDelCliente = opciones.cookies;
      return {
        auth: {
          getClaims: vi.fn(async () => {
            cookiesDelCliente.setAll([RENOVADA], { 'Cache-Control': 'private, no-store' });
            return { data: { claims: { sub: 'u1' } }, error: null };
          }),
        },
      };
    }) as never);

    const { response, claims } = await updateSession(peticion);

    expect(claims).toEqual({ sub: 'u1' });
    expect(response.cookies.get(RENOVADA.name)).toMatchObject({
      value: RENOVADA.value,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    // Los Server Components de esta misma petición ven el token nuevo.
    expect(peticion.cookies.get(RENOVADA.name)?.value).toBe(RENOVADA.value);
    // Una CDN no debe guardar una respuesta con el token de un usuario.
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('sin sesión válida el proxy no devuelve claims', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getClaims: vi.fn(async () => ({ data: null, error: { status: 401 } })) },
    } as never);
    const { claims } = await updateSession(new NextRequest('https://psysim.test/inicio'));
    expect(claims).toBeNull();
  });
});
