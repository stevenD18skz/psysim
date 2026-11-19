import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { obtenerEstudiante, obtenerEstudiantes } from './queries';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

let db: SupabaseFalso;
let dbPrivilegiada: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  dbPrivilegiada = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(createAdminClient).mockReturnValue(dbPrivilegiada.cliente as never);
});

const FILA = {
  id: 'e1',
  codigo: '202012345',
  nombre: 'Ana María',
  correo: 'ana.maria@correounivalle.edu.co',
  cuenta_vinculada: true,
  creado_en: '2026-10-01T15:00:00.000Z',
  sesiones_total: 3,
  sesiones_finalizadas: 2,
  sesiones_en_curso: 1,
  pendientes_retroalimentacion: 1,
  nota_promedio: 4.3,
  segundos_practica: 1800,
  casos_distintos: 2,
  intervenciones: 14,
  ultima_sesion: '2026-10-05T15:00:00.000Z',
  codigos_pendientes: 2,
};

describe('obtenerEstudiantes', () => {
  it('lee la vista de métricas y el avatar de la cuenta vinculada', async () => {
    db.responder('estudiante_resumen', { data: [FILA] });
    dbPrivilegiada.responder('estudiante', {
      data: [{ id: 'e1', cuenta: { avatar_id: 'brujula' } }],
    });

    expect(await obtenerEstudiantes()).toEqual([
      {
        id: 'e1',
        codigo: '202012345',
        nombre: 'Ana María',
        correo: 'ana.maria@correounivalle.edu.co',
        cuentaVinculada: true,
        avatarId: 'brujula',
        creadoEn: '2026-10-01T15:00:00.000Z',
        metricas: {
          sesiones: 3,
          finalizadas: 2,
          enCurso: 1,
          pendientesRetroalimentacion: 1,
          notaPromedio: 4.3,
          codigosPendientes: 2,
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
    expect(dbPrivilegiada.de('estudiante')).toMatchObject([
      {
        columnas: 'id, cuenta:usuario!estudiante_usuario_id_fkey ( avatar_id )',
        filtros: [['in', 'id', ['e1']]],
      },
    ]);
  });

  it('las columnas nulas de la vista se leen como cero y omite filas incompletas', async () => {
    db.responder('estudiante_resumen', {
      data: [
        {
          id: 'e2',
          codigo: '202099999',
          nombre: 'Sin sesiones',
          correo: null,
          cuenta_vinculada: null,
          creado_en: '2026-10-01T15:00:00.000Z',
          sesiones_total: null,
          sesiones_finalizadas: null,
          sesiones_en_curso: null,
          pendientes_retroalimentacion: null,
          nota_promedio: null,
          segundos_practica: null,
          casos_distintos: null,
          intervenciones: null,
          ultima_sesion: null,
          codigos_pendientes: null,
        },
        { id: null, codigo: null, nombre: null, creado_en: null },
      ],
    });

    const [estudiante, ...resto] = await obtenerEstudiantes();
    expect(resto).toHaveLength(0);
    expect(estudiante).toMatchObject({ correo: null, cuentaVinculada: false, avatarId: null });
    expect(dbPrivilegiada.de('estudiante')).toHaveLength(0);
    expect(estudiante!.metricas).toEqual({
      sesiones: 0,
      finalizadas: 0,
      enCurso: 0,
      pendientesRetroalimentacion: 0,
      notaPromedio: null,
      codigosPendientes: 0,
      segundosPractica: 0,
      casos: 0,
      intervenciones: 0,
      ultimaSesion: null,
    });
  });

  it('conserva el registro con iniciales si no tiene avatar o falta la columna', async () => {
    db.responder('estudiante_resumen', { data: [FILA] }, { data: [FILA] });
    dbPrivilegiada.responder(
      'estudiante',
      { data: [{ id: 'e1', cuenta: { avatar_id: null } }] },
      { error: { code: '42703' } }
    );

    expect(await obtenerEstudiantes()).toMatchObject([{ id: 'e1', avatarId: null }]);
    expect(await obtenerEstudiantes()).toMatchObject([{ id: 'e1', avatarId: null }]);
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('estudiante_resumen', { error: { code: '500' } });
    await expect(obtenerEstudiantes()).rejects.toThrow('No pudimos cargar los estudiantes');
  });
});

describe('obtenerEstudiante', () => {
  it('busca por id en la vista (RLS: solo los del docente)', async () => {
    db.responder('estudiante_resumen', { data: FILA }, { data: null });
    dbPrivilegiada.responder('estudiante', { data: [] });
    expect(await obtenerEstudiante('e1')).toMatchObject({ id: 'e1', nombre: 'Ana María' });
    expect(db.de('estudiante_resumen')[0]!.filtros).toEqual([['eq', 'id', 'e1']]);
    expect(await obtenerEstudiante('otro')).toBeNull();
    expect(dbPrivilegiada.de('estudiante')).toHaveLength(1);
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('estudiante_resumen', { error: { code: '500' } });
    await expect(obtenerEstudiante('e1')).rejects.toThrow('No pudimos cargar al estudiante');
  });
});
