import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { obtenerEstudiantes } from './queries';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
});

describe('obtenerEstudiantes', () => {
  it('lee la vista de métricas, del más reciente al más antiguo', async () => {
    db.responder('estudiante_resumen', {
      data: [
        {
          id: 'e1',
          codigo: '202012345',
          nombre: 'Ana María',
          creado_en: '2026-10-01T15:00:00.000Z',
          sesiones_total: 3,
          sesiones_finalizadas: 2,
          segundos_practica: 1800,
          casos_distintos: 2,
          intervenciones: 14,
          ultima_sesion: '2026-10-05T15:00:00.000Z',
        },
      ],
    });

    expect(await obtenerEstudiantes()).toEqual([
      {
        id: 'e1',
        codigo: '202012345',
        nombre: 'Ana María',
        creadoEn: '2026-10-01T15:00:00.000Z',
        metricas: {
          sesiones: 3,
          finalizadas: 2,
          segundosPractica: 1800,
          casos: 2,
          intervenciones: 14,
          ultimaSesion: '2026-10-05T15:00:00.000Z',
        },
      },
    ]);
    expect(db.de('estudiante_resumen')[0]!.filtros).toEqual([
      ['order', 'ultima_sesion', { ascending: false, nullsFirst: false }],
      ['order', 'nombre'],
    ]);
  });

  it('las columnas nulas de la vista se leen como cero y omite filas incompletas', async () => {
    db.responder('estudiante_resumen', {
      data: [
        {
          id: 'e2',
          codigo: '202099999',
          nombre: 'Sin sesiones',
          creado_en: '2026-10-01T15:00:00.000Z',
          sesiones_total: null,
          sesiones_finalizadas: null,
          segundos_practica: null,
          casos_distintos: null,
          intervenciones: null,
          ultima_sesion: null,
        },
        { id: null, codigo: null, nombre: null, creado_en: null },
      ],
    });

    const [estudiante, ...resto] = await obtenerEstudiantes();
    expect(resto).toHaveLength(0);
    expect(estudiante!.metricas).toEqual({
      sesiones: 0,
      finalizadas: 0,
      segundosPractica: 0,
      casos: 0,
      intervenciones: 0,
      ultimaSesion: null,
    });
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('estudiante_resumen', { error: { code: '500' } });
    await expect(obtenerEstudiantes()).rejects.toThrow('No fue posible cargar los estudiantes');
  });
});
