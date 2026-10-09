import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../../test/supabase-falso';

import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function peticion(query: string) {
  return new NextRequest(new URL(`/auth/callback${query}`, 'http://localhost:3000'));
}

function destino(respuesta: Response) {
  const url = new URL(respuesta.headers.get('location')!);
  return `${url.pathname}${url.search}`;
}

function accesoExitoso(rol: string | null) {
  db.auth.exchangeCodeForSession.mockResolvedValueOnce({
    data: { user: { id: 'u1' } },
    error: null,
  });
  db.responder('usuario', { data: rol ? { rol } : null });
}

describe('GET /auth/callback (acceso con Google)', () => {
  it('un estudiante registrado entra y vuelve al enlace que abrió', async () => {
    accesoExitoso('estudiante');
    const respuesta = await GET(peticion('?code=abc&siguiente=%2Funirse%2Fabc-defg-hij'));

    expect(db.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(destino(respuesta)).toBe('/unirse/abc-defg-hij');
  });

  it('sin ruta pedida va a la de inicio de su rol', async () => {
    accesoExitoso('estudiante');
    expect(destino(await GET(peticion('?code=abc')))).toBe('/practicas');
    accesoExitoso('docente');
    expect(destino(await GET(peticion('?code=abc&siguiente=%2Fpracticas')))).toBe('/configuracion');
  });

  it('una cuenta sin perfil cierra la sesión y ve acceso denegado', async () => {
    accesoExitoso(null);
    expect(destino(await GET(peticion('?code=abc')))).toBe('/acceso-denegado');
    expect(db.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('un correo que ningún docente registró (signup_disabled) ve acceso denegado', async () => {
    const respuesta = await GET(
      peticion('?error=access_denied&error_code=signup_disabled&error_description=x')
    );
    expect(destino(respuesta)).toBe('/acceso-denegado');
  });

  it('si el estudiante cancela en Google, vuelve al login con el aviso', async () => {
    const respuesta = await GET(peticion('?error=access_denied&siguiente=%2Fpracticas'));
    expect(destino(respuesta)).toBe('/login?error=cancelado&siguiente=%2Fpracticas');
  });

  it('si el canje del código falla, vuelve al login', async () => {
    db.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'bad_code_verifier', status: 400 },
    });
    expect(destino(await GET(peticion('?code=abc')))).toBe('/login?error=fallo');
  });

  it('si no puede leer el perfil, cierra la sesión y vuelve al login', async () => {
    db.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { user: { id: 'u1' } },
      error: null,
    });
    db.responder('usuario', { error: { code: '500' } });
    expect(destino(await GET(peticion('?code=abc')))).toBe('/login?error=fallo');
    expect(db.auth.signOut).toHaveBeenCalled();
  });
});
