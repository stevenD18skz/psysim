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
const PERFIL_NUEVO = '44444444-4444-4444-8444-444444444444';
const ESCENARIO_NUEVO = '55555555-5555-4555-8555-555555555555';
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
  };
  return { falso, cliente: falso as unknown as ClienteOrquestador };
}

/**
 * Lo que PsySim tiene anotado, por clave: la huella del contenido (o, en filas de versiones
 * anteriores, `''` para el caso y la huella del prompt para una variante).
 */
function sincronizados(filas: Record<string, CasoSincronizado | null>) {
  vi.mocked(leerCasoSincronizado).mockImplementation(async (_, clave) => filas[clave] ?? null);
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
    expect(escenario.context).toBe(PROMPT);
    // Se guarda bajo la huella de lo enviado: cada versión del contenido tiene los suyos.
    expect(guardarCasoSincronizado).toHaveBeenCalledWith(ESCENARIO, HUELLA, alDia);
    // Crear por primera vez no es una recreación: no se registra.
    expect(registrarEvento).not.toHaveBeenCalled();
  });

  it('si ese contenido ya estaba creado, no llama al orquestador', async () => {
    db.responder('escenario', { data: fila });
    sincronizados({ [HUELLA]: alDia });
    const { falso, cliente } = clienteFalso();

    expect(await asegurarCaso(ESCENARIO, null, { cliente })).toEqual({
      perfilId: PERFIL,
      escenarioId: ESCENARIO_ORQUESTADOR,
    });
    for (const llamada of Object.values(falso)) expect(llamada).not.toHaveBeenCalled();
    expect(guardarCasoSincronizado).not.toHaveBeenCalled();
  });

  it('aprovecha lo que guardó una versión anterior (clave vacía) si el contenido es el mismo', async () => {
    db.responder('escenario', { data: fila });
    sincronizados({ '': alDia });
    const { falso, cliente } = clienteFalso();

    expect(await asegurarCaso(ESCENARIO, null, { cliente })).toEqual({
      perfilId: PERFIL,
      escenarioId: ESCENARIO_ORQUESTADOR,
    });
    for (const llamada of Object.values(falso)) expect(llamada).not.toHaveBeenCalled();
  });

  // P2-04: actualizar el escenario cambiaría al paciente de las prácticas que ya lo están usando.
  it('si el caso cambió, crea un perfil y un escenario nuevos y deja intactos los anteriores', async () => {
    db.responder('escenario', { data: { ...fila, titulo: 'Duelo reciente' } });
    sincronizados({ '': alDia, [HUELLA]: alDia });
    const { falso, cliente } = clienteFalso();
    falso.crearPerfil.mockResolvedValue(PERFIL_NUEVO);
    falso.crearEscenario.mockResolvedValue(ESCENARIO_NUEVO);

    const ids = await asegurarCaso(ESCENARIO, null, { cliente });

    expect(ids).toEqual({ perfilId: PERFIL_NUEVO, escenarioId: ESCENARIO_NUEVO });
    expect(falso.crearEscenario).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: '-3D- E-01 · Duelo reciente' })
    );
    // La versión nueva se anota bajo su propia huella: la fila de la anterior no se toca.
    const [, clave, guardado] = vi.mocked(guardarCasoSincronizado).mock.calls[0]!;
    expect(clave).not.toBe(HUELLA);
    expect(clave).toBe(guardado.huella);
    expect(guardarCasoSincronizado).toHaveBeenCalledOnce();
    // Es una versión nueva, no una recreación tras un borrado.
    expect(registrarEvento).not.toHaveBeenCalled();
  });

  it('si el orquestador falla al crear, se propaga sin anotar nada', async () => {
    db.responder('escenario', { data: fila });
    const { falso, cliente } = clienteFalso();
    falso.crearEscenario.mockRejectedValue(new ErrorOrquestador('servidor', { estado: 503 }));

    await expect(asegurarCaso(ESCENARIO, null, { cliente })).rejects.toMatchObject({
      tipo: 'servidor',
    });
    expect(guardarCasoSincronizado).not.toHaveBeenCalled();
  });

  it('con `recrear` (lo borraron allá) crea los dos de nuevo, lo anota y lo registra', async () => {
    db.responder('escenario', { data: fila });
    sincronizados({ [HUELLA]: alDia });
    const { falso, cliente } = clienteFalso();
    falso.crearPerfil.mockResolvedValue(PERFIL_NUEVO);
    falso.crearEscenario.mockResolvedValue(ESCENARIO_NUEVO);

    const ids = await asegurarCaso(ESCENARIO, null, { cliente, recrear: true });

    expect(ids).toEqual({ perfilId: PERFIL_NUEVO, escenarioId: ESCENARIO_NUEVO });
    expect(guardarCasoSincronizado).toHaveBeenCalledWith(ESCENARIO, HUELLA, {
      huella: HUELLA,
      perfilId: PERFIL_NUEVO,
      escenarioId: ESCENARIO_NUEVO,
    });
    expect(log.warn).toHaveBeenCalledWith('orquestador.caso_recreado', { escenario_id: ESCENARIO });
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'caso', detalle: 'recreado' });
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
    const HUELLA_VARIANTE = huellaDeSincronizacion(
      perfilDelCaso(caso),
      escenarioDelCaso({ ...caso, prompt: PROMPT_AJUSTADO }, variante)
    );
    const varianteAlDia: CasoSincronizado = {
      huella: HUELLA_VARIANTE,
      perfilId: PERFIL,
      escenarioId: VARIANTE_ORQUESTADOR,
    };

    it('si el prompt de la práctica es el del caso, usa el escenario del caso', async () => {
      db.responder('escenario', { data: fila });
      sincronizados({ [HUELLA]: alDia });
      const { falso, cliente } = clienteFalso();

      // Los espacios de más no hacen que sea otro prompt.
      const ids = await asegurarCaso(ESCENARIO, `  ${PROMPT}\n`, { cliente });
      expect(ids.escenarioId).toBe(ESCENARIO_ORQUESTADOR);
      expect(falso.crearEscenario).not.toHaveBeenCalled();
    });

    it('si difiere, crea un escenario variante con el mismo perfil y lo recuerda', async () => {
      db.responder('escenario', { data: fila });
      sincronizados({ [HUELLA]: alDia });
      const { falso, cliente } = clienteFalso();
      falso.crearEscenario.mockResolvedValue(VARIANTE_ORQUESTADOR);

      const ids = await asegurarCaso(ESCENARIO, PROMPT_AJUSTADO, { cliente });

      expect(ids).toEqual({ perfilId: PERFIL, escenarioId: VARIANTE_ORQUESTADOR });
      const [, escenario] = falso.crearEscenario.mock.calls[0] as unknown as [
        unknown,
        { name: string; context: string },
      ];
      expect(escenario.name).toBe(`-3D- E-01 · Duelo y pérdida · ajuste ${variante.slice(0, 8)}`);
      expect(escenario.context).toBe(PROMPT_AJUSTADO);
      expect(falso.crearPerfil).not.toHaveBeenCalled();
      expect(guardarCasoSincronizado).toHaveBeenCalledWith(
        ESCENARIO,
        HUELLA_VARIANTE,
        varianteAlDia
      );
    });

    it.each([
      ['bajo su huella', HUELLA_VARIANTE],
      ['por una versión anterior, bajo la huella del prompt', variante],
    ])('otra práctica con el mismo ajuste reutiliza la variante guardada %s', async (_, clave) => {
      db.responder('escenario', { data: fila });
      sincronizados({ [HUELLA]: alDia, [clave]: varianteAlDia });
      const { falso, cliente } = clienteFalso();

      const ids = await asegurarCaso(ESCENARIO, PROMPT_AJUSTADO, { cliente });
      expect(ids.escenarioId).toBe(VARIANTE_ORQUESTADOR);
      expect(falso.crearEscenario).not.toHaveBeenCalled();
    });

    it('si la variante guardada es de otro contenido, crea una nueva y no la toca', async () => {
      db.responder('escenario', { data: fila });
      sincronizados({
        [HUELLA]: alDia,
        [variante]: { ...varianteAlDia, huella: '0000000000000000' },
      });
      const { falso, cliente } = clienteFalso();
      falso.crearEscenario.mockResolvedValue(ESCENARIO_NUEVO);

      const ids = await asegurarCaso(ESCENARIO, PROMPT_AJUSTADO, { cliente });

      expect(ids).toEqual({ perfilId: PERFIL, escenarioId: ESCENARIO_NUEVO });
      expect(guardarCasoSincronizado).toHaveBeenCalledWith(
        ESCENARIO,
        HUELLA_VARIANTE,
        expect.objectContaining({ escenarioId: ESCENARIO_NUEVO })
      );
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
    vi.mocked(leerCasoSincronizado).mockImplementation(async (id, clave) =>
      id === 'b' && clave === HUELLA ? alDia : null
    );

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
