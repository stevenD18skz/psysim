import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirDocente } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { comenzarSesion, finalizarSesion, iniciarSimulacion } from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirDocente: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';
const VALORES = {
  escenarioId: '11111111-1111-4111-8111-111111111111',
  promptSistema: 'Eres Marta Lucía, una mujer de 58 años en duelo.',
  codigoEstudiante: ' 202012345 ',
  nombreEstudiante: '  Ana   María ',
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(requerirDocente).mockResolvedValue({} as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('iniciarSimulacion (HU-06 · T04)', () => {
  it('crea la sesión con los datos normalizados y sin enviar estudiante_id', async () => {
    db.responder('sesion', { data: { id: SESION_ID } });

    const resultado = await iniciarSimulacion(VALORES);

    expect(resultado).toEqual({ ok: true, datos: { sesionId: SESION_ID } });
    const [insercion] = db.de('sesion');
    expect(insercion).toMatchObject({ operacion: 'insert', columnas: 'id' });
    // El docente y el estudiante los asigna la base de datos (default y trigger).
    expect(insercion!.valores).toEqual({
      escenario_id: VALORES.escenarioId,
      codigo_estudiante: '202012345',
      nombre_estudiante: 'Ana María',
      prompt_sistema: VALORES.promptSistema,
    });
  });

  it('exige una sesión de docente antes de tocar la base de datos', async () => {
    vi.mocked(requerirDocente).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(iniciarSimulacion(VALORES)).rejects.toThrow('NEXT_REDIRECT');
    expect(db.consultas).toHaveLength(0);
  });

  it('rechaza datos inválidos sin insertar nada', async () => {
    const resultado = await iniciarSimulacion({ ...VALORES, codigoEstudiante: '12-AB' });
    expect(resultado).toEqual({ ok: false, error: 'Revisa los datos del formulario.' });
    expect(db.consultas).toHaveLength(0);
  });

  it('avisa si el escenario ya no existe (clave foránea)', async () => {
    db.responder('sesion', { error: { code: '23503' } });
    expect(await iniciarSimulacion(VALORES)).toEqual({
      ok: false,
      error: 'El escenario seleccionado ya no está disponible.',
    });
  });

  it('ante otro error responde con un mensaje genérico (sin detalles internos)', async () => {
    db.responder('sesion', { error: { code: '42501', message: 'permission denied for table' } });
    const resultado = await iniciarSimulacion(VALORES);
    expect(resultado).toEqual({
      ok: false,
      error: 'No fue posible iniciar la simulación. Inténtalo de nuevo.',
    });
  });
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
