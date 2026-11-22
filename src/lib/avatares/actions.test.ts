import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerSesionUsuario, type SesionUsuario } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabase/admin';
import { type PerfilUsuario } from '@/types';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { guardarAvatar } from './actions';

vi.mock(import('@/lib/auth/dal'), async importOriginal => ({
  ...(await importOriginal()),
  obtenerSesionUsuario: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

const PERFIL: PerfilUsuario = {
  id: 'mi-cuenta',
  nombre: 'Ana Gómez',
  correo: 'ana@correounivalle.edu.co',
  codigoInstitucional: 'DOC-1',
  rol: 'docente',
  avatarId: null,
  contrasenaTemporal: false,
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(db.cliente as never);
  vi.mocked(obtenerSesionUsuario).mockResolvedValue({
    estado: 'autorizado',
    segundosRestantes: 1800,
    perfil: PERFIL,
  });
});

describe('guardarAvatar', () => {
  it.each(['brote', null] as const)('actualiza %s en la fila de la sesión verificada', async id => {
    db.responder('usuario', { data: { id: PERFIL.id } });
    expect(await guardarAvatar(id, PERFIL.id)).toEqual({ ok: true, datos: id });
    expect(db.de('usuario')).toEqual([
      {
        tabla: 'usuario',
        operacion: 'update',
        valores: { avatar_id: id },
        columnas: 'id',
        filtros: [
          ['eq', 'id', PERFIL.id],
          ['eq', 'activo', true],
          ['eq', 'rol', PERFIL.rol],
          ['eq', 'contrasena_temporal', false],
        ],
      },
    ]);
  });

  it.each(['constructor', '', 'https://ejemplo.com/imagen.jpg', { avatarId: 'brote' }])(
    'rechaza una opción ajena al catálogo (%j)',
    async id => {
      expect(await guardarAvatar(id, PERFIL.id)).toMatchObject({ ok: false });
      expect(createAdminClient).not.toHaveBeenCalled();
    }
  );

  it.each<SesionUsuario>([
    { estado: 'sin-sesion' },
    { estado: 'sin-permiso' },
    { estado: 'autorizado', segundosRestantes: 1800, perfil: { ...PERFIL, id: 'otra-cuenta' } },
    {
      estado: 'autorizado',
      segundosRestantes: 1800,
      perfil: { ...PERFIL, contrasenaTemporal: true },
    },
  ])('rechaza la escritura si la sesión ya no permite el cambio (%j)', async sesion => {
    vi.mocked(obtenerSesionUsuario).mockResolvedValue(sesion);
    expect(await guardarAvatar('brote', PERFIL.id)).toMatchObject({ ok: false });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('devuelve un error si el perfil dejó de cumplir los filtros de la escritura', async () => {
    expect(await guardarAvatar('brote', PERFIL.id)).toMatchObject({ ok: false });
  });
});
