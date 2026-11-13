import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrquestadorEnv, type OrquestadorEnv } from '@/lib/env/orquestador';
import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';
import { type ClienteOrquestador, clienteOrquestador } from './cliente';
import { claveDeCuenta } from './cuentas';
import {
  asignarCuenta,
  fijarGemini,
  leerSesionIa,
  marcarCerradaEnOrquestador,
  type SesionIa,
} from './datos';
import { ErrorOrquestador } from './errores';
import {
  cerrarEnOrquestador,
  cerrarPendientes,
  olvidarSesionOrquestador,
  prepararPractica,
  reservarCuentaAlComenzar,
} from './practica';
import { asegurarCaso } from './sincronizar';
import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/env/orquestador', () => ({ getOrquestadorEnv: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('./cliente', () => ({ clienteOrquestador: vi.fn() }));
vi.mock('./sincronizar', () => ({ asegurarCaso: vi.fn() }));
vi.mock('./datos', () => ({
  asignarCuenta: vi.fn(),
  fijarGemini: vi.fn(),
  leerSesionIa: vi.fn(),
  marcarCerradaEnOrquestador: vi.fn(),
}));

const SESION = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';
const ESCENARIO = '0f8fad5b-d9cb-469f-a165-70867728950e';
const PERFIL = '11111111-1111-4111-8111-111111111111';
const ESCENARIO_ORQUESTADOR = '22222222-2222-4222-8222-222222222222';
const SESION_ORQUESTADOR = '33333333-3333-4333-8333-333333333333';
const PROMPT = 'Eres Marta Lucía, 58 años.';

const DOCENTE = { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta-1' };
const GRUPO_1 = { correo: 'grupo1@psysim.test', contrasena: 'secreta-2' };
const GRUPO_2 = { correo: 'grupo2@psysim.test', contrasena: 'secreta-3' };
const CLAVE_DOCENTE = claveDeCuenta(DOCENTE.correo);
const CLAVE_1 = claveDeCuenta(GRUPO_1.correo);
const CLAVE_2 = claveDeCuenta(GRUPO_2.correo);

const UNA_CUENTA: OrquestadorEnv = { url: 'https://orquestador.test', docente: DOCENTE, grupo: [] };
const CON_GRUPO: OrquestadorEnv = { ...UNA_CUENTA, grupo: [GRUPO_1, GRUPO_2] };

const sesionIa = (extra: Partial<SesionIa> = {}): SesionIa => ({
  proveedor: 'orquestador',
  cuenta: CLAVE_DOCENTE,
  sesionOrquestador: SESION_ORQUESTADOR,
  severidad: 3,
  cierreMotivo: null,
  cerradaEnOrquestador: false,
  ...extra,
});

function clienteFalso() {
  const falso = {
    yo: vi.fn(async (cuenta: { correo: string }) => ({
      id: `44444444-4444-4444-8444-${cuenta.correo === GRUPO_1.correo ? '000000000001' : '000000000002'}`,
      email: cuenta.correo,
      role: 'student' as const,
    })),
    abrirSesion: vi.fn(async () => ({
      id: SESION_ORQUESTADOR,
      status: 'active',
      current_severity: 2,
    })),
    cerrarSesion: vi.fn(async () => undefined),
    reportarTiempo: vi.fn(async () => undefined),
  };
  return { falso, cliente: falso as unknown as ClienteOrquestador };
}

let db: SupabaseFalso;

const practica = (cliente: ClienteOrquestador, extra: object = {}) => ({
  sesionId: SESION,
  escenarioId: ESCENARIO,
  prompt: PROMPT,
  hayHistorial: false,
  cliente,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  db = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(db.cliente as never);
  vi.mocked(getOrquestadorEnv).mockReturnValue(UNA_CUENTA);
  vi.mocked(leerSesionIa).mockResolvedValue(null);
  vi.mocked(fijarGemini).mockResolvedValue(undefined);
  vi.mocked(marcarCerradaEnOrquestador).mockResolvedValue(undefined);
  vi.mocked(asegurarCaso).mockResolvedValue({
    perfilId: PERFIL,
    escenarioId: ESCENARIO_ORQUESTADOR,
  });
  vi.mocked(asignarCuenta).mockResolvedValue({
    lleno: false,
    sesion: { proveedor: 'orquestador', cuenta: CLAVE_DOCENTE },
  });
});

describe('prepararPractica', () => {
  it('si la práctica ya tiene su sesión allá, la devuelve sin llamar al orquestador', async () => {
    const { falso, cliente } = clienteFalso();
    const preparada = await prepararPractica(practica(cliente, { sesionIa: sesionIa() }));

    expect(preparada).toMatchObject({
      estado: 'lista',
      sesionOrquestador: SESION_ORQUESTADOR,
      severidad: 3,
      cuenta: { clave: CLAVE_DOCENTE, esDocente: true },
    });
    expect(falso.abrirSesion).not.toHaveBeenCalled();
    expect(asignarCuenta).not.toHaveBeenCalled();
    expect(leerSesionIa).not.toHaveBeenCalled();
  });

  it('sin la fila en la petición, la lee', async () => {
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa());
    const { cliente } = clienteFalso();
    expect(await prepararPractica(practica(cliente))).toMatchObject({ estado: 'lista' });
    expect(leerSesionIa).toHaveBeenCalledWith(SESION);
  });

  it('una práctica de Gemini se queda en Gemini', async () => {
    const { cliente } = clienteFalso();
    const preparada = await prepararPractica(
      practica(cliente, { sesionIa: sesionIa({ proveedor: 'gemini' }) })
    );
    expect(preparada).toEqual({ estado: 'gemini' });
  });

  it('modo de una sola cuenta: la cuenta teacher abre la sesión y conversa en ella', async () => {
    db.responder('sesion_ia', { data: [{ sesion_id: SESION }] });
    const { falso, cliente } = clienteFalso();
    const preparada = await prepararPractica(practica(cliente, { sesionIa: null }));

    expect(asignarCuenta).toHaveBeenCalledWith(SESION, [CLAVE_DOCENTE]);
    expect(asegurarCaso).toHaveBeenCalledWith(ESCENARIO, PROMPT, { cliente });
    // Sin `user_id`: la sesión es de quien la crea.
    expect(falso.abrirSesion).toHaveBeenCalledWith(expect.objectContaining(DOCENTE), {
      perfilId: PERFIL,
      escenarioId: ESCENARIO_ORQUESTADOR,
      usuarioId: undefined,
    });
    expect(falso.yo).not.toHaveBeenCalled();
    expect(preparada).toMatchObject({
      estado: 'lista',
      sesionOrquestador: SESION_ORQUESTADOR,
      severidad: 2,
      cuenta: { esDocente: true },
    });
    // Anota la sesión solo si nadie la anotó antes.
    const [anotacion] = db.de('sesion_ia');
    expect(anotacion).toMatchObject({
      operacion: 'update',
      valores: { sesion_orquestador: SESION_ORQUESTADOR, severidad: 2 },
    });
    expect(anotacion!.filtros).toEqual(
      expect.arrayContaining([
        ['eq', 'sesion_id', SESION],
        ['is', 'sesion_orquestador', null],
      ])
    );
  });

  it('con grupo: la cuenta teacher crea la sesión a nombre de la cuenta asignada', async () => {
    vi.mocked(getOrquestadorEnv).mockReturnValue(CON_GRUPO);
    vi.mocked(asignarCuenta).mockResolvedValue({
      lleno: false,
      sesion: { proveedor: 'orquestador', cuenta: CLAVE_2 },
    });
    db.responder('sesion_ia', { data: [{ sesion_id: SESION }] }, { data: [{ sesion_id: SESION }] });
    const { falso, cliente } = clienteFalso();
    const preparada = await prepararPractica(practica(cliente, { sesionIa: null }));

    expect(asignarCuenta).toHaveBeenCalledWith(SESION, [CLAVE_1, CLAVE_2]);
    expect(falso.yo).toHaveBeenCalledWith(expect.objectContaining(GRUPO_2));
    expect(falso.abrirSesion).toHaveBeenCalledWith(
      expect.objectContaining(DOCENTE),
      expect.objectContaining({ usuarioId: '44444444-4444-4444-8444-000000000002' })
    );
    expect(preparada).toMatchObject({ cuenta: { clave: CLAVE_2, esDocente: false } });

    // El id de usuario de la cuenta no cambia: se pregunta una vez por proceso.
    await prepararPractica(practica(cliente, { sesionIa: null }));
    expect(falso.yo).toHaveBeenCalledOnce();
  });

  it('una práctica con cuenta fijada al comenzar no pide otra', async () => {
    db.responder('sesion_ia', { data: [{ sesion_id: SESION }] });
    const { falso, cliente } = clienteFalso();
    await prepararPractica(
      practica(cliente, { sesionIa: sesionIa({ sesionOrquestador: null, severidad: null }) })
    );
    expect(asignarCuenta).not.toHaveBeenCalled();
    expect(falso.abrirSesion).toHaveBeenCalledOnce();
  });

  it('con el tope lleno no abre nada y dice cuántas prácticas hay en curso', async () => {
    vi.mocked(asignarCuenta).mockResolvedValue({ lleno: true, enCurso: 6 });
    const { falso, cliente } = clienteFalso();
    expect(await prepararPractica(practica(cliente, { sesionIa: null }))).toEqual({
      estado: 'sin_cupo',
      enCurso: 6,
    });
    expect(falso.abrirSesion).not.toHaveBeenCalled();
  });

  it.each([
    [null, 'historial_previo'],
    [sesionIa({ sesionOrquestador: null }), 'sesion_incompleta'],
  ])(
    'con conversación ya guardada no abre una sesión nueva: el orquestador no tendría el historial',
    async (fila, motivo) => {
      const { falso, cliente } = clienteFalso();
      const preparada = await prepararPractica(
        practica(cliente, { sesionIa: fila, hayHistorial: true })
      );
      expect(preparada).toEqual({ estado: 'gemini' });
      expect(fijarGemini).toHaveBeenCalledWith(SESION, motivo);
      expect(falso.abrirSesion).not.toHaveBeenCalled();
    }
  );

  it('si la cuenta de la práctica ya no está configurada, pasa a Gemini', async () => {
    const { cliente } = clienteFalso();
    const preparada = await prepararPractica(
      practica(cliente, { sesionIa: sesionIa({ cuenta: CLAVE_1, sesionOrquestador: null }) })
    );
    expect(preparada).toEqual({ estado: 'gemini' });
    expect(fijarGemini).toHaveBeenCalledWith(SESION, 'cuenta_retirada');
  });

  it('si otra petición ya la había fijado a Gemini, respeta esa decisión', async () => {
    vi.mocked(asignarCuenta).mockResolvedValue({
      lleno: false,
      sesion: { proveedor: 'gemini', cuenta: null },
    });
    const { cliente } = clienteFalso();
    expect(await prepararPractica(practica(cliente, { sesionIa: null }))).toEqual({
      estado: 'gemini',
    });
  });

  it('404 al abrir la sesión: recrea el perfil y el escenario y lo intenta otra vez', async () => {
    db.responder('sesion_ia', { data: [{ sesion_id: SESION }] });
    const { falso, cliente } = clienteFalso();
    falso.abrirSesion.mockRejectedValueOnce(new ErrorOrquestador('no_encontrado', { estado: 404 }));

    const preparada = await prepararPractica(practica(cliente, { sesionIa: null }));

    expect(preparada).toMatchObject({ estado: 'lista' });
    expect(asegurarCaso).toHaveBeenNthCalledWith(2, ESCENARIO, PROMPT, { cliente, recrear: true });
    expect(falso.abrirSesion).toHaveBeenCalledTimes(2);
  });

  it('otros fallos del orquestador se propagan: quien llama decide si responde Gemini', async () => {
    const { falso, cliente } = clienteFalso();
    falso.abrirSesion.mockRejectedValue(new ErrorOrquestador('servidor', { estado: 503 }));
    await expect(prepararPractica(practica(cliente, { sesionIa: null }))).rejects.toMatchObject({
      tipo: 'servidor',
    });
  });

  it('dos peticiones a la vez: la que pierde cierra su sesión de más y usa la ganadora', async () => {
    const GANADORA = '55555555-5555-4555-8555-555555555555';
    db.responder('sesion_ia', { data: [] });
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa({ sesionOrquestador: GANADORA }));
    const { falso, cliente } = clienteFalso();

    const preparada = await prepararPractica(practica(cliente, { sesionIa: null }));

    expect(falso.cerrarSesion).toHaveBeenCalledWith(
      expect.objectContaining(DOCENTE),
      SESION_ORQUESTADOR,
      'success'
    );
    expect(preparada).toMatchObject({ estado: 'lista', sesionOrquestador: GANADORA });
  });

  it('si no puede anotar la sesión, falla (no conversa en una sesión que PsySim no recuerda)', async () => {
    db.responder('sesion_ia', { error: { code: 'XX000' } });
    const { cliente } = clienteFalso();
    await expect(prepararPractica(practica(cliente, { sesionIa: null }))).rejects.toThrow(
      /No pudimos guardar/
    );
  });
});

describe('reservarCuentaAlComenzar', () => {
  it('fija la cuenta de la práctica y deja comenzar', async () => {
    expect(await reservarCuentaAlComenzar(SESION)).toEqual({ lleno: false });
    expect(asignarCuenta).toHaveBeenCalledWith(SESION, [CLAVE_DOCENTE]);
  });

  it('con el tope lleno, avisa cuántas prácticas hay en curso', async () => {
    vi.mocked(asignarCuenta).mockResolvedValue({ lleno: true, enCurso: 4 });
    expect(await reservarCuentaAlComenzar(SESION)).toEqual({ lleno: true, enCurso: 4 });
  });

  it('si algo falla deja comenzar: la ruta del chat lo vuelve a intentar', async () => {
    vi.mocked(asignarCuenta).mockRejectedValue(new Error('base caída'));
    expect(await reservarCuentaAlComenzar(SESION)).toEqual({ lleno: false });
    expect(log.warn).toHaveBeenCalledWith('orquestador.cuenta_no_reservada', expect.any(Object));
  });
});

describe('olvidarSesionOrquestador', () => {
  it('borra la sesión del orquestador de la práctica para poder abrir otra', async () => {
    await olvidarSesionOrquestador(SESION);
    expect(db.de('sesion_ia')[0]).toMatchObject({
      operacion: 'update',
      valores: { sesion_orquestador: null, severidad: null },
    });
  });

  it('si la base falla, lanza', async () => {
    db.responder('sesion_ia', { error: { code: 'XX000' } });
    await expect(olvidarSesionOrquestador(SESION)).rejects.toThrow(/No pudimos reiniciar/);
  });
});

describe('cerrarEnOrquestador', () => {
  const terminada = {
    estado: 'finalizada',
    comenzada: true,
    inicio: '2026-11-11T15:00:00.000Z',
    fin: '2026-11-11T15:12:34.000Z',
  };

  it('reporta la duración que calculó PsySim y cierra la sesión', async () => {
    vi.mocked(getOrquestadorEnv).mockReturnValue(CON_GRUPO);
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa({ cuenta: CLAVE_1 }));
    db.responder('sesion', { data: terminada });
    const { falso, cliente } = clienteFalso();

    expect(await cerrarEnOrquestador(SESION, cliente)).toBe(true);

    // El tiempo lo reporta la cuenta dueña; el cierre, la cuenta teacher que la asignó.
    expect(falso.reportarTiempo).toHaveBeenCalledWith(
      expect.objectContaining(GRUPO_1),
      SESION_ORQUESTADOR,
      754
    );
    expect(falso.cerrarSesion).toHaveBeenCalledWith(
      expect.objectContaining(DOCENTE),
      SESION_ORQUESTADOR,
      'success'
    );
    expect(marcarCerradaEnOrquestador).toHaveBeenCalledWith(SESION);
  });

  it.each([
    ['crisis', 'crisis'],
    ['inapropiada', 'inappropriate'],
  ] as const)('un cierre automático por %s se cierra allá como %s', async (motivo, cierre) => {
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa({ cierreMotivo: motivo }));
    db.responder('sesion', { data: terminada });
    const { falso, cliente } = clienteFalso();

    await cerrarEnOrquestador(SESION, cliente);
    expect(falso.cerrarSesion).toHaveBeenCalledWith(expect.anything(), SESION_ORQUESTADOR, cierre);
  });

  it('una práctica que nunca comenzó se cierra sin reportar tiempo', async () => {
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa());
    db.responder('sesion', { data: { ...terminada, estado: 'interrumpida', comenzada: false } });
    const { falso, cliente } = clienteFalso();

    expect(await cerrarEnOrquestador(SESION, cliente)).toBe(true);
    expect(falso.reportarTiempo).not.toHaveBeenCalled();
    expect(falso.cerrarSesion).toHaveBeenCalled();
  });

  it.each([
    ['la práctica sigue en curso', { ...terminada, estado: 'en_curso' }, sesionIa()],
    ['la práctica no existe', null, sesionIa()],
    ['la práctica nunca tuvo sesión allá (era de Gemini)', terminada, null],
    ['ya se había cerrado allá', terminada, sesionIa({ cerradaEnOrquestador: true })],
  ])('no hace nada si %s', async (_, sesion, fila) => {
    vi.mocked(leerSesionIa).mockResolvedValue(fila);
    db.responder('sesion', { data: sesion });
    const { falso, cliente } = clienteFalso();

    expect(await cerrarEnOrquestador(SESION, cliente)).toBe(false);
    expect(falso.cerrarSesion).not.toHaveBeenCalled();
    expect(marcarCerradaEnOrquestador).not.toHaveBeenCalled();
  });

  it('si la sesión ya no existe allá (404), no queda nada por cerrar', async () => {
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa());
    db.responder('sesion', { data: terminada });
    const { falso, cliente } = clienteFalso();
    falso.reportarTiempo.mockRejectedValue(new ErrorOrquestador('no_encontrado', { estado: 404 }));

    expect(await cerrarEnOrquestador(SESION, cliente)).toBe(true);
    expect(marcarCerradaEnOrquestador).toHaveBeenCalledWith(SESION);
  });

  it('si el orquestador falla, no lanza: queda pendiente y se registra', async () => {
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa());
    db.responder('sesion', { data: terminada });
    const { falso, cliente } = clienteFalso();
    falso.cerrarSesion.mockRejectedValue(new ErrorOrquestador('red'));

    expect(await cerrarEnOrquestador(SESION, cliente)).toBe(false);
    expect(marcarCerradaEnOrquestador).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith('orquestador.sesion_no_cerrada', {
      sesion_id: SESION,
      tipo: 'red',
    });
  });

  it('si no puede leer la práctica, tampoco lanza', async () => {
    db.responder('sesion', { error: { code: 'XX000' } });
    const { cliente } = clienteFalso();
    expect(await cerrarEnOrquestador(SESION, cliente)).toBe(false);
  });
});

describe('cerrarPendientes', () => {
  it('cierra allá las prácticas que PsySim terminó por otro camino', async () => {
    const OTRA = '66666666-6666-4666-8666-666666666666';
    const { falso, cliente } = clienteFalso();
    vi.mocked(clienteOrquestador).mockReturnValue(cliente);
    vi.mocked(leerSesionIa).mockResolvedValue(sesionIa());
    db.responder('sesion_ia', { data: [{ sesion_id: SESION }, { sesion_id: OTRA }] });
    db.responder(
      'sesion',
      {
        data: {
          estado: 'interrumpida',
          comenzada: true,
          inicio: '2026-11-11T15:00:00Z',
          fin: '2026-11-11T15:05:00Z',
        },
      },
      // La segunda volvió a estar en curso entre la lectura y el cierre: no se toca.
      { data: { estado: 'en_curso', comenzada: true, inicio: '2026-11-11T15:00:00Z', fin: null } }
    );

    expect(await cerrarPendientes()).toBe(1);
    expect(falso.cerrarSesion).toHaveBeenCalledOnce();
    const [consulta] = db.de('sesion_ia');
    expect(consulta!.filtros).toEqual(
      expect.arrayContaining([
        ['is', 'cerrada_en_orquestador', null],
        ['neq', 'sesion.estado', 'en_curso'],
        ['limit', 5],
      ])
    );
  });

  it('si no puede leer las pendientes, no lanza', async () => {
    db.responder('sesion_ia', { error: { code: 'XX000' } });
    expect(await cerrarPendientes()).toBe(0);
    expect(log.warn).toHaveBeenCalledWith('orquestador.pendientes_no_cerradas', {});
  });
});
