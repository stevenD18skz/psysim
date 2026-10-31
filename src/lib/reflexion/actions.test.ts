import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirEstudiante } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { LIMITE_REFLEXION } from '@/schemas/reflexion.schema';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { guardarReflexion } from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirEstudiante: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const SESION_ID = '44444444-4444-4444-8444-444444444444';
let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
});

describe('guardarReflexion (INACSL: conversación posterior)', () => {
  it('guarda la reflexión con la función de la base de datos', async () => {
    const resultado = await guardarReflexion({
      sesionId: SESION_ID,
      contenido: '  Me sirvió validar su emoción.  ',
    });

    expect(resultado).toEqual({ ok: true, datos: { retirada: false } });
    expect(db.rpc).toHaveBeenCalledWith('guardar_reflexion', {
      p_sesion_id: SESION_ID,
      p_contenido: 'Me sirvió validar su emoción.',
    });
  });

  it('un texto vacío la retira', async () => {
    const resultado = await guardarReflexion({ sesionId: SESION_ID, contenido: '   ' });

    expect(resultado).toEqual({ ok: true, datos: { retirada: true } });
    expect(db.rpc).toHaveBeenCalledWith('guardar_reflexion', {
      p_sesion_id: SESION_ID,
      p_contenido: '',
    });
  });

  it('exige ser estudiante antes de tocar la base de datos', async () => {
    vi.mocked(requerirEstudiante).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(guardarReflexion({ sesionId: SESION_ID, contenido: 'x' })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['una sesión que no es UUID', { sesionId: 'abc', contenido: 'x' }],
    ['sin contenido', { sesionId: SESION_ID }],
    [
      'un texto demasiado largo',
      { sesionId: SESION_ID, contenido: 'a'.repeat(LIMITE_REFLEXION + 1) },
    ],
  ])('rechaza %s sin llamar a la base de datos', async (_, valores) => {
    const resultado = await guardarReflexion(valores);
    expect(resultado.ok).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('el texto largo explica el límite', async () => {
    const resultado = await guardarReflexion({
      sesionId: SESION_ID,
      contenido: 'a'.repeat(LIMITE_REFLEXION + 1),
    });
    expect(resultado).toMatchObject({ error: expect.stringContaining(String(LIMITE_REFLEXION)) });
  });

  it('si la práctica sigue en curso dice que se escribe al terminar', async () => {
    db.responder('rpc:guardar_reflexion', { error: { code: '55000', message: 'x' } });
    const resultado = await guardarReflexion({ sesionId: SESION_ID, contenido: 'x' });
    expect(resultado).toEqual({
      ok: false,
      error: 'Podrás escribir tu reflexión cuando termines la práctica.',
    });
  });

  it('un fallo de la base de datos no expone detalles internos', async () => {
    db.responder('rpc:guardar_reflexion', {
      error: { code: '23514', message: 'violates check constraint reflexion_contenido_check' },
    });
    const resultado = await guardarReflexion({ sesionId: SESION_ID, contenido: 'x' });

    expect(resultado.ok).toBe(false);
    expect(JSON.stringify(resultado)).not.toMatch(/constraint|23514|reflexion_contenido/);
  });
});
