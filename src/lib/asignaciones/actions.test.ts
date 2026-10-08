import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirDocente, requerirEstudiante } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { anularAsignacion, canjearCodigo, generarAsignacion } from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirDocente: vi.fn(), requerirEstudiante: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((ruta: string) => {
    throw new Error(`NEXT_REDIRECT:${ruta}`);
  }),
}));

const ESTUDIANTE_ID = '55555555-5555-4555-8555-555555555555';
const ASIGNACION_ID = '77777777-7777-4777-8777-777777777777';
const SESION_ID = '44444444-4444-4444-8444-444444444444';
const VALORES = {
  escenarioId: '11111111-1111-4111-8111-111111111111',
  promptSistema: 'Eres Marta Lucía, una mujer de 58 años en duelo.',
  estudianteId: ESTUDIANTE_ID,
  vigenciaDias: 7,
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(requerirDocente).mockResolvedValue({} as never);
  vi.mocked(requerirEstudiante).mockResolvedValue({} as never);
});

describe('generarAsignacion', () => {
  it('crea el código con la configuración del docente y la vigencia elegida', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-07T12:00:00.000Z'), toFake: ['Date'] });
    db.responder('estudiante', { data: { usuario_id: 'u1' } });
    db.responder('asignacion', {
      data: { id: ASIGNACION_ID, codigo: 'abc-defg-hij', expira_en: '2026-10-14T12:00:00+00:00' },
    });

    const resultado = await generarAsignacion(VALORES);
    vi.useRealTimers();

    expect(resultado).toEqual({
      ok: true,
      datos: { id: ASIGNACION_ID, codigo: 'abc-defg-hij', expiraEn: '2026-10-14T12:00:00+00:00' },
    });
    const [insercion] = db.de('asignacion');
    expect(insercion!.valores).toEqual({
      estudiante_id: ESTUDIANTE_ID,
      escenario_id: VALORES.escenarioId,
      prompt_sistema: VALORES.promptSistema,
      codigo: expect.stringMatching(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/),
      expira_en: '2026-10-14T12:00:00.000Z',
    });
  });

  it('reintenta con otro código si choca con uno existente', async () => {
    db.responder('estudiante', { data: { usuario_id: 'u1' } });
    db.responder(
      'asignacion',
      { error: { code: '23505' } },
      { data: { id: ASIGNACION_ID, codigo: 'xyz-abcd-efg', expira_en: 'T' } }
    );

    expect(await generarAsignacion(VALORES)).toMatchObject({ ok: true });
    expect(db.de('asignacion')).toHaveLength(2);
  });

  it('no genera códigos para un estudiante sin cuenta', async () => {
    db.responder('estudiante', { data: { usuario_id: null } });
    expect(await generarAsignacion(VALORES)).toEqual({
      ok: false,
      error: 'Ese estudiante aún no tiene cuenta. Agrega su correo institucional en Estudiantes.',
    });
    expect(db.de('asignacion')).toHaveLength(0);
  });

  it('avisa si el estudiante ya no existe (o no es del docente)', async () => {
    db.responder('estudiante', { data: null });
    expect(await generarAsignacion(VALORES)).toMatchObject({
      ok: false,
      error: 'El estudiante seleccionado ya no está disponible.',
    });
  });

  it('traduce los errores de la base de datos', async () => {
    db.responder('estudiante', { data: { usuario_id: 'u1' } }, { data: { usuario_id: 'u1' } });
    db.responder('asignacion', { error: { code: '23503' } }, { error: { code: '42501' } });
    expect(await generarAsignacion(VALORES)).toMatchObject({
      error: 'El caso seleccionado ya no está disponible.',
    });
    expect(await generarAsignacion(VALORES)).toMatchObject({
      error: 'No fue posible generar el código. Inténtalo de nuevo.',
    });
  });

  it('valida los datos y exige un docente antes de tocar la base de datos', async () => {
    expect(await generarAsignacion({ ...VALORES, vigenciaDias: 90 })).toMatchObject({ ok: false });
    vi.mocked(requerirDocente).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(generarAsignacion(VALORES)).rejects.toThrow('NEXT_REDIRECT');
    expect(db.consultas).toHaveLength(0);
  });
});

describe('anularAsignacion', () => {
  it('anula solo un código pendiente', async () => {
    db.responder('asignacion', { data: { id: ASIGNACION_ID } });
    expect(await anularAsignacion({ id: ASIGNACION_ID })).toEqual({
      ok: true,
      datos: { id: ASIGNACION_ID },
    });
    expect(db.de('asignacion')[0]!.filtros).toEqual([
      ['eq', 'id', ASIGNACION_ID],
      ['is', 'sesion_id', null],
      ['is', 'anulada_en', null],
    ]);
  });

  it('avisa si ya se usó o ya estaba anulado', async () => {
    db.responder('asignacion', { data: null });
    expect(await anularAsignacion({ id: ASIGNACION_ID })).toEqual({
      ok: false,
      error: 'Ese código ya se usó o ya estaba anulado.',
    });
  });

  it('rechaza un id inválido', async () => {
    expect(await anularAsignacion({ id: 'x' })).toMatchObject({ ok: false });
  });
});

describe('canjearCodigo', () => {
  it('con un código válido entra a la simulación', async () => {
    db.responder('rpc:canjear_codigo', { data: [{ resultado: 'ok', sesion_id: SESION_ID }] });

    await expect(canjearCodigo({ codigo: ' ABC-DEFG-HIJ ' })).rejects.toThrow(
      `NEXT_REDIRECT:/simulacion?sesion=${SESION_ID}`
    );
    expect(db.rpc).toHaveBeenCalledWith('canjear_codigo', { p_codigo: 'abc-defg-hij' });
  });

  it.each([
    ['invalido', /no existe o no es para tu cuenta/],
    ['vencido', /ya venció/],
    ['anulado', /anuló ese código/],
    ['usado', /Ya usaste ese código/],
    ['desconocido', /no existe o no es para tu cuenta/],
  ])('explica el resultado %s', async (resultado, mensaje) => {
    db.responder('rpc:canjear_codigo', { data: [{ resultado, sesion_id: null }] });
    const respuesta = await canjearCodigo({ codigo: 'abc-defg-hij' });
    expect(respuesta.error).toMatch(mensaje);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('un código mal escrito se rechaza sin consultar la base de datos', async () => {
    expect(await canjearCodigo({ codigo: 'abc' })).toEqual({
      error: 'El código tiene 10 letras, con este formato: abc-defg-hij.',
    });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('si falla la base de datos responde un mensaje genérico', async () => {
    db.responder('rpc:canjear_codigo', { error: { code: '500' } });
    expect(await canjearCodigo({ codigo: 'abc-defg-hij' })).toEqual({
      error: 'No fue posible validar el código. Inténtalo de nuevo.',
    });
  });

  it('solo los estudiantes canjean códigos', async () => {
    vi.mocked(requerirEstudiante).mockRejectedValueOnce(new Error('NEXT_REDIRECT:/configuracion'));
    await expect(canjearCodigo({ codigo: 'abc-defg-hij' })).rejects.toThrow('NEXT_REDIRECT');
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
