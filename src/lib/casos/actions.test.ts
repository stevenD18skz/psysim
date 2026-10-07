import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requerirDocente } from '@/lib/auth/dal';
import { valoresVacios } from '@/lib/casos/valores';
import type * as ModuloPaciente from '@/lib/ia/paciente';
import { ErrorIA, generarRespuestaPaciente } from '@/lib/ia/paciente';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import {
  actualizarCaso,
  archivarCaso,
  crearCaso,
  guardarVariante,
  probarPaciente,
} from './actions';

vi.mock('@/lib/auth/dal', () => ({ requerirDocente: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/ia/paciente', async importOriginal => ({
  ...(await importOriginal<typeof ModuloPaciente>()),
  generarRespuestaPaciente: vi.fn(),
}));

const CASO_ID = '33333333-3333-4333-8333-333333333333';
const CASO = {
  ...valoresVacios(),
  titulo: 'Duelo por pérdida laboral',
  competenciaCentral: 'Escucha activa',
  nombre: 'Camila Rojas',
  edad: 29,
  situacion: 'Perdió su empleo hace un mes y se siente sin rumbo.',
  fraseApertura: 'Hola, no sé por dónde empezar.',
};
const PROMPT = 'Eres Camila, una mujer de 29 años que perdió su empleo hace un mes.';
const GUARDADO_FALLIDO = {
  ok: false,
  error: 'No fue posible guardar el caso. Inténtalo de nuevo.',
};

let db: SupabaseFalso;

beforeEach(() => {
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(requerirDocente).mockResolvedValue({} as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('crearCaso', () => {
  it('crea el escenario con un código C-NNNNNNNN y luego su paciente', async () => {
    db.responder('escenario', { data: { id: CASO_ID } });

    expect(await crearCaso(CASO)).toEqual({ ok: true, datos: { id: CASO_ID } });

    const [escenario] = db.de('escenario');
    expect(escenario).toMatchObject({
      operacion: 'insert',
      valores: {
        titulo: CASO.titulo,
        configuracion_3d: CASO.consultorio,
        codigo: expect.stringMatching(/^C-\d{8}$/),
      },
    });
    const [npc] = db.de('npc');
    expect(npc).toMatchObject({
      operacion: 'insert',
      valores: { escenario_id: CASO_ID, nombre: 'Camila Rojas', edad: 29 },
    });
    expect((npc!.valores as { prompt_sistema: string }).prompt_sistema).toContain('Camila');
  });

  it('si el código choca con otro caso, reintenta con uno nuevo', async () => {
    db.responder('escenario', { error: { code: '23505' } }, { data: { id: CASO_ID } });
    expect(await crearCaso(CASO)).toMatchObject({ ok: true });
    expect(db.de('escenario')).toHaveLength(2);
  });

  it('se rinde tras cinco códigos repetidos', async () => {
    db.responder('escenario', ...Array.from({ length: 5 }, () => ({ error: { code: '23505' } })));
    expect(await crearCaso(CASO)).toEqual(GUARDADO_FALLIDO);
    expect(db.de('npc')).toHaveLength(0);
  });

  it('no reintenta ante otros errores', async () => {
    db.responder('escenario', { error: { code: '42501' } });
    expect(await crearCaso(CASO)).toEqual(GUARDADO_FALLIDO);
    expect(db.de('escenario')).toHaveLength(1);
  });

  it('si falla el paciente, archiva el escenario para no dejar un caso sin NPC', async () => {
    db.responder('escenario', { data: { id: CASO_ID } });
    db.responder('npc', { error: { code: '23514' } });

    expect(await crearCaso(CASO)).toEqual(GUARDADO_FALLIDO);
    expect(db.de('escenario')[1]).toMatchObject({
      operacion: 'update',
      valores: { activo: false },
      filtros: [['eq', 'id', CASO_ID]],
    });
  });

  it('rechaza un caso incompleto sin tocar la base de datos', async () => {
    expect(await crearCaso({ ...CASO, nombre: '' })).toEqual({
      ok: false,
      error: 'Revisa los datos del caso.',
    });
    expect(db.consultas).toHaveLength(0);
  });
});

describe('actualizarCaso', () => {
  it('actualiza el escenario activo y su paciente', async () => {
    db.responder('escenario', { data: [{ id: CASO_ID }] });

    expect(await actualizarCaso({ id: CASO_ID, caso: CASO })).toEqual({
      ok: true,
      datos: { id: CASO_ID },
    });
    expect(db.de('escenario')[0]!.filtros).toEqual([
      ['eq', 'id', CASO_ID],
      ['eq', 'activo', true],
    ]);
    expect(db.de('npc')[0]).toMatchObject({
      operacion: 'update',
      filtros: [['eq', 'escenario_id', CASO_ID]],
    });
  });

  it('falla si RLS no deja modificarlo (ninguna fila actualizada)', async () => {
    db.responder('escenario', { data: [] });
    expect(await actualizarCaso({ id: CASO_ID, caso: CASO })).toMatchObject({ ok: false });
    expect(db.de('npc')).toHaveLength(0);
  });

  it('falla si no se puede actualizar el paciente', async () => {
    db.responder('escenario', { data: [{ id: CASO_ID }] });
    db.responder('npc', { error: { code: '23514' } });
    expect(await actualizarCaso({ id: CASO_ID, caso: CASO })).toMatchObject({ ok: false });
  });
});

describe('archivarCaso', () => {
  it('archiva solo casos propios (docente_id no nulo)', async () => {
    db.responder('escenario', { data: [{ id: CASO_ID }] });

    expect(await archivarCaso({ id: CASO_ID })).toEqual({ ok: true, datos: { id: CASO_ID } });
    expect(db.de('escenario')[0]).toMatchObject({
      operacion: 'update',
      valores: { activo: false },
      filtros: [
        ['eq', 'id', CASO_ID],
        ['not', 'docente_id', 'is', null],
      ],
    });
  });

  it('falla si no encuentra el caso o el id no es válido', async () => {
    db.responder('escenario', { data: [] });
    expect(await archivarCaso({ id: CASO_ID })).toMatchObject({ ok: false });
    expect(await archivarCaso({ id: 'x' })).toMatchObject({ ok: false });
  });
});

describe('guardarVariante', () => {
  const VARIANTE = {
    escenarioId: '11111111-1111-4111-8111-111111111111',
    titulo: 'Duelo grupo A',
    prompt: PROMPT,
  };

  it('copia el paciente y el consultorio del escenario y guarda el prompt ajustado', async () => {
    db.responder(
      'escenario',
      {
        data: {
          descripcion: 'Duelo reciente.',
          categoria: 'clinico',
          dificultad: 'intermedio',
          competencia_central: 'Empatía',
          configuracion_3d: 'scenes/e-01.json',
          npc: { nombre: 'Marta Lucía', edad: 58, perfil_clinico: 'Viuda reciente.' },
        },
      },
      { data: { id: CASO_ID } }
    );

    expect(await guardarVariante(VARIANTE)).toEqual({ ok: true, datos: { id: CASO_ID } });
    expect(db.de('escenario')[1]!.valores).toMatchObject({
      titulo: 'Duelo grupo A',
      configuracion_3d: 'scenes/e-01.json',
      borrador: null,
    });
    expect(db.de('npc')[0]!.valores).toMatchObject({
      nombre: 'Marta Lucía',
      prompt_sistema: PROMPT,
    });
  });

  it('falla si el escenario de origen ya no está disponible', async () => {
    db.responder('escenario', { data: null });
    expect(await guardarVariante(VARIANTE)).toEqual({
      ok: false,
      error: 'El escenario seleccionado ya no está disponible.',
    });
  });
});

describe('probarPaciente', () => {
  const PRUEBA = { prompt: PROMPT, nombre: 'Camila', mensaje: 'Hola', historial: [] };

  it('responde con el prompt en redacción sin guardar nada', async () => {
    vi.mocked(generarRespuestaPaciente).mockResolvedValueOnce({
      texto: 'Hola… no sé por dónde empezar.',
      emocion: 'ansioso',
      tokensEntrada: 1,
      tokensSalida: 1,
      modelo: 'm',
    });

    expect(await probarPaciente(PRUEBA)).toEqual({
      ok: true,
      datos: { respuesta: 'Hola… no sé por dónde empezar.' },
    });
    expect(generarRespuestaPaciente).toHaveBeenCalledWith({
      promptSistema: PROMPT,
      historial: [],
      mensaje: 'Hola',
      nombrePaciente: 'Camila',
    });
    expect(db.consultas).toHaveLength(0);
  });

  it.each([
    ['tiempo_agotado', /tardó demasiado/],
    ['limite', /saturado/],
  ] as const)('traduce el error %s de la IA a un mensaje para el docente', async (tipo, texto) => {
    vi.mocked(generarRespuestaPaciente).mockRejectedValueOnce(new ErrorIA(tipo));
    const resultado = await probarPaciente(PRUEBA);
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error).toMatch(texto);
  });

  it('un error desconocido se trata como fallo del proveedor', async () => {
    vi.mocked(generarRespuestaPaciente).mockRejectedValueOnce(new Error('boom'));
    expect(await probarPaciente(PRUEBA)).toEqual({
      ok: false,
      error: 'El servicio de IA no está disponible.',
    });
  });

  it('devuelve el primer error de validación', async () => {
    expect(await probarPaciente({ ...PRUEBA, mensaje: '  ' })).toEqual({
      ok: false,
      error: 'Escribe un mensaje.',
    });
  });
});
