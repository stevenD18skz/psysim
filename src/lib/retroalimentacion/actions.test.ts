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
} from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirDocente: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';
const MENSAJE_ID = '55555555-5555-4555-8555-555555555555';
const ANOTACION_ID = '66666666-6666-4666-8666-666666666666';
const VERSION = '2026-10-07T20:00:00.123456+00:00';
const BORRADOR = {
  sesionId: SESION_ID,
  modo: 'borrador',
  version: null,
  comentarioGeneral: '',
  nota: null,
};
const GUARDADA = {
  resultado: 'guardado',
  comentario_general: 'Bien',
  nota: 4.5,
  publicada_en: null,
  actualizado_en: VERSION,
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(requerirDocente).mockResolvedValue({} as never);
});

describe('guardarRetroalimentacion', () => {
  it('envía la intención de guardar un borrador nuevo', async () => {
    db.responder('rpc:guardar_revision', { data: GUARDADA });

    expect(
      await guardarRetroalimentacion({
        ...BORRADOR,
        comentarioGeneral: ' Bien ',
        nota: 4.5,
      })
    ).toEqual({
      ok: true,
      datos: {
        conflicto: false,
        revision: {
          comentarioGeneral: 'Bien',
          nota: 4.5,
          publicadaEn: null,
          actualizadoEn: VERSION,
        },
      },
    });
    expect(db.rpc).toHaveBeenCalledWith('guardar_revision', {
      p_sesion_id: SESION_ID,
      p_modo: 'borrador',
      p_version: null,
      p_comentario: 'Bien',
      p_nota: 4.5,
    });
  });

  it('devuelve la revisión actual si otra pestaña publicó', async () => {
    db.responder('rpc:guardar_revision', {
      data: { ...GUARDADA, resultado: 'conflicto', publicada_en: VERSION },
    });

    expect(
      await guardarRetroalimentacion({ ...BORRADOR, version: VERSION, nota: 2 })
    ).toMatchObject({
      ok: true,
      datos: { conflicto: true, revision: { nota: 4.5, publicadaEn: VERSION } },
    });
    expect(db.rpc).toHaveBeenCalledWith(
      'guardar_revision',
      expect.objectContaining({ p_modo: 'borrador', p_version: VERSION, p_nota: 2 })
    );
  });

  it('con la sesión en curso, RLS lo impide y se explica', async () => {
    db.responder('rpc:guardar_revision', { error: { code: '42501' } });
    expect(await guardarRetroalimentacion(BORRADOR)).toEqual({
      ok: false,
      error: 'La práctica sigue en curso: podrás revisarla cuando el estudiante termine.',
    });
  });

  it('rechaza una nota fuera de escala', async () => {
    expect(await guardarRetroalimentacion({ ...BORRADOR, nota: 7 })).toEqual({
      ok: false,
      error: 'La nota máxima es 5,0.',
    });
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe('publicar la retroalimentación', () => {
  it('publica con la nota y el comentario', async () => {
    db.responder('rpc:guardar_revision', { data: { ...GUARDADA, publicada_en: VERSION } });

    expect(
      await guardarRetroalimentacion({
        ...BORRADOR,
        modo: 'publicar',
        version: VERSION,
        comentarioGeneral: 'Buen trabajo.',
        nota: 4,
      })
    ).toMatchObject({ ok: true, datos: { conflicto: false, revision: { publicadaEn: VERSION } } });
    expect(db.rpc).toHaveBeenCalledWith(
      'guardar_revision',
      expect.objectContaining({
        p_modo: 'publicar',
        p_version: VERSION,
        p_comentario: 'Buen trabajo.',
        p_nota: 4,
      })
    );
  });

  it('sin nota no se publica', async () => {
    expect(
      await guardarRetroalimentacion({
        ...BORRADOR,
        modo: 'publicar',
        comentarioGeneral: 'Bien',
        nota: null,
      })
    ).toEqual({ ok: false, error: 'Pon la nota antes de guardar cambios públicos.' });
  });
});

describe('anotaciones', () => {
  const NUEVA = {
    id: ANOTACION_ID,
    sesionId: SESION_ID,
    mensajeId: MENSAJE_ID,
    inicio: 0,
    fin: 4,
    comentario: 'Aquí sonaste muy directo.',
  };

  it('solicita la anotación con el identificador estable del editor', async () => {
    db.responder('rpc:crear_anotacion_revision', {
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
    expect(db.rpc).toHaveBeenCalledWith('crear_anotacion_revision', {
      p_id: ANOTACION_ID,
      p_sesion_id: SESION_ID,
      p_mensaje_id: MENSAJE_ID,
      p_inicio: 0,
      p_fin: 4,
      p_comentario: NUEVA.comentario,
    });
  });

  it('devuelve el comentario persistido al recuperar el intento', async () => {
    db.responder('rpc:crear_anotacion_revision', {
      data: {
        id: ANOTACION_ID,
        mensaje_id: MENSAJE_ID,
        inicio: 0,
        fin: 4,
        fragmento: 'Hola',
        comentario: 'x',
      },
    });

    expect(await crearAnotacion(NUEVA)).toMatchObject({
      ok: true,
      datos: { id: ANOTACION_ID, comentario: 'x' },
    });
  });

  it.each([
    ['23P01', 'Ese fragmento se cruza con otro comentario. Elige otro.'],
    ['23514', 'Solo puedes subrayar las intervenciones del estudiante.'],
    ['500', 'No pudimos guardar el comentario. Inténtalo de nuevo.'],
  ])('traduce el error %s', async (codigo, mensaje) => {
    db.responder('rpc:crear_anotacion_revision', { error: { code: codigo } });
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
