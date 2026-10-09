import { type JwtPayload } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ProxyModule from '@/lib/supabase/proxy';
import { updateSession } from '@/lib/supabase/proxy';

import { proxy } from './proxy';

vi.mock('@/lib/supabase/proxy', async importOriginal => ({
  ...(await importOriginal<typeof ProxyModule>()),
  updateSession: vi.fn(),
}));

const mockUpdateSession = vi.mocked(updateSession);

function conSesion(claims: Partial<JwtPayload> | null) {
  const response = NextResponse.next();
  response.cookies.set('sb-test-auth-token', 'renovado');
  mockUpdateSession.mockResolvedValue({ response, claims: claims as JwtPayload | null });
  return response;
}

function peticion(ruta: string) {
  return new NextRequest(new URL(ruta, 'http://localhost:3000'));
}

describe('proxy', () => {
  beforeEach(() => {
    mockUpdateSession.mockReset();
  });

  it('deja pasar las rutas públicas aunque no haya sesión', async () => {
    const response = conSesion(null);
    expect(await proxy(peticion('/login'))).toBe(response);
    expect(await proxy(peticion('/'))).toBe(response);
  });

  it('redirige a /login sin sesión, conservando la ruta solicitada', async () => {
    conSesion(null);
    const res = await proxy(peticion('/simulacion/sesion?x=1'));

    expect(res.status).toBe(307);
    const destino = new URL(res.headers.get('location')!);
    expect(destino.pathname).toBe('/login');
    expect(destino.searchParams.get('siguiente')).toBe('/simulacion/sesion?x=1');
  });

  it('redirige a /acceso-denegado si el JWT no trae un rol de la plataforma', async () => {
    conSesion({ sub: 'u1', rol_usuario: undefined });
    const res = await proxy(peticion('/configuracion'));

    expect(new URL(res.headers.get('location')!).pathname).toBe('/acceso-denegado');
  });

  it.each([
    ['un estudiante abre una ruta del docente', 'estudiante', '/sesiones/abc', '/practicas'],
    [
      'un docente abre una ruta del estudiante',
      'docente',
      '/simulacion?sesion=1',
      '/configuracion',
    ],
  ])('si %s, lo lleva a su ruta de inicio', async (_, rol, ruta, destino) => {
    conSesion({ sub: 'u1', rol_usuario: rol });
    const res = await proxy(peticion(ruta));
    expect(new URL(res.headers.get('location')!).pathname).toBe(destino);
  });

  it('permite el acceso de un estudiante a sus rutas', async () => {
    const response = conSesion({ sub: 'u1', rol_usuario: 'estudiante' });
    expect(await proxy(peticion('/practicas'))).toBe(response);
    expect(await proxy(peticion('/unirse/abc-defg-hij'))).toBe(response);
  });

  it('permite el acceso a un docente', async () => {
    const response = conSesion({ sub: 'u1', rol_usuario: 'docente' });
    expect(await proxy(peticion('/configuracion'))).toBe(response);
  });

  it('conserva las cookies de sesión renovadas al redirigir', async () => {
    conSesion(null);
    const res = await proxy(peticion('/configuracion'));
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('renovado');
  });
});
