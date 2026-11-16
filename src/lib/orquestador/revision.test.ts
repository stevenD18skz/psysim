import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { obtenerIaDeSesion } from './revision';
import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

const SESION = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';

let db: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  db = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(db.cliente as never);
});

describe('obtenerIaDeSesion', () => {
  it('devuelve la severidad de cada respuesta y el motivo del cierre automático', async () => {
    db.responder('sesion_ia', { data: { cierre_motivo: 'crisis' } });
    db.responder('mensaje_ia', {
      data: [
        { mensaje_id: 'm1', severidad: 2.5 },
        { mensaje_id: 'm2', severidad: 5 },
      ],
    });

    expect(await obtenerIaDeSesion(SESION)).toEqual({
      cierre: 'crisis',
      severidades: { m1: 2.5, m2: 5 },
      finPorTiempo: false,
    });
    expect(db.de('mensaje_ia')[0]!.filtros).toEqual(
      expect.arrayContaining([['eq', 'sesion_id', SESION]])
    );
  });

  it('una práctica de Gemini sin cierre no tiene nada que mostrar', async () => {
    db.responder('sesion_ia', { data: { cierre_motivo: null } });
    db.responder('mensaje_ia', { data: [] });
    expect(await obtenerIaDeSesion(SESION)).toBeNull();
  });

  it('una práctica que terminó al cumplirse el tiempo lo indica, aunque no tenga cierre', async () => {
    db.responder('sesion_ia', { data: { cierre_motivo: null } });
    db.responder('mensaje_ia', { data: [] });
    db.responder('sesion', { data: { fin_motivo: 'tiempo' } });
    expect(await obtenerIaDeSesion(SESION)).toEqual({
      cierre: null,
      severidades: {},
      finPorTiempo: true,
    });
  });

  it('si no se puede leer el motivo del fin (columna aún sin crear), la revisión sigue', async () => {
    db.responder('sesion_ia', { data: { cierre_motivo: 'inapropiada' } });
    db.responder('mensaje_ia', { data: [] });
    db.responder('sesion', { error: { code: '42703' } });
    expect(await obtenerIaDeSesion(SESION)).toEqual({
      cierre: 'inapropiada',
      severidades: {},
      finPorTiempo: false,
    });
  });

  it('si no se puede leer, la revisión sigue sin estos datos', async () => {
    db.responder('sesion_ia', { error: { code: '42P01' } });
    db.responder('mensaje_ia', { data: [] });
    expect(await obtenerIaDeSesion(SESION)).toBeNull();
    expect(log.warn).toHaveBeenCalledWith('orquestador.revision_no_leida', { sesion_id: SESION });
  });
});
