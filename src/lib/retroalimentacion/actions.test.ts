import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirDocente } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  actualizarAnotacion,
  crearAnotacion,
  eliminarAnotacion,
  guardarRetroalimentacion,
  interrumpirSesion,
  publicarRetroalimentacion,
} from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirDocente: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';
const MENSAJE_ID = '55555555-5555-4555-8555-555555555555';
const ANOTACION_ID = '66666666-6666-4666-8666-666666666666';
const GUARDADA = { publicada_en: null, actualizado_en: '2026-10-07T20:00:00.000Z' };

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(requerirDocente).mockResolvedValue({} as never);
});

describe('guardarRetroalimentacion', () => {
  it('la primera vez crea el borrador', async () => {
    db.responder('retroalimentacion', { data: null }, { data: GUARDADA });

    expect(
      await guardarRetroalimentacion({
        sesionId: SESION_ID,
        comentarioGeneral: ' Bien ',
        nota: 4.5,
      })
    ).toEqual({ ok: true, datos: { publicadaEn: null, actualizadoEn: GUARDADA.actualizado_en } });
    expect(db.de('retroalimentacion')[1]).toMatchObject({
      operacion: 'insert',
      valores: { sesion_id: SESION_ID, comentario_general: 'Bien', nota: 4.5 },
    });
  });

  it('después actualiza el existente (sin reescribir sesion_id)', async () => {
    db.responder('retroalimentacion', { data: { sesion_id: SESION_ID } }, { data: GUARDADA });

    await guardarRetroalimentacion({ sesionId: SESION_ID, comentarioGeneral: '', nota: null });
    expect(db.de('retroalimentacion')[1]).toMatchObject({
      operacion: 'update',
      valores: { comentario_general: '', nota: null },
      filtros: [['eq', 'sesion_id', SESION_ID]],
    });
  });

  it('con la sesión en curso, RLS lo impide y se explica', async () => {
    db.responder('retroalimentacion', { data: null }, { error: { code: '42501' } });
    expect(
      await guardarRetroalimentacion({ sesionId: SESION_ID, comentarioGeneral: '', nota: null })
    ).toEqual({
      ok: false,
      error: 'La sesión sigue en curso: podrás revisarla cuando el estudiante termine.',
    });
  });

  it('rechaza una nota fuera de escala', async () => {
    expect(
      await guardarRetroalimentacion({ sesionId: SESION_ID, comentarioGeneral: '', nota: 7 })
    ).toEqual({ ok: false, error: 'La nota máxima es 5,0.' });
    expect(db.consultas).toHaveLength(0);
  });
});

describe('publicarRetroalimentacion', () => {
  it('publica con la nota y el comentario', async () => {
    db.responder(
      'retroalimentacion',
      { data: { sesion_id: SESION_ID } },
      { data: { ...GUARDADA, publicada_en: '2026-10-07T20:00:00.000Z' } }
    );

    expect(
      await publicarRetroalimentacion({
        sesionId: SESION_ID,
        comentarioGeneral: 'Buen trabajo.',
        nota: 4,
      })
    ).toMatchObject({ ok: true, datos: { publicadaEn: '2026-10-07T20:00:00.000Z' } });
    expect(db.de('retroalimentacion')[1]!.valores).toMatchObject({
      comentario_general: 'Buen trabajo.',
      nota: 4,
      publicada_en: expect.any(String),
    });
  });

  it('sin nota no se publica', async () => {
    expect(
      await publicarRetroalimentacion({
        sesionId: SESION_ID,
        comentarioGeneral: 'Bien',
        nota: null,
      })
    ).toEqual({ ok: false, error: 'Pon la nota antes de publicar.' });
  });
});

describe('anotaciones', () => {
  const NUEVA = {
    sesionId: SESION_ID,
    mensajeId: MENSAJE_ID,
    inicio: 0,
    fin: 4,
    comentario: 'Aquí sonaste muy directo.',
  };

  it('crea el borrador si hace falta y guarda la anotación', async () => {
    db.responder('retroalimentacion', { data: null }, { data: GUARDADA });
    db.responder('anotacion', {
      data: {
        id: ANOTACION_ID,
        mensaje_id: MENSAJE_ID,
        inicio: 0,
        fin: 4,
        fragmento: 'Hola',
        comentario: NUEVA.comentario,
      },
    });

    expect(await crearAnotacion(NUEVA)).toEqual({
      ok: true,
      datos: {
        id: ANOTACION_ID,
        mensajeId: MENSAJE_ID,
        inicio: 0,
        fin: 4,
        fragmento: 'Hola',
        comentario: NUEVA.comentario,
      },
    });
    expect(db.de('retroalimentacion')[1]).toMatchObject({
      operacion: 'insert',
      valores: { sesion_id: SESION_ID },
    });
  });

  it('si el borrador existe no lo modifica', async () => {
    db.responder('retroalimentacion', { data: { sesion_id: SESION_ID } }, { data: GUARDADA });
    db.responder('anotacion', {
      data: {
        id: ANOTACION_ID,
        mensaje_id: MENSAJE_ID,
        inicio: 0,
        fin: 4,
        fragmento: 'Hola',
        comentario: 'x',
      },
    });

    await crearAnotacion(NUEVA);
    expect(db.de('retroalimentacion').map(c => c.operacion)).toEqual(['select', 'select']);
  });

  it.each([
    ['23P01', 'Ese fragmento se cruza con otro comentario. Elige otro.'],
    ['23514', 'Solo puedes subrayar las intervenciones del estudiante.'],
    ['500', 'No fue posible guardar el comentario. Inténtalo de nuevo.'],
  ])('traduce el error %s', async (codigo, mensaje) => {
    db.responder('retroalimentacion', { data: { sesion_id: SESION_ID } }, { data: GUARDADA });
    db.responder('anotacion', { error: { code: codigo } });
    expect(await crearAnotacion(NUEVA)).toEqual({ ok: false, error: mensaje });
  });

  it('actualiza y elimina comentarios', async () => {
    db.responder('anotacion', { data: { id: ANOTACION_ID } }, { data: null });
    expect(await actualizarAnotacion({ id: ANOTACION_ID, comentario: ' Mejor así ' })).toEqual({
      ok: true,
      datos: { id: ANOTACION_ID },
    });
    expect(db.de('anotacion')[0]!.valores).toEqual({ comentario: 'Mejor así' });

    expect(await eliminarAnotacion({ id: ANOTACION_ID })).toEqual({
      ok: true,
      datos: { id: ANOTACION_ID },
    });
    expect(db.de('anotacion')[1]).toMatchObject({ operacion: 'delete' });
  });

  it('avisa si no pudo actualizar o eliminar', async () => {
    db.responder('anotacion', { data: null }, { error: { code: '500' } });
    expect(await actualizarAnotacion({ id: ANOTACION_ID, comentario: 'x' })).toMatchObject({
      ok: false,
    });
    expect(await eliminarAnotacion({ id: ANOTACION_ID })).toMatchObject({ ok: false });
  });
});

describe('interrumpirSesion', () => {
  it('solo interrumpe una sesión en curso', async () => {
    db.responder('sesion', { data: { id: SESION_ID } }, { data: null });
    expect(await interrumpirSesion({ sesionId: SESION_ID })).toEqual({
      ok: true,
      datos: { id: SESION_ID },
    });
    expect(db.de('sesion')[0]).toMatchObject({
      valores: { estado: 'interrumpida' },
      filtros: [
        ['eq', 'id', SESION_ID],
        ['eq', 'estado', 'en_curso'],
      ],
    });
    expect(await interrumpirSesion({ sesionId: SESION_ID })).toMatchObject({ ok: false });
  });

  it('exige un docente', async () => {
    vi.mocked(requerirDocente).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(interrumpirSesion({ sesionId: SESION_ID })).rejects.toThrow('NEXT_REDIRECT');
  });
});
