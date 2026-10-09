import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirSuperadmin } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabase/admin';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  actualizarDocente,
  cambiarEstadoDocente,
  crearDocente,
  eliminarDocente,
  restablecerContrasenaDocente,
} from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirSuperadmin: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const YO = '11111111-1111-4111-8111-111111111111';
const ID = '22222222-2222-4222-8222-222222222222';
const DATOS = {
  nombre: 'María López',
  correo: 'Maria.Lopez@correounivalle.edu.co',
  codigo: 'DOC-0420',
  rol: 'docente',
};
const CONTRASENA_TEMPORAL = /^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/;

let admin: SupabaseFalso;

beforeEach(() => {
  admin = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(admin.cliente as never);
  vi.mocked(requerirSuperadmin).mockResolvedValue({ id: YO } as never);
});

/** La cuenta `ID` existe y es de un docente. */
function cuentaDocente() {
  admin.responder('usuario', { data: { id: ID, correo: 'docente@x.co', rol: 'docente' } });
}

describe('crearDocente', () => {
  it('crea la cuenta para entrar con Google (sin contraseña)', async () => {
    admin.auth.admin.createUser.mockResolvedValueOnce({ data: { user: { id: ID } }, error: null });

    expect(await crearDocente({ ...DATOS, acceso: 'google' })).toEqual({
      ok: true,
      datos: { id: ID, contrasena: null },
    });
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'maria.lopez@correounivalle.edu.co',
      email_confirm: true,
      user_metadata: { nombre: 'María López' },
    });
    expect(admin.de('usuario').find(c => c.operacion === 'insert')!.valores).toEqual({
      id: ID,
      nombre: 'María López',
      correo: 'maria.lopez@correounivalle.edu.co',
      codigo_institucional: 'DOC-0420',
      rol: 'docente',
      contrasena_temporal: false,
    });
  });

  it('con contraseña temporal la genera, la asigna y la devuelve una vez', async () => {
    admin.auth.admin.createUser.mockResolvedValueOnce({ data: { user: { id: ID } }, error: null });

    const resultado = await crearDocente({ ...DATOS, rol: 'superadmin', acceso: 'contrasena' });

    expect(resultado).toMatchObject({ ok: true, datos: { id: ID } });
    const contrasena = resultado.ok ? resultado.datos.contrasena : null;
    expect(contrasena).toMatch(CONTRASENA_TEMPORAL);
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ password: contrasena })
    );
    expect(admin.de('usuario').find(c => c.operacion === 'insert')!.valores).toMatchObject({
      rol: 'superadmin',
      contrasena_temporal: true,
    });
  });

  it.each([
    [{ data: { rol: 'docente' } }, null, 'Ya existe una cuenta con ese correo.'],
    [{ data: { rol: 'estudiante' } }, null, 'Ese correo pertenece a la cuenta de un estudiante.'],
    [
      { data: null },
      { data: { id: 'otro' } },
      'Ese código institucional ya pertenece a otra cuenta.',
    ],
  ])('no repite correos ni códigos (%#)', async (porCorreo, porCodigo, error) => {
    admin.responder('usuario', porCorreo, porCodigo ?? { data: null });
    expect(await crearDocente({ ...DATOS, acceso: 'google' })).toEqual({ ok: false, error });
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('si el usuario de Auth ya existía sin perfil, le da el perfil', async () => {
    admin.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'email_exists' },
    });
    admin.responder('rpc:id_cuenta_por_correo', { data: ID });

    expect(await crearDocente({ ...DATOS, acceso: 'contrasena' })).toMatchObject({
      ok: true,
      datos: { id: ID },
    });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(ID, {
      password: expect.stringMatching(CONTRASENA_TEMPORAL),
    });
  });

  it('si no se puede crear el perfil, deshace la cuenta de Auth', async () => {
    admin.auth.admin.createUser.mockResolvedValueOnce({ data: { user: { id: ID } }, error: null });
    admin.responder('usuario', { data: null }, { data: null }, { error: { code: '23505' } });

    expect(await crearDocente({ ...DATOS, acceso: 'google' })).toEqual({
      ok: false,
      error: 'El correo o el código ya pertenecen a otra cuenta.',
    });
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith(ID);
  });

  it('rechaza datos inválidos', async () => {
    expect(await crearDocente({ ...DATOS, correo: 'no-es-correo', acceso: 'google' })).toEqual({
      ok: false,
      error: 'Revisa los datos del docente.',
    });
  });

  it('exige ser Administrador', async () => {
    vi.mocked(requerirSuperadmin).mockRejectedValueOnce(new Error('NEXT_REDIRECT:/configuracion'));
    await expect(crearDocente({ ...DATOS, acceso: 'google' })).rejects.toThrow('NEXT_REDIRECT');
    expect(admin.consultas).toHaveLength(0);
  });
});

describe('actualizarDocente', () => {
  it('actualiza los datos y, si cambió, el correo de Auth', async () => {
    cuentaDocente();

    expect(await actualizarDocente({ id: ID, ...DATOS, rol: 'superadmin' })).toEqual({
      ok: true,
      datos: { id: ID },
    });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(ID, {
      email: 'maria.lopez@correounivalle.edu.co',
      email_confirm: true,
    });
    expect(admin.de('usuario')[1]).toMatchObject({
      operacion: 'update',
      valores: { nombre: 'María López', codigo_institucional: 'DOC-0420', rol: 'superadmin' },
    });
  });

  it('no puede quitarse a sí mismo el rol de Administrador', async () => {
    expect(await actualizarDocente({ id: YO, ...DATOS, rol: 'docente' })).toEqual({
      ok: false,
      error: 'No puedes quitarte el rol de Administrador.',
    });
    expect(admin.consultas).toHaveLength(0);
  });

  it('no toca cuentas de estudiantes', async () => {
    admin.responder('usuario', { data: { id: ID, correo: 'e@x.co', rol: 'estudiante' } });
    expect(await actualizarDocente({ id: ID, ...DATOS })).toMatchObject({ ok: false });
    expect(admin.de('usuario')).toHaveLength(1);
  });
});

describe('cambiarEstadoDocente', () => {
  it('desactiva la cuenta: la bloquea en Auth y la marca inactiva', async () => {
    cuentaDocente();

    expect(await cambiarEstadoDocente({ id: ID, activo: false })).toEqual({
      ok: true,
      datos: { id: ID, activo: false },
    });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(ID, {
      ban_duration: '876000h',
    });
    expect(admin.de('usuario')[1]).toMatchObject({
      operacion: 'update',
      valores: { activo: false },
    });
  });

  it('al reactivarla quita el bloqueo', async () => {
    cuentaDocente();
    await cambiarEstadoDocente({ id: ID, activo: true });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(ID, { ban_duration: 'none' });
  });

  it('no puede desactivarse a sí mismo', async () => {
    expect(await cambiarEstadoDocente({ id: YO, activo: false })).toMatchObject({ ok: false });
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
});

describe('restablecerContrasenaDocente', () => {
  it('genera una contraseña temporal nueva y pide cambiarla', async () => {
    cuentaDocente();

    const resultado = await restablecerContrasenaDocente({ id: ID });

    expect(resultado).toMatchObject({ ok: true });
    const contrasena = resultado.ok ? resultado.datos.contrasena : '';
    expect(contrasena).toMatch(CONTRASENA_TEMPORAL);
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(ID, { password: contrasena });
    expect(admin.de('usuario')[1]).toMatchObject({ valores: { contrasena_temporal: true } });
  });

  it('su propia contraseña la cambia desde su cuenta', async () => {
    expect(await restablecerContrasenaDocente({ id: YO })).toMatchObject({ ok: false });
  });
});

describe('eliminarDocente', () => {
  it('elimina una cuenta sin historial', async () => {
    cuentaDocente();
    admin.responder('estudiante', { count: 0 });
    admin.responder('escenario', { count: 0 });
    admin.responder('asignacion', { count: 0 });
    admin.responder('sesion', { count: 0 });

    expect(await eliminarDocente({ id: ID })).toEqual({ ok: true, datos: { id: ID } });
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith(ID);
  });

  it('con historial pide desactivarla en lugar de eliminarla', async () => {
    cuentaDocente();
    admin.responder('estudiante', { count: 3 });

    expect(await eliminarDocente({ id: ID })).toEqual({
      ok: false,
      error:
        'Esta cuenta ya tiene estudiantes, casos o sesiones. Desactívala para conservar su historial.',
    });
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('no puede eliminarse a sí mismo', async () => {
    expect(await eliminarDocente({ id: YO })).toMatchObject({ ok: false });
    expect(admin.consultas).toHaveLength(0);
  });
});
