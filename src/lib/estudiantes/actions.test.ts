import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirDocente } from '@/lib/auth/dal';
import { asegurarCuentaEstudiante } from '@/lib/estudiantes/cuentas';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { actualizarEstudiante, eliminarEstudiante, registrarEstudiante } from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirDocente: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/estudiantes/cuentas', () => ({ asegurarCuentaEstudiante: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const ID = '55555555-5555-4555-8555-555555555555';
const DATOS = {
  codigo: '202012345',
  nombre: 'Ana Pérez',
  correo: 'ana.perez@correounivalle.edu.co',
};

let db: SupabaseFalso;
let admin: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  admin = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(createAdminClient).mockReturnValue(admin.cliente as never);
  vi.mocked(requerirDocente).mockResolvedValue({} as never);
  vi.mocked(asegurarCuentaEstudiante).mockResolvedValue({ ok: true, datos: { usuarioId: 'u1' } });
});

describe('registrarEstudiante', () => {
  it('crea la cuenta y registra al estudiante', async () => {
    db.responder('estudiante', { data: null }, { data: { id: ID } });

    expect(
      await registrarEstudiante({ ...DATOS, correo: ' ANA.PEREZ@correounivalle.edu.co' })
    ).toEqual({
      ok: true,
      datos: { id: ID },
    });
    expect(asegurarCuentaEstudiante).toHaveBeenCalledWith(DATOS);
    const insercion = db.de('estudiante').find(c => c.operacion === 'insert');
    expect(insercion!.valores).toEqual(DATOS);
  });

  it('completa un registro antiguo sin correo (conserva su historial)', async () => {
    db.responder('estudiante', { data: { id: ID, correo: null } }, { data: { id: ID } });

    expect(await registrarEstudiante(DATOS)).toEqual({ ok: true, datos: { id: ID } });
    const actualizacion = db.de('estudiante').find(c => c.operacion === 'update');
    expect(actualizacion).toMatchObject({
      valores: { nombre: DATOS.nombre, correo: DATOS.correo },
      filtros: [['eq', 'id', ID]],
    });
  });

  it.each([
    [DATOS.correo, 'Ese estudiante ya está registrado.'],
    ['otro@correounivalle.edu.co', /con otro correo/],
  ])('no duplica un código ya registrado con correo (%s)', async (correo, mensaje) => {
    db.responder('estudiante', { data: { id: ID, correo } });
    const resultado = await registrarEstudiante(DATOS);
    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? '' : resultado.error).toMatch(mensaje);
    expect(asegurarCuentaEstudiante).not.toHaveBeenCalled();
  });

  it('devuelve el error de la cuenta tal cual', async () => {
    db.responder('estudiante', { data: null });
    vi.mocked(asegurarCuentaEstudiante).mockResolvedValueOnce({
      ok: false,
      error: 'Ese correo pertenece a la cuenta de un docente.',
    });
    expect(await registrarEstudiante(DATOS)).toEqual({
      ok: false,
      error: 'Ese correo pertenece a la cuenta de un docente.',
    });
  });

  it('avisa si el correo ya está en otro registro del docente', async () => {
    db.responder('estudiante', { data: null }, { error: { code: '23505' } });
    expect(await registrarEstudiante(DATOS)).toEqual({
      ok: false,
      error: 'Ya registraste a otro estudiante con ese correo.',
    });
  });

  it('rechaza correos que no son institucionales sin crear cuentas', async () => {
    expect(await registrarEstudiante({ ...DATOS, correo: 'ana@gmail.com' })).toMatchObject({
      ok: false,
    });
    expect(asegurarCuentaEstudiante).not.toHaveBeenCalled();
    expect(db.consultas).toHaveLength(0);
  });

  it('exige un docente', async () => {
    vi.mocked(requerirDocente).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(registrarEstudiante(DATOS)).rejects.toThrow('NEXT_REDIRECT');
  });
});

describe('actualizarEstudiante', () => {
  it('asegura la cuenta del nuevo correo con el código registrado y actualiza', async () => {
    db.responder('estudiante', { data: { codigo: '202012345' } }, { data: null });

    expect(
      await actualizarEstudiante({ id: ID, nombre: 'Ana María Pérez', correo: DATOS.correo })
    ).toEqual({ ok: true, datos: { id: ID } });
    expect(asegurarCuentaEstudiante).toHaveBeenCalledWith({
      correo: DATOS.correo,
      nombre: 'Ana María Pérez',
      codigo: '202012345',
    });
    expect(db.de('estudiante').at(-1)).toMatchObject({
      operacion: 'update',
      valores: { nombre: 'Ana María Pérez', correo: DATOS.correo },
    });
  });

  it('avisa si el estudiante ya no existe', async () => {
    db.responder('estudiante', { data: null });
    expect(await actualizarEstudiante({ id: ID, nombre: 'Ana', correo: DATOS.correo })).toEqual({
      ok: false,
      error: 'Ese estudiante ya no está disponible.',
    });
  });

  it('avisa si el correo ya lo usa otro registro', async () => {
    db.responder('estudiante', { data: { codigo: '202012345' } }, { error: { code: '23505' } });
    expect(await actualizarEstudiante({ id: ID, nombre: 'Ana', correo: DATOS.correo })).toEqual({
      ok: false,
      error: 'Ya registraste a otro estudiante con ese correo.',
    });
  });
});

describe('eliminarEstudiante', () => {
  const CUENTA = '66666666-6666-4666-8666-666666666666';

  it('elimina al estudiante con su historial (función de la base de datos)', async () => {
    db.responder('rpc:eliminar_estudiante', { data: [{ eliminado: true, usuario_id: null }] });

    expect(await eliminarEstudiante({ id: ID })).toEqual({ ok: true, datos: { id: ID } });
    expect(db.rpc).toHaveBeenCalledWith('eliminar_estudiante', { p_estudiante_id: ID });
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('borra la cuenta si ningún otro docente lo tiene registrado', async () => {
    db.responder('rpc:eliminar_estudiante', { data: [{ eliminado: true, usuario_id: CUENTA }] });
    admin.responder('estudiante', { count: 0 });
    admin.responder('usuario', { data: { rol: 'estudiante' } });

    expect(await eliminarEstudiante({ id: ID })).toMatchObject({ ok: true });
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith(CUENTA);
  });

  it('conserva la cuenta si otro docente también lo registró', async () => {
    db.responder('rpc:eliminar_estudiante', { data: [{ eliminado: true, usuario_id: CUENTA }] });
    admin.responder('estudiante', { count: 1 });
    admin.responder('usuario', { data: { rol: 'estudiante' } });

    expect(await eliminarEstudiante({ id: ID })).toMatchObject({ ok: true });
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it.each([
    ['no es suyo o ya no existe', { data: [{ eliminado: false, usuario_id: null }] }],
    ['falla la base de datos', { error: { code: '500' } }],
  ])('falla si %s', async (_, respuesta) => {
    db.responder('rpc:eliminar_estudiante', respuesta);
    expect(await eliminarEstudiante({ id: ID })).toEqual({
      ok: false,
      error: 'Ese estudiante ya no está disponible. Recarga la página.',
    });
  });

  it('rechaza un id inválido sin consultar', async () => {
    expect(await eliminarEstudiante({ id: 'x' })).toMatchObject({ ok: false });
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
