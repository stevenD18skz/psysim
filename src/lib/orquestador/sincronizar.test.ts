import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrquestadorEnv } from '@/lib/env/orquestador';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { type ClienteOrquestador } from './cliente';
import {
  type CasoSincronizado,
  guardarCasoSincronizado,
  leerCasoSincronizado,
  registrarEvento,
} from './datos';
import { ErrorOrquestador } from './errores';
import {
  type CasoParaOrquestador,
  escenarioDelCaso,
  huellaDelPrompt,
  huellaDeSincronizacion,
  perfilDelCaso,
} from './mapeo';
import { asegurarCaso, sincronizarCasoGuardado, sincronizarOficiales } from './sincronizar';
import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/env/orquestador', () => ({ getOrquestadorEnv: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('./datos', () => ({
  leerCasoSincronizado: vi.fn(),
  guardarCasoSincronizado: vi.fn(),
  registrarEvento: vi.fn(),
}));

const ESCENARIO = '0f8fad5b-d9cb-469f-a165-70867728950e';
const PERFIL = '11111111-1111-4111-8111-111111111111';
const ESCENARIO_ORQUESTADOR = '22222222-2222-4222-8222-222222222222';
const VARIANTE_ORQUESTADOR = '33333333-3333-4333-8333-333333333333';
const DOCENTE = { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta-1' };

const PROMPT = 'Eres Marta Lucía, 58 años. Enviudaste hace cuatro meses.';
const PROMPT_AJUSTADO = `${PROMPT}\nHoy llegas especialmente callada.`;

/** El caso tal como está en la base de datos de PsySim. */
const fila = {
  codigo: 'E-01',
  titulo: 'Duelo y pérdida',
  categoria: 'clinico',
  dificultad: 'basico',
  borrador: null,
  docente_id: null,
  npc: {
    nombre: 'Marta Lucía',
    edad: 58,
    perfil_clinico: 'Viuda reciente.',
    prompt_sistema: PROMPT,
  },
};

const caso: CasoParaOrquestador = {
  codigo: 'E-01',
  titulo: 'Duelo y pérdida',
  categoria: 'clinico',
  dificultad: 'basico',
  paciente: { nombre: 'Marta Lucía', edad: 58, perfilClinico: 'Viuda reciente.' },
  prompt: PROMPT,
  campos: null,
};
const HUELLA = huellaDeSincronizacion(perfilDelCaso(caso), escenarioDelCaso(caso));
const alDia: CasoSincronizado = {
  huella: HUELLA,
  perfilId: PERFIL,
  escenarioId: ESCENARIO_ORQUESTADOR,
};

function clienteFalso() {
  const falso = {
    crearPerfil: vi.fn(async () => PERFIL),
    crearEscenario: vi.fn(async () => ESCENARIO_ORQUESTADOR),
    actualizarPerfil: vi.fn(async () => undefined),
    actualizarEscenario: vi.fn(async () => undefined),
  };
  return { falso, cliente: falso as unknown as ClienteOrquestador };
}

/** Lo que PsySim tiene anotado de cada variante (`''` = el caso tal cual). */
function sincronizados(filas: Record<string, CasoSincronizado | null>) {
  vi.mocked(leerCasoSincronizado).mockImplementation(
    async (_, variante) => filas[variante] ?? null
  );
}

let db: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  db = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(db.cliente as never);
  vi.mocked(getOrquestadorEnv).mockReturnValue({
    url: 'https://orquestador.test',
    docente: DOCENTE,
    grupo: [],
  });
  vi.mocked(guardarCasoSincronizado).mockResolvedValue(undefined);
  vi.mocked(registrarEvento).mockResolvedValue(undefined);
  sincronizados({});
});

describe('asegurarCaso', () => {
  it('la primera vez crea el perfil y el escenario -3D- y guarda sus id', async () => {
    db.responder('escenario', { data: fila });
    const { falso, cliente } = clienteFalso();

    const ids = await asegurarCaso(ESCENARIO, null, { cliente });

    expect(ids).toEqual({ perfilId: PERFIL, escenarioId: ESCENARIO_ORQUESTADOR });
    expect(falso.crearPerfil).toHaveBeenCalledWith(
      expect.objectContaining(DOCENTE),
      expect.objectContaining({ name: '-3D- Marta Lucía (E-01)' })
    );
    const [, escenario] = falso.crearEscenario.mock.calls[0] as unknown as [
      unknown,
      { name: string; context: string },
    ];
    expect(escenario.name).toMatch(/^-3D- E-01 · Duelo y pérdida$/);
    // El contexto lleva el prompt del caso y las reglas fijas de PsySim.
    expect(escenario.context).toContain(PROMPT);
    expect(escenario.context).toContain('Reglas de interpretación:');
    expect(guardarCasoSincronizado).toHaveBeenCalledWith(ESCENARIO, '', alDia);
    // Crear por primera vez no es una recreación: no se registra.
    expect(registrarEvento).not.toHaveBeenCalled();
  });

  it('si nada cambió desde la última vez, no llama al orquestador', async () => {
    db.responder('escenario', { data: fila });
    sincronizados({ '': alDia });
    const { falso, cliente } = clienteFalso();

    expect(await asegurarCaso(ESCENARIO, null, { cliente })).toEqual({
      perfilId: PERFIL,
      escenarioId: ESCENARIO_ORQUESTADOR,
    });
    for (const llamada of Object.values(falso)) expect(llamada).not.toHaveBeenCalled();
    expect(guardarCasoSincronizado).not.toHaveBeenCalled();
  });

  it('si el caso cambió, actualiza el perfil y el escenario y conserva sus id', async () => {
    db.responder('escenario', { data: { ...fila, titulo: 'Duelo reciente' } });
    sincronizados({ '': alDia });
    const { falso, cliente } = clienteFalso();

    await asegurarCaso(ESCENARIO, null, { cliente });

    expect(falso.actualizarPerfil).toHaveBeenCalledWith(
      expect.anything(),
      PERFIL,
      expect.any(Object)
    );
    expect(falso.actualizarEscenario).toHaveBeenCalledWith(
      expect.anything(),
      ESCENARIO_ORQUESTADOR,
      expect.objectContaining({ name: '-3D- E-01 · Duelo reciente' })
    );
    expect(falso.crearPerfil).not.toHaveBeenCalled();
    const [, , guardado] = vi.mocked(guardarCasoSincronizado).mock.calls[0]!;
    expect(guardado).toMatchObject({ perfilId: PERFIL, escenarioId: ESCENARIO_ORQUESTADOR });
    expect(guardado.huella).not.toBe(HUELLA);
  });

  it.each([
    ['borraron los datos de prueba (404)', new ErrorOrquestador('no_encontrado', { estado: 404 })],
    ['los creó otra cuenta (403)', new ErrorOrquestador('permiso', { estado: 403 })],
  ])('si al actualizar resulta que %s, los crea de nuevo y lo registra', async (_, error) => {
    db.responder('escenario', { data: { ...fila, titulo: 'Duelo reciente' } });
    sincronizados({ '': alDia });
    const { falso, cliente } = clienteFalso();
    falso.actualizarPerfil.mockRejectedValue(error);

    await asegurarCaso(ESCENARIO, null, { cliente });

    expect(falso.crearPerfil).toHaveBeenCalledOnce();
    expect(falso.crearEscenario).toHaveBeenCalledOnce();
    expect(log.warn).toHaveBeenCalledWith('orquestador.caso_recreado', { escenario_id: ESCENARIO });
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'caso', detalle: 'recreado' });
  });

  it('otros fallos al actualizar se propagan sin crear duplicados', async () => {
    db.responder('escenario', { data: { ...fila, titulo: 'Duelo reciente' } });
    sincronizados({ '': alDia });
    const { falso, cliente } = clienteFalso();
    falso.actualizarPerfil.mockRejectedValue(new ErrorOrquestador('servidor', { estado: 503 }));

    await expect(asegurarCaso(ESCENARIO, null, { cliente })).rejects.toMatchObject({
      tipo: 'servidor',
    });
    expect(falso.crearPerfil).not.toHaveBeenCalled();
  });

  it('con `recrear` no intenta actualizar: crea los dos de nuevo', async () => {
    db.responder('escenario', { data: fila });
    sincronizados({ '': alDia });
    const { falso, cliente } = clienteFalso();

    await asegurarCaso(ESCENARIO, null, { cliente, recrear: true });

    expect(falso.actualizarPerfil).not.toHaveBeenCalled();
    expect(falso.crearPerfil).toHaveBeenCalledOnce();
    expect(falso.crearEscenario).toHaveBeenCalledOnce();
  });

  it('falla si el caso no existe o no tiene paciente', async () => {
    db.responder('escenario', { data: null });
    await expect(
      asegurarCaso(ESCENARIO, null, { cliente: clienteFalso().cliente })
    ).rejects.toThrow(/no existe/);

    db.responder('escenario', { error: { code: 'XX000' } });
    await expect(
      asegurarCaso(ESCENARIO, null, { cliente: clienteFalso().cliente })
    ).rejects.toThrow(/No pudimos leer el caso/);
  });

  describe('práctica con el prompt ajustado por el docente', () => {
    const variante = huellaDelPrompt(PROMPT_AJUSTADO);

    it('si el prompt de la práctica es el del caso, usa el escenario del caso', async () => {
      db.responder('escenario', { data: fila });
      sincronizados({ '': alDia });
      const { falso, cliente } = clienteFalso();

      // Los espacios de más no hacen que sea otro prompt.
      const ids = await asegurarCaso(ESCENARIO, `  ${PROMPT}\n`, { cliente });
      expect(ids.escenarioId).toBe(ESCENARIO_ORQUESTADOR);
      expect(falso.crearEscenario).not.toHaveBeenCalled();
    });

    it('si difiere, crea un escenario variante con el mismo perfil y lo recuerda', async () => {
      db.responder('escenario', { data: fila });
      sincronizados({ '': alDia });
      const { falso, cliente } = clienteFalso();
      falso.crearEscenario.mockResolvedValue(VARIANTE_ORQUESTADOR);

      const ids = await asegurarCaso(ESCENARIO, PROMPT_AJUSTADO, { cliente });

      expect(ids).toEqual({ perfilId: PERFIL, escenarioId: VARIANTE_ORQUESTADOR });
      const [, escenario] = falso.crearEscenario.mock.calls[0] as unknown as [
        unknown,
        { name: string; context: string },
      ];
      expect(escenario.name).toBe(`-3D- E-01 · Duelo y pérdida · ajuste ${variante.slice(0, 8)}`);
      expect(escenario.context).toContain('especialmente callada');
      expect(falso.crearPerfil).not.toHaveBeenCalled();
      expect(guardarCasoSincronizado).toHaveBeenCalledWith(
        ESCENARIO,
        variante,
        expect.objectContaining({ perfilId: PERFIL, escenarioId: VARIANTE_ORQUESTADOR })
      );
    });

    it('otra práctica con el mismo ajuste reutiliza el escenario variante', async () => {
      db.responder('escenario', { data: fila });
      const escenarioVariante = escenarioDelCaso({ ...caso, prompt: PROMPT_AJUSTADO }, variante);
      sincronizados({
        '': alDia,
        [variante]: {
          huella: huellaDeSincronizacion(perfilDelCaso(caso), escenarioVariante),
          perfilId: PERFIL,
          escenarioId: VARIANTE_ORQUESTADOR,
        },
      });
      const { falso, cliente } = clienteFalso();

      const ids = await asegurarCaso(ESCENARIO, PROMPT_AJUSTADO, { cliente });
      expect(ids.escenarioId).toBe(VARIANTE_ORQUESTADOR);
      expect(falso.crearEscenario).not.toHaveBeenCalled();
      expect(falso.actualizarEscenario).not.toHaveBeenCalled();
    });

    it('si la variante quedó desactualizada la actualiza; si la borraron, la crea otra vez', async () => {
      const vieja = {
        huella: '0000000000000000',
        perfilId: PERFIL,
        escenarioId: VARIANTE_ORQUESTADOR,
      };
      db.responder('escenario', { data: fila }, { data: fila });
      sincronizados({ '': alDia, [variante]: vieja });
      const { falso, cliente } = clienteFalso();

      await asegurarCaso(ESCENARIO, PROMPT_AJUSTADO, { cliente });
      expect(falso.actualizarEscenario).toHaveBeenCalledWith(
        expect.anything(),
        VARIANTE_ORQUESTADOR,
        expect.any(Object)
      );
      expect(falso.crearEscenario).not.toHaveBeenCalled();

      falso.actualizarEscenario.mockRejectedValue(
        new ErrorOrquestador('no_encontrado', { estado: 404 })
      );
      await asegurarCaso(ESCENARIO, PROMPT_AJUSTADO, { cliente });
      expect(falso.crearEscenario).toHaveBeenCalledOnce();
    });
  });
});

describe('sincronizarCasoGuardado', () => {
  it('si el orquestador no responde, no frena al docente: queda para la primera práctica', async () => {
    db.responder('escenario', { data: null });
    await expect(sincronizarCasoGuardado(ESCENARIO)).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith('orquestador.caso_no_sincronizado', {
      escenario_id: ESCENARIO,
      tipo: 'desconocido',
    });
  });
});

describe('sincronizarOficiales', () => {
  it('recorre los casos oficiales y dice cuál se sincronizó, cuál estaba al día y cuál falló', async () => {
    const { cliente } = clienteFalso();
    db.responder('escenario', {
      data: [
        { id: 'a', codigo: 'E-01' },
        { id: 'b', codigo: 'E-02' },
        { id: 'c', codigo: 'E-03' },
      ],
    });
    // E-01 es nuevo, E-02 ya estaba al día y E-03 no se puede leer.
    db.responder('escenario', { data: fila }, { data: fila }, { error: { code: 'XX000' } });
    const guardados = new Map<string, CasoSincronizado>([['b', alDia]]);
    vi.mocked(leerCasoSincronizado).mockImplementation(async id => guardados.get(id) ?? null);
    vi.mocked(guardarCasoSincronizado).mockImplementation(async (id, _, valor) => {
      guardados.set(id, valor);
    });

    expect(await sincronizarOficiales({ cliente })).toEqual([
      { codigo: 'E-01', estado: 'sincronizado' },
      { codigo: 'E-02', estado: 'al_dia' },
      { codigo: 'E-03', estado: 'error' },
    ]);
    const [lista] = db.de('escenario');
    expect(lista!.filtros).toEqual(
      expect.arrayContaining([
        ['is', 'docente_id', null],
        ['eq', 'activo', true],
      ])
    );
  });

  it('falla si no puede leer la lista de casos', async () => {
    db.responder('escenario', { error: { code: 'XX000' } });
    await expect(sincronizarOficiales()).rejects.toThrow(/casos oficiales/);
  });
});
