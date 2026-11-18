import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { CUPO_POR_MINUTO } from './cuentas';
import {
  asignarCuenta,
  fijarGemini,
  guardarCasoSincronizado,
  leerCasoSincronizado,
  leerSesionIa,
  leerTurno,
  marcarCerradaEnOrquestador,
  registrarEvento,
  reservarTurno,
  soltarTurno,
  tomarTurno,
} from './datos';
import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

const SESION = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';
const ESCENARIO = '0f8fad5b-d9cb-469f-a165-70867728950e';
const CUENTA = '00000000000000aa';

let db: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  db = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(db.cliente as never);
});

describe('leerSesionIa', () => {
  it('traduce la fila: proveedor, cuenta, sesión, severidad y cierre', async () => {
    db.responder('sesion_ia', {
      data: {
        proveedor: 'orquestador',
        cuenta: CUENTA,
        sesion_orquestador: 'abc',
        severidad: 3.5,
        cierre_motivo: 'crisis',
        cerrada_en_orquestador: '2026-11-11T15:00:00Z',
      },
    });
    expect(await leerSesionIa(SESION)).toEqual({
      proveedor: 'orquestador',
      cuenta: CUENTA,
      sesionOrquestador: 'abc',
      severidad: 3.5,
      cierreMotivo: 'crisis',
      cerradaEnOrquestador: true,
    });
  });

  it('una práctica sin fila todavía devuelve null; un motivo desconocido se ignora', async () => {
    expect(await leerSesionIa(SESION)).toBeNull();

    db.responder('sesion_ia', {
      data: {
        proveedor: 'gemini',
        cuenta: null,
        sesion_orquestador: null,
        severidad: null,
        cierre_motivo: 'otro',
        cerrada_en_orquestador: null,
      },
    });
    expect(await leerSesionIa(SESION)).toMatchObject({
      proveedor: 'gemini',
      cierreMotivo: null,
      cerradaEnOrquestador: false,
    });
  });

  it('si la base falla, lanza', async () => {
    db.responder('sesion_ia', { error: { code: 'XX000' } });
    await expect(leerSesionIa(SESION)).rejects.toThrow(/No pudimos leer el proveedor/);
  });
});

describe('asignarCuenta', () => {
  it('devuelve la cuenta que eligió la base de datos', async () => {
    db.responder('rpc:asignar_cuenta_orquestador', {
      data: {
        cuenta_asignada: CUENTA,
        proveedor_fijado: 'orquestador',
        sin_cupo: false,
        practicas_en_curso: 2,
      },
    });

    expect(await asignarCuenta(SESION, [CUENTA])).toEqual({
      lleno: false,
      sesion: { proveedor: 'orquestador', cuenta: CUENTA },
    });
    expect(db.rpc).toHaveBeenCalledWith('asignar_cuenta_orquestador', {
      p_sesion_id: SESION,
      p_cuentas: [CUENTA],
    });
  });

  it('con el tope lleno dice cuántas prácticas hay en curso', async () => {
    db.responder('rpc:asignar_cuenta_orquestador', {
      data: {
        cuenta_asignada: null,
        proveedor_fijado: 'orquestador',
        sin_cupo: true,
        practicas_en_curso: 6,
      },
    });
    expect(await asignarCuenta(SESION, [CUENTA])).toEqual({ lleno: true, enCurso: 6 });
  });

  it('si la función falla, lanza', async () => {
    db.responder('rpc:asignar_cuenta_orquestador', { error: { code: '22023' } });
    await expect(asignarCuenta(SESION, [])).rejects.toThrow(/No pudimos asignar/);
  });
});

describe('reservarTurno', () => {
  it('reserva con el cupo de PsySim (uno menos que el límite del orquestador)', async () => {
    db.responder('rpc:reservar_turno_orquestador', { data: 0 });
    expect(await reservarTurno(CUENTA)).toBe(0);
    expect(db.rpc).toHaveBeenCalledWith('reservar_turno_orquestador', {
      p_cuenta: CUENTA,
      p_cupo: CUPO_POR_MINUTO,
    });
    expect(CUPO_POR_MINUTO).toBe(9);
  });

  it('sin cupo devuelve los milisegundos que faltan', async () => {
    db.responder('rpc:reservar_turno_orquestador', { data: 12_400 });
    expect(await reservarTurno(CUENTA)).toBe(12_400);
  });

  it('si el conteo falla deja pasar: el 429 del orquestador es la red de seguridad', async () => {
    db.responder('rpc:reservar_turno_orquestador', { error: { code: 'XX000' } });
    expect(await reservarTurno(CUENTA)).toBe(0);
    expect(log.error).toHaveBeenCalledWith('orquestador.turno_no_reservado', { codigo: 'XX000' });
  });
});

describe('turno de la práctica (turno_ia)', () => {
  const TURNO = '0d8f2f6e-3c1b-4a7e-9b1a-2f6c1d3e4a5b';
  const MARCA = '6f1e2d3c-4b5a-4c6d-8e7f-0a1b2c3d4e5f';

  it('lee el identificador y el estado del último turno', async () => {
    db.responder('turno_ia', { data: { turno_id: TURNO, estado: 'guardado' } });
    expect(await leerTurno(SESION)).toEqual({ turnoId: TURNO, estado: 'guardado' });
    expect(db.de('turno_ia')[0]!.filtros).toContainEqual(['eq', 'sesion_id', SESION]);
  });

  it('una práctica sin turnos devuelve null', async () => {
    db.responder('turno_ia', { data: null });
    expect(await leerTurno(SESION)).toBeNull();
  });

  it.each(['42P01', 'PGRST205'])(
    'si la tabla aún no existe (%s) devuelve null sin alarmar',
    async code => {
      db.responder('turno_ia', { error: { code } });
      expect(await leerTurno(SESION)).toBeNull();
      expect(log.error).not.toHaveBeenCalled();
    }
  );

  it('otro fallo de lectura también deja seguir, pero queda en el registro', async () => {
    db.responder('turno_ia', { error: { code: 'XX000' } });
    expect(await leerTurno(SESION)).toBeNull();
    expect(log.error).toHaveBeenCalledWith('npc_chat.turno_no_leido', {
      codigo: 'XX000',
      sesion_id: SESION,
    });
  });

  it.each(['libre', 'pendiente'] as const)('toma el turno (%s) y devuelve la marca', async r => {
    db.responder('rpc:tomar_turno_ia', { data: { resultado: r, marca: MARCA } });
    expect(await tomarTurno(SESION, TURNO)).toEqual({ resultado: r, marca: MARCA });
    expect(db.rpc).toHaveBeenCalledWith('tomar_turno_ia', {
      p_sesion_id: SESION,
      p_turno_id: TURNO,
    });
  });

  it('sin identificador del navegador no envía el parámetro', async () => {
    db.responder('rpc:tomar_turno_ia', { data: { resultado: 'libre', marca: MARCA } });
    await tomarTurno(SESION, null);
    expect(db.rpc).toHaveBeenCalledWith('tomar_turno_ia', { p_sesion_id: SESION });
  });

  it('si otra petición lo tiene, dice que está ocupado', async () => {
    db.responder('rpc:tomar_turno_ia', { data: { resultado: 'ocupado', marca: null } });
    expect(await tomarTurno(SESION, TURNO)).toEqual({ resultado: 'ocupado' });
  });

  it.each(['PGRST202', '42883'])(
    'si la función aún no existe (%s), la práctica sigue sin marca',
    async code => {
      db.responder('rpc:tomar_turno_ia', { error: { code } });
      expect(await tomarTurno(SESION, TURNO)).toEqual({ resultado: 'libre', marca: null });
      expect(log.error).not.toHaveBeenCalled();
    }
  );

  it('si la función falla, la práctica sigue sin marca y queda en el registro', async () => {
    db.responder('rpc:tomar_turno_ia', { error: { code: 'XX000' } });
    expect(await tomarTurno(SESION, TURNO)).toEqual({ resultado: 'libre', marca: null });
    expect(log.error).toHaveBeenCalledWith('npc_chat.turno_no_tomado', {
      codigo: 'XX000',
      sesion_id: SESION,
    });
  });

  it('suelta solo el turno que tomó esta petición y que sigue en curso', async () => {
    await soltarTurno(SESION, MARCA);
    const [escritura] = db.de('turno_ia');
    expect(escritura).toMatchObject({ operacion: 'update', valores: { estado: 'sin_guardar' } });
    expect(escritura!.filtros).toEqual([
      ['eq', 'sesion_id', SESION],
      ['eq', 'marca', MARCA],
      ['eq', 'estado', 'en_curso'],
    ]);
  });

  it('si no puede soltarlo no lanza: el turno caduca solo', async () => {
    db.responder('turno_ia', { error: { code: 'XX000' } });
    await expect(soltarTurno(SESION, MARCA)).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith('npc_chat.turno_no_soltado', {
      codigo: 'XX000',
      sesion_id: SESION,
    });
  });
});

describe('fijarGemini', () => {
  it('pasa a Gemini una práctica del orquestador y registra el cambio', async () => {
    db.responder('sesion_ia', { data: [{ sesion_id: SESION }] });
    await fijarGemini(SESION, 'red');

    const [cambio, ...resto] = db.de('sesion_ia');
    expect(cambio).toMatchObject({
      operacion: 'update',
      valores: { proveedor: 'gemini', cambio_motivo: 'red', cambio_en: expect.any(String) },
    });
    expect(cambio!.filtros).toEqual(
      expect.arrayContaining([
        ['eq', 'sesion_id', SESION],
        ['eq', 'proveedor', 'orquestador'],
      ])
    );
    expect(resto).toEqual([]);
    expect(db.de('orquestador_evento')[0]).toMatchObject({
      operacion: 'insert',
      valores: { tipo: 'respaldo', detalle: 'red', sesion_id: SESION },
    });
  });

  it('si la práctica no tenía fila, la crea sin pisar una que ya exista', async () => {
    db.responder('sesion_ia', { data: [] });
    await fijarGemini(SESION, 'historial_previo');

    expect(db.de('sesion_ia')[1]).toMatchObject({
      operacion: 'upsert',
      valores: { sesion_id: SESION, proveedor: 'gemini', cambio_motivo: 'historial_previo' },
    });
  });

  it('si la base falla, lanza (quien llama responde con Gemini igual)', async () => {
    db.responder('sesion_ia', { error: { code: 'XX000' } });
    await expect(fijarGemini(SESION, 'red')).rejects.toThrow(/No pudimos fijar/);
  });
});

describe('registrarEvento', () => {
  it('guarda el tipo, un código corto y la espera redondeada', async () => {
    await registrarEvento({
      tipo: 'espera',
      detalle: 'turnero',
      sesionId: SESION,
      cuenta: CUENTA,
      esperaMs: 7_300.6,
    });
    expect(db.de('orquestador_evento')[0]).toMatchObject({
      operacion: 'insert',
      valores: {
        tipo: 'espera',
        detalle: 'turnero',
        sesion_id: SESION,
        cuenta: CUENTA,
        espera_ms: 7_301,
      },
    });
  });

  it('si no se puede registrar, la práctica sigue', async () => {
    db.responder('orquestador_evento', { error: { code: '23514' } });
    await expect(registrarEvento({ tipo: 'error', detalle: 'red' })).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith('orquestador.evento_no_registrado', { codigo: '23514' });
  });
});

describe('casos sincronizados y cierre', () => {
  it('lee los id del orquestador de un caso o de una de sus variantes', async () => {
    db.responder('orquestador_caso', {
      data: { huella: 'aaaa', perfil_id: 'p', escenario_orquestador_id: 'e' },
    });
    expect(await leerCasoSincronizado(ESCENARIO, '')).toEqual({
      huella: 'aaaa',
      perfilId: 'p',
      escenarioId: 'e',
    });
    expect(db.de('orquestador_caso')[0]!.filtros).toEqual([
      ['eq', 'escenario_id', ESCENARIO],
      ['eq', 'variante', ''],
    ]);
    expect(await leerCasoSincronizado(ESCENARIO, 'bbbb')).toBeNull();
  });

  it('guarda la sincronización por caso y variante', async () => {
    await guardarCasoSincronizado(ESCENARIO, 'bbbb', {
      huella: 'aaaa',
      perfilId: 'p',
      escenarioId: 'e',
    });
    expect(db.de('orquestador_caso')[0]).toMatchObject({
      operacion: 'upsert',
      valores: {
        escenario_id: ESCENARIO,
        variante: 'bbbb',
        huella: 'aaaa',
        perfil_id: 'p',
        escenario_orquestador_id: 'e',
      },
    });

    db.responder('orquestador_caso', { error: { code: 'XX000' } });
    await expect(
      guardarCasoSincronizado(ESCENARIO, '', { huella: 'a', perfilId: 'p', escenarioId: 'e' })
    ).rejects.toThrow(/No pudimos guardar la sincronización/);
  });

  it('anota que la sesión ya se cerró en el orquestador', async () => {
    await marcarCerradaEnOrquestador(SESION);
    expect(db.de('sesion_ia')[0]).toMatchObject({
      operacion: 'update',
      valores: { cerrada_en_orquestador: expect.any(String) },
    });

    db.responder('sesion_ia', { error: { code: 'XX000' } });
    await marcarCerradaEnOrquestador(SESION);
    expect(log.warn).toHaveBeenCalledWith('orquestador.cierre_no_anotado', { codigo: 'XX000' });
  });
});
