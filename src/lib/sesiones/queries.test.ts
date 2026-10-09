import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerMensajesSesion } from '@/lib/escenarios/queries';
import type * as DatosPrivados from '@/lib/sesiones/datos-privados';
import { leerEscenarioDeSesion, leerTitulosDeEscenarios } from '@/lib/sesiones/datos-privados';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  obtenerAsignacionesDeEstudiante,
  obtenerDetalleSesion,
  obtenerPracticas,
  obtenerSesionesDeEstudiante,
} from './queries';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/escenarios/queries', () => ({ obtenerMensajesSesion: vi.fn() }));
vi.mock('@/lib/sesiones/datos-privados', async importOriginal => ({
  ...(await importOriginal<typeof DatosPrivados>()),
  leerEscenarioDeSesion: vi.fn(),
  leerTitulosDeEscenarios: vi.fn(),
}));

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(leerTitulosDeEscenarios).mockResolvedValue(
    new Map([['e1', { codigo: 'E-01', titulo: 'Duelo y pérdida' }]])
  );
});

const FILA_HISTORIAL = {
  id: 's1',
  estado: 'finalizada',
  comenzada: true,
  inicio: '2026-10-07T15:00:00.000Z',
  fin: '2026-10-07T15:20:00.000Z',
  escenario_id: 'e1',
  usuario: { nombre: 'Docente Uno' },
  retroalimentacion: { publicada_en: '2026-10-07T18:00:00.000Z', nota: 4.5 },
};

describe('historial de sesiones', () => {
  it('el estudiante ve sus prácticas con el caso, el docente y la retroalimentación', async () => {
    db.responder('sesion', {
      data: [
        FILA_HISTORIAL,
        {
          ...FILA_HISTORIAL,
          id: 's2',
          escenario_id: 'borrado',
          retroalimentacion: null,
          usuario: null,
        },
      ],
    });

    expect(await obtenerPracticas()).toEqual([
      {
        id: 's1',
        estado: 'finalizada',
        comenzada: true,
        inicio: FILA_HISTORIAL.inicio,
        fin: FILA_HISTORIAL.fin,
        escenario: { codigo: 'E-01', titulo: 'Duelo y pérdida' },
        docente: 'Docente Uno',
        retroalimentacion: { publicada: true, nota: 4.5 },
      },
      expect.objectContaining({
        id: 's2',
        escenario: { codigo: '—', titulo: 'Caso no disponible' },
        docente: null,
        retroalimentacion: null,
      }),
    ]);
    expect(leerTitulosDeEscenarios).toHaveBeenCalledWith(['e1', 'borrado']);
  });

  it('el docente filtra por estudiante', async () => {
    db.responder('sesion', { data: [FILA_HISTORIAL] });
    await obtenerSesionesDeEstudiante('est-1');
    expect(db.de('sesion')[0]!.filtros).toEqual([
      ['eq', 'estudiante_id', 'est-1'],
      ['order', 'inicio', { ascending: false }],
    ]);
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('sesion', { error: { code: '500' } }, { error: { code: '500' } });
    await expect(obtenerPracticas()).rejects.toThrow('tus prácticas');
    await expect(obtenerSesionesDeEstudiante('x')).rejects.toThrow('sesiones del estudiante');
  });
});

describe('obtenerAsignacionesDeEstudiante', () => {
  it('calcula el estado de cada código', async () => {
    db.responder('asignacion', {
      data: [
        {
          id: 'a1',
          codigo: 'abc-defg-hij',
          expira_en: '2999-01-01T00:00:00.000Z',
          anulada_en: null,
          sesion_id: null,
          creado_en: 'T',
          escenario_id: 'e1',
        },
        {
          id: 'a2',
          codigo: 'xyz-abcd-efg',
          expira_en: '2000-01-01T00:00:00.000Z',
          anulada_en: null,
          sesion_id: 's1',
          creado_en: 'T',
          escenario_id: 'e1',
        },
      ],
    });

    const [pendiente, usada] = await obtenerAsignacionesDeEstudiante('est-1');
    expect(pendiente).toMatchObject({
      codigo: 'abc-defg-hij',
      estado: 'pendiente',
      escenario: { codigo: 'E-01' },
    });
    expect(usada).toMatchObject({ estado: 'usada', sesionId: 's1' });
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('asignacion', { error: { code: '500' } });
    await expect(obtenerAsignacionesDeEstudiante('x')).rejects.toThrow('códigos de acceso');
  });
});

describe('obtenerDetalleSesion', () => {
  const FILA = {
    id: 's1',
    estado: 'finalizada',
    comenzada: true,
    inicio: 'T1',
    fin: 'T2',
    escenario_id: 'e1',
    estudiante_id: 'est-1',
    codigo_estudiante: '202012345',
    nombre_estudiante: 'Ana Pérez',
    usuario: { nombre: 'Docente Uno' },
    retroalimentacion: {
      comentario_general: 'Bien.',
      nota: 4,
      publicada_en: null,
      actualizado_en: 'T3',
      anotacion: [
        { id: 'a1', mensaje_id: 'm1', inicio: 0, fin: 4, fragmento: 'Hola', comentario: 'Cálido.' },
      ],
    },
  };

  it('arma la sesión con el caso, el chat y la retroalimentación', async () => {
    db.responder('sesion', { data: FILA });
    vi.mocked(leerEscenarioDeSesion).mockResolvedValueOnce({
      id: 'e1',
      codigo: 'E-01',
      titulo: 'Duelo y pérdida',
      descripcion: 'x',
      categoria: 'clinico',
      dificultad: 'basico',
      competenciaCentral: 'Empatía',
      configuracion3d: 'scenes/e-01.json',
      npc: { id: 'n1', nombre: 'Marta Lucía', edad: 58, perfilClinico: 'x' },
    });
    vi.mocked(obtenerMensajesSesion).mockResolvedValueOnce([
      { id: 'm1', remitente: 'estudiante', contenido: 'Hola', timestamp: 'T1' },
    ]);

    expect(await obtenerDetalleSesion('s1')).toEqual({
      id: 's1',
      estado: 'finalizada',
      comenzada: true,
      inicio: 'T1',
      fin: 'T2',
      estudiante: { id: 'est-1', codigo: '202012345', nombre: 'Ana Pérez' },
      docente: 'Docente Uno',
      escenario: {
        codigo: 'E-01',
        titulo: 'Duelo y pérdida',
        competenciaCentral: 'Empatía',
        configuracion3d: 'scenes/e-01.json',
      },
      npc: { nombre: 'Marta Lucía', edad: 58 },
      mensajes: [{ id: 'm1', remitente: 'estudiante', contenido: 'Hola', timestamp: 'T1' }],
      retroalimentacion: {
        comentarioGeneral: 'Bien.',
        nota: 4,
        publicadaEn: null,
        actualizadoEn: 'T3',
        anotaciones: [
          {
            id: 'a1',
            mensajeId: 'm1',
            inicio: 0,
            fin: 4,
            fragmento: 'Hola',
            comentario: 'Cálido.',
          },
        ],
      },
    });
  });

  it('es null si RLS la oculta, sin leer datos privados', async () => {
    db.responder('sesion', { data: null });
    expect(await obtenerDetalleSesion('otra')).toBeNull();
    expect(leerEscenarioDeSesion).not.toHaveBeenCalled();
  });

  it('sin retroalimentación ni caso disponible usa valores neutros', async () => {
    db.responder('sesion', { data: { ...FILA, retroalimentacion: null } });
    vi.mocked(leerEscenarioDeSesion).mockResolvedValueOnce(null);
    vi.mocked(obtenerMensajesSesion).mockResolvedValueOnce([]);

    expect(await obtenerDetalleSesion('s3')).toMatchObject({
      escenario: { titulo: 'Caso no disponible' },
      retroalimentacion: null,
    });
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('sesion', { error: { code: '500' } });
    await expect(obtenerDetalleSesion('s1')).rejects.toThrow('No fue posible cargar la sesión');
  });
});
