import { beforeEach, describe, expect, it, vi } from 'vitest';

import { leerEscenarioDeSesion } from '@/lib/sesiones/datos-privados';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  obtenerCatalogoEscenarios,
  obtenerIdUltimaSesionEnCurso,
  obtenerMensajesSesion,
  obtenerSesionEnCurso,
} from './queries';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/sesiones/datos-privados', () => ({ leerEscenarioDeSesion: vi.fn() }));

const NPC = {
  id: 'n1',
  nombre: 'Marta Lucía',
  edad: 58,
  perfil_clinico: 'Viuda reciente.',
  prompt_sistema: 'Eres Marta Lucía.',
};
const FILA_ESCENARIO = {
  id: 'e1',
  codigo: 'E-01',
  titulo: 'Duelo y pérdida',
  descripcion: 'Duelo reciente.',
  categoria: 'clinico',
  dificultad: 'basico',
  competencia_central: 'Empatía',
  configuracion_3d: 'scenes/e-01.json',
  docente_id: null,
  borrador: null,
  creado_en: '2026-09-30T10:00:00.000Z',
  npc: NPC,
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
});

describe('obtenerCatalogoEscenarios', () => {
  it('convierte las filas al formato de la interfaz y marca los casos propios', async () => {
    db.responder('escenario', {
      data: [
        FILA_ESCENARIO,
        { ...FILA_ESCENARIO, id: 'c1', codigo: 'C-00000001', docente_id: 'd1' },
      ],
    });

    const [oficial, propio] = await obtenerCatalogoEscenarios();

    expect(oficial).toEqual({
      id: 'e1',
      codigo: 'E-01',
      titulo: 'Duelo y pérdida',
      descripcion: 'Duelo reciente.',
      categoria: 'clinico',
      dificultad: 'basico',
      competenciaCentral: 'Empatía',
      configuracion3d: 'scenes/e-01.json',
      propio: false,
      borrador: null,
      creadoEn: '2026-09-30T10:00:00.000Z',
      npc: {
        id: 'n1',
        nombre: 'Marta Lucía',
        edad: 58,
        perfilClinico: 'Viuda reciente.',
        promptSistema: 'Eres Marta Lucía.',
      },
    });
    expect(propio?.propio).toBe(true);
    expect(db.de('escenario')[0]!.filtros).toEqual([
      ['eq', 'activo', true],
      ['order', 'codigo'],
    ]);
  });

  it('omite escenarios sin paciente e ignora borradores que no cumplen el esquema', async () => {
    db.responder('escenario', {
      data: [
        { ...FILA_ESCENARIO, id: 'sin-npc', npc: null },
        { ...FILA_ESCENARIO, borrador: { basura: true } },
      ],
    });
    const catalogo = await obtenerCatalogoEscenarios();
    expect(catalogo.map(e => e.id)).toEqual(['e1']);
    expect(catalogo[0]!.borrador).toBeNull();
  });

  it('propaga los errores de la base de datos al error boundary', async () => {
    db.responder('escenario', { error: { code: '500' } });
    await expect(obtenerCatalogoEscenarios()).rejects.toThrow('No fue posible cargar');
  });
});

describe('obtenerSesionEnCurso', () => {
  const FILA_SESION = {
    id: 's1',
    inicio: '2026-10-06T15:00:00.000Z',
    comenzada: true,
    codigo_estudiante: '202012345',
    nombre_estudiante: 'Ana María',
    escenario_id: 'e1',
  };
  const ESCENARIO = {
    id: 'e1',
    codigo: 'E-01',
    titulo: 'Duelo y pérdida',
    descripcion: 'Duelo reciente.',
    categoria: 'clinico' as const,
    dificultad: 'basico' as const,
    competenciaCentral: 'Empatía',
    configuracion3d: 'scenes/e-01.json',
    npc: { id: 'n1', nombre: 'Marta Lucía', edad: 58, perfilClinico: 'Viuda reciente.' },
  };

  it('devuelve la sesión con el estudiante, el escenario y el paciente', async () => {
    db.responder('sesion', { data: FILA_SESION });
    vi.mocked(leerEscenarioDeSesion).mockResolvedValueOnce(ESCENARIO);

    const sesion = await obtenerSesionEnCurso('s1');

    expect(sesion).toMatchObject({
      id: 's1',
      comenzada: true,
      estudiante: { codigo: '202012345', nombre: 'Ana María' },
      escenario: { codigo: 'E-01', configuracion3d: 'scenes/e-01.json' },
      npc: { id: 'n1', nombre: 'Marta Lucía', edad: 58, perfilClinico: 'Viuda reciente.' },
    });
    // El caso se lee aparte (el estudiante no tiene acceso a `escenario`) y sin el prompt.
    expect(leerEscenarioDeSesion).toHaveBeenCalledWith('e1');
    expect(sesion?.npc).not.toHaveProperty('promptSistema');
    expect(db.de('sesion')[0]!.columnas).not.toContain('prompt_sistema');
    expect(db.de('sesion')[0]!.filtros).toEqual([
      ['eq', 'id', 's1'],
      ['eq', 'estado', 'en_curso'],
    ]);
  });

  it('es null si no existe, no es del estudiante o ya terminó, sin leer el caso', async () => {
    db.responder('sesion', { data: null });
    expect(await obtenerSesionEnCurso('s1')).toBeNull();
    expect(leerEscenarioDeSesion).not.toHaveBeenCalled();
  });

  it('es null si al caso le falta el paciente', async () => {
    db.responder('sesion', { data: FILA_SESION });
    vi.mocked(leerEscenarioDeSesion).mockResolvedValueOnce(null);
    expect(await obtenerSesionEnCurso('s2')).toBeNull();
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('sesion', { error: { code: '500' } });
    await expect(obtenerSesionEnCurso('s1')).rejects.toThrow('No fue posible cargar la sesión');
  });
});

describe('obtenerMensajesSesion', () => {
  it('devuelve el historial en orden, con la latencia solo en las respuestas', async () => {
    db.responder('mensaje', {
      data: [
        {
          id: 'm1',
          remitente: 'estudiante',
          contenido: 'Hola',
          creado_en: 'T1',
          latencia_ms: null,
        },
        { id: 'm2', remitente: 'npc', contenido: 'Buenas', creado_en: 'T1', latencia_ms: 900 },
      ],
    });

    expect(await obtenerMensajesSesion('s1')).toEqual([
      { id: 'm1', remitente: 'estudiante', contenido: 'Hola', timestamp: 'T1' },
      { id: 'm2', remitente: 'npc', contenido: 'Buenas', timestamp: 'T1', latencia_ms: 900 },
    ]);
    // Mismo instante: el orden del enum (estudiante < npc) desempata.
    expect(db.de('mensaje')[0]!.filtros).toEqual([
      ['eq', 'sesion_id', 's1'],
      ['order', 'creado_en'],
      ['order', 'remitente'],
    ]);
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('mensaje', { error: { code: '500' } });
    await expect(obtenerMensajesSesion('s1')).rejects.toThrow('conversación');
  });
});

describe('obtenerIdUltimaSesionEnCurso', () => {
  it('devuelve la sesión en curso más reciente o null', async () => {
    db.responder('sesion', { data: { id: 's9' } }, { data: null });
    expect(await obtenerIdUltimaSesionEnCurso()).toBe('s9');
    expect(await obtenerIdUltimaSesionEnCurso()).toBeNull();
  });

  it('propaga los errores de la base de datos', async () => {
    db.responder('sesion', { error: { code: '500' } });
    await expect(obtenerIdUltimaSesionEnCurso()).rejects.toThrow('sesiones en curso');
  });
});
