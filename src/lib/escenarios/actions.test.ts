import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirEstudiante } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  cerrarSesionPorInactividad,
  comenzarSesion,
  finalizarSesion,
  registrarActividad,
} from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirEstudiante: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(requerirEstudiante).mockResolvedValue({} as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('finalizarSesion (HU-16 · T02)', () => {
  it('cierra solo una sesión en curso y devuelve las horas que fijó la base de datos', async () => {
    const horas = { inicio: '2026-10-06T15:00:00.000Z', fin: '2026-10-06T15:20:00.000Z' };
    db.responder('sesion', { data: horas });

    expect(await finalizarSesion({ sesionId: SESION_ID })).toEqual({ ok: true, datos: horas });
    const [actualizacion] = db.de('sesion');
    // El cliente solo cambia el estado: la hora de fin la pone el trigger.
    expect(actualizacion).toMatchObject({ operacion: 'update', valores: { estado: 'finalizada' } });
    expect(actualizacion!.filtros).toEqual(
      expect.arrayContaining([
        ['eq', 'id', SESION_ID],
        ['eq', 'estado', 'en_curso'],
      ])
    );
  });

  it.each([
    ['la sesión ya no está en curso', { data: null }],
    ['falla la base de datos', { error: { code: '500' } }],
  ])('falla si %s', async (_, respuesta) => {
    db.responder('sesion', respuesta);
    expect(await finalizarSesion({ sesionId: SESION_ID })).toEqual({
      ok: false,
      error: 'No fue posible finalizar la sesión. Inténtalo de nuevo.',
    });
  });

  it('rechaza un id que no es UUID', async () => {
    expect(await finalizarSesion({ sesionId: 'x' })).toMatchObject({ ok: false });
    expect(db.consultas).toHaveLength(0);
  });

  it('exige una sesión de estudiante: el docente ya no finaliza desde su equipo', async () => {
    vi.mocked(requerirEstudiante).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(finalizarSesion({ sesionId: SESION_ID })).rejects.toThrow('NEXT_REDIRECT');
    expect(db.consultas).toHaveLength(0);
  });
});

describe('comenzarSesion (HU-23 · T03)', () => {
  it('marca la sesión como comenzada y devuelve el inicio del servidor', async () => {
    db.responder('sesion', { data: { inicio: '2026-10-06T15:05:00.000Z' } });

    expect(await comenzarSesion({ sesionId: SESION_ID })).toEqual({
      ok: true,
      datos: { inicio: '2026-10-06T15:05:00.000Z' },
    });
    expect(db.de('sesion')[0]).toMatchObject({
      operacion: 'update',
      valores: { comenzada: true },
    });
  });

  it('falla si la sesión no está en curso', async () => {
    db.responder('sesion', { data: null });
    expect(await comenzarSesion({ sesionId: SESION_ID })).toMatchObject({ ok: false });
  });

  it('rechaza datos inválidos', async () => {
    expect(await comenzarSesion({})).toMatchObject({ ok: false });
  });
});

describe('registrarActividad (cierre por inactividad)', () => {
  it('envía el latido a la base de datos y devuelve si la sesión sigue en curso', async () => {
    db.responder('rpc:registrar_actividad_sesion', { data: true });

    expect(await registrarActividad({ sesionId: SESION_ID })).toEqual({
      ok: true,
      datos: { enCurso: true },
    });
    expect(db.rpc).toHaveBeenCalledWith('registrar_actividad_sesion', { p_sesion_id: SESION_ID });
  });

  it('informa que la sesión ya terminó (la cerró el barrido o venció)', async () => {
    db.responder('rpc:registrar_actividad_sesion', { data: false });
    expect(await registrarActividad({ sesionId: SESION_ID })).toEqual({
      ok: true,
      datos: { enCurso: false },
    });
  });

  it('falla si la base de datos no responde', async () => {
    db.responder('rpc:registrar_actividad_sesion', { error: { code: '500' } });
    expect(await registrarActividad({ sesionId: SESION_ID })).toMatchObject({ ok: false });
  });

  it('rechaza un id que no es UUID', async () => {
    expect(await registrarActividad({ sesionId: 'x' })).toMatchObject({ ok: false });
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe('cerrarSesionPorInactividad', () => {
  const horas = {
    inicio: '2026-10-06T15:00:00.000Z',
    fin: '2026-10-06T15:12:00.000Z',
    estado: 'interrumpida',
  };

  it('da por interrumpida una sesión en curso y devuelve sus horas', async () => {
    db.responder('sesion', { data: horas });

    expect(await cerrarSesionPorInactividad({ sesionId: SESION_ID })).toEqual({
      ok: true,
      datos: horas,
    });
    const [actualizacion] = db.de('sesion');
    expect(actualizacion).toMatchObject({
      operacion: 'update',
      valores: { estado: 'interrumpida' },
    });
    expect(actualizacion!.filtros).toEqual(
      expect.arrayContaining([
        ['eq', 'id', SESION_ID],
        ['eq', 'estado', 'en_curso'],
      ])
    );
  });

  it('si el barrido ya la había cerrado, devuelve la sesión terminada', async () => {
    db.responder('sesion', { data: null }, { data: horas });

    expect(await cerrarSesionPorInactividad({ sesionId: SESION_ID })).toEqual({
      ok: true,
      datos: horas,
    });
    expect(db.de('sesion')[1]).toMatchObject({ operacion: 'select' });
  });

  it.each([
    ['la sesión no existe', [{ data: null }, { data: null }]],
    ['falla la base de datos', [{ error: { code: '500' } }]],
  ])('falla si %s', async (_, respuestas) => {
    db.responder('sesion', ...respuestas);
    expect(await cerrarSesionPorInactividad({ sesionId: SESION_ID })).toEqual({
      ok: false,
      error: 'No fue posible cerrar la sesión. Inténtalo de nuevo.',
    });
  });
});
