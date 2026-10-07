import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { obtenerSesionDocente, requerirDocente } from './dal';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((ruta: string) => {
    throw new Error(`NEXT_REDIRECT:${ruta}`);
  }),
}));

const USUARIO = { id: 'd0c3e7e4-0000-4000-8000-000000000001' };
const PERFIL = {
  id: USUARIO.id,
  nombre: 'Ana Gómez',
  correo: 'ana@correounivalle.edu.co',
  codigo_institucional: 'DOC-1',
  rol: 'docente',
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
});

function conUsuario() {
  db.auth.getUser.mockResolvedValueOnce({ data: { user: USUARIO }, error: null });
}

describe('obtenerSesionDocente (DAL)', () => {
  it('sin usuario válido (sesión cerrada o revocada) es sin-sesion', async () => {
    db.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { status: 401 } });
    expect(await obtenerSesionDocente()).toEqual({ estado: 'sin-sesion' });
  });

  it('con perfil docente devuelve el perfil como DTO', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL });

    expect(await obtenerSesionDocente()).toEqual({
      estado: 'autorizado',
      perfil: {
        id: USUARIO.id,
        nombre: 'Ana Gómez',
        correo: 'ana@correounivalle.edu.co',
        codigoInstitucional: 'DOC-1',
        rol: 'docente',
      },
    });
  });

  it.each([
    ['sin perfil', null],
    ['con otro rol', { ...PERFIL, rol: 'estudiante' }],
  ])('%s es sin-permiso', async (_, perfil) => {
    conUsuario();
    db.responder('usuario', { data: perfil });
    expect(await obtenerSesionDocente()).toEqual({ estado: 'sin-permiso' });
  });

  it('un fallo de la base de datos no se confunde con "sin permiso"', async () => {
    conUsuario();
    db.responder('usuario', { error: { code: '500' } });
    await expect(obtenerSesionDocente()).rejects.toThrow('No fue posible cargar el perfil');
  });
});

describe('requerirDocente', () => {
  it('devuelve el perfil del docente', async () => {
    conUsuario();
    db.responder('usuario', { data: PERFIL });
    expect(await requerirDocente()).toMatchObject({ nombre: 'Ana Gómez' });
  });

  it('sin sesión redirige a /login', async () => {
    await expect(requerirDocente()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('sin rol docente redirige a /acceso-denegado', async () => {
    conUsuario();
    db.responder('usuario', { data: null });
    await expect(requerirDocente()).rejects.toThrow('NEXT_REDIRECT:/acceso-denegado');
  });
});
