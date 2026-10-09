import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminClient } from '@/lib/supabase/admin';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { asegurarCuentaEstudiante } from './cuentas';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const DATOS = {
  correo: 'ana.perez@correounivalle.edu.co',
  nombre: 'Ana Pérez',
  codigo: '202012345',
};

let admin: SupabaseFalso;

beforeEach(() => {
  admin = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(admin.cliente as never);
});

describe('asegurarCuentaEstudiante', () => {
  it('si ya tiene cuenta de estudiante no crea nada', async () => {
    admin.responder('usuario', { data: { id: 'u1', rol: 'estudiante' } });
    expect(await asegurarCuentaEstudiante(DATOS)).toEqual({ ok: true, datos: { usuarioId: 'u1' } });
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('no convierte en estudiante la cuenta de un docente', async () => {
    admin.responder('usuario', { data: { id: 'd1', rol: 'docente' } });
    expect(await asegurarCuentaEstudiante(DATOS)).toEqual({
      ok: false,
      error: 'Ese correo pertenece a la cuenta de un docente.',
    });
  });

  it('crea el usuario de Auth (confirmado, sin contraseña) y su perfil', async () => {
    admin.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'n1' } },
      error: null,
    });

    expect(await asegurarCuentaEstudiante(DATOS)).toEqual({ ok: true, datos: { usuarioId: 'n1' } });
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith({
      email: DATOS.correo,
      email_confirm: true,
      user_metadata: { nombre: DATOS.nombre },
    });
    expect(admin.de('usuario').at(-1)).toMatchObject({
      operacion: 'insert',
      valores: {
        id: 'n1',
        nombre: DATOS.nombre,
        correo: DATOS.correo,
        codigo_institucional: DATOS.codigo,
        rol: 'estudiante',
      },
    });
  });

  it('reutiliza un usuario de Auth que ya existía sin perfil', async () => {
    admin.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'email_exists', status: 422 },
    });
    admin.responder('rpc:id_cuenta_por_correo', { data: 'existente' });

    expect(await asegurarCuentaEstudiante(DATOS)).toEqual({
      ok: true,
      datos: { usuarioId: 'existente' },
    });
    expect(admin.rpc).toHaveBeenCalledWith('id_cuenta_por_correo', { p_correo: DATOS.correo });
  });

  it('si el código ya es de otra cuenta, deshace el usuario recién creado', async () => {
    admin.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'n1' } },
      error: null,
    });
    admin.responder('usuario', { data: null }, { error: { code: '23505' } });

    expect(await asegurarCuentaEstudiante(DATOS)).toEqual({
      ok: false,
      error: 'Ese código institucional ya pertenece a otra cuenta.',
    });
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('n1');
  });

  it.each([
    ['falla la consulta del perfil', () => admin.responder('usuario', { error: { code: '500' } })],
    [
      'falla la creación en Auth',
      () =>
        admin.auth.admin.createUser.mockResolvedValueOnce({
          data: { user: null },
          error: { code: 'unexpected_failure', status: 500 },
        }),
    ],
  ])('si %s responde un mensaje genérico', async (_, preparar) => {
    preparar();
    expect(await asegurarCuentaEstudiante(DATOS)).toEqual({
      ok: false,
      error: 'No fue posible crear la cuenta del estudiante. Inténtalo de nuevo.',
    });
  });
});
