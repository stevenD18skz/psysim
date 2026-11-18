import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { DURACION_ENTREGA_S } from './entrega';
import {
  abrirVentanaDeEntrega,
  cerrarVentanaDeEntrega,
  entregaVigente,
  googleDuranteLaEntrega,
  leerVentanaDeEntrega,
} from './ventana';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

const DOCENTE = 'd0c3e7e4-0000-4000-8000-000000000001';
const AHORA = Date.parse('2026-11-17T15:00:00Z');
/** El docente entregó el equipo hace una hora: a la entrega le quedan tres. */
const ENTREGADO_EN = AHORA - 60 * 60 * 1000;
const HASTA = new Date(ENTREGADO_EN + DURACION_ENTREGA_S * 1000).toISOString();
const segundos = (ms: number) => Math.floor(ms / 1000);

let db: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  db = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(db.cliente as never);
});

describe('ventana de entrega en la cuenta del docente', () => {
  it('al entregar, anota hasta cuándo la cuenta no entra con Google (una jornada)', async () => {
    const antes = Date.now();
    db.responder('usuario', { data: { id: DOCENTE } });
    expect(await abrirVentanaDeEntrega(DOCENTE)).toBe(true);

    const [escritura] = db.de('usuario');
    expect(escritura).toMatchObject({ operacion: 'update' });
    expect(escritura!.filtros).toContainEqual(['eq', 'id', DOCENTE]);
    const { entrega_hasta } = escritura!.valores as { entrega_hasta: string };
    const duracion = Date.parse(entrega_hasta) - antes;
    expect(duracion).toBeGreaterThanOrEqual(DURACION_ENTREGA_S * 1000);
    expect(duracion).toBeLessThan(DURACION_ENTREGA_S * 1000 + 5_000);
  });

  it('lee la entrega de la cuenta', async () => {
    db.responder('usuario', { data: { entrega_hasta: HASTA } });
    expect(await leerVentanaDeEntrega(DOCENTE)).toBe(HASTA);
  });

  it('una cuenta que no entregó nada, o que no existe, no tiene entrega', async () => {
    db.responder('usuario', { data: { entrega_hasta: null } }, { data: null });
    expect(await leerVentanaDeEntrega(DOCENTE)).toBeNull();
    expect(await leerVentanaDeEntrega(DOCENTE)).toBeNull();
  });

  it('al volver con la contraseña, la borra', async () => {
    await cerrarVentanaDeEntrega(DOCENTE);
    expect(db.de('usuario')[0]).toMatchObject({
      operacion: 'update',
      valores: { entrega_hasta: null },
    });
  });

  it.each(['42703', 'PGRST204'])(
    'sin la migración (%s) se permite iniciar sesión y se impide la entrega',
    async code => {
      db.responder('usuario', { error: { code } }, { error: { code } }, { error: { code } });
      await expect(abrirVentanaDeEntrega(DOCENTE)).resolves.toBe(false);
      expect(await leerVentanaDeEntrega(DOCENTE)).toBeNull();
      await expect(cerrarVentanaDeEntrega(DOCENTE)).resolves.toBeUndefined();
      expect(log.error).toHaveBeenCalledExactlyOnceWith('entrega.ventana_no_abierta', {
        codigo: code,
      });
    }
  );

  it('otro fallo tampoco lanza, pero queda en el registro', async () => {
    db.responder('usuario', { error: { code: 'XX000' } }, { error: { code: 'XX000' } });
    expect(await abrirVentanaDeEntrega(DOCENTE)).toBe(false);
    expect(await leerVentanaDeEntrega(DOCENTE)).toBeUndefined();
    expect(log.error).toHaveBeenCalledWith('entrega.ventana_no_abierta', { codigo: 'XX000' });
    expect(log.error).toHaveBeenCalledWith('entrega.ventana_no_leida', { codigo: 'XX000' });
  });

  it('si ni siquiera hay cliente de administración, no lanza', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('Falta la clave secreta.');
    });
    await expect(abrirVentanaDeEntrega(DOCENTE)).resolves.toBe(false);
    expect(await leerVentanaDeEntrega(DOCENTE)).toBeUndefined();
    await expect(cerrarVentanaDeEntrega(DOCENTE)).resolves.toBeUndefined();
  });
});

describe('entregaVigente', () => {
  it('vale hasta su hora y no después', () => {
    expect(entregaVigente(HASTA, AHORA)).toBe(true);
    expect(entregaVigente(HASTA, Date.parse(HASTA))).toBe(false);
    expect(entregaVigente(HASTA, Date.parse(HASTA) + 1)).toBe(false);
  });

  it('sin entrega, o con una fecha ilegible, no hay nada vigente', () => {
    expect(entregaVigente(null, AHORA)).toBe(false);
    expect(entregaVigente('ayer', AHORA)).toBe(false);
  });
});

describe('googleDuranteLaEntrega', () => {
  const con = (metodo: string, momentoMs: number | null) => [
    { metodo, momento: momentoMs === null ? null : segundos(momentoMs) },
  ];

  it('una sesión de Google abierta después de entregar el equipo no vale', () => {
    expect(googleDuranteLaEntrega(HASTA, con('oauth', ENTREGADO_EN + 60_000), AHORA)).toBe(true);
    expect(googleDuranteLaEntrega(HASTA, con('oauth', AHORA), AHORA)).toBe(true);
    const hastaConMilisegundos = new Date(Date.parse(HASTA) + 100).toISOString();
    expect(
      googleDuranteLaEntrega(hastaConMilisegundos, con('oauth', ENTREGADO_EN + 500), AHORA)
    ).toBe(true);
  });

  it('una sesión de Google anterior a la entrega sigue valiendo', () => {
    expect(googleDuranteLaEntrega(HASTA, con('oauth', ENTREGADO_EN - 60_000), AHORA)).toBe(false);
  });

  it('una sesión con contraseña vale siempre: es como el docente recupera su cuenta', () => {
    expect(googleDuranteLaEntrega(HASTA, con('password', AHORA), AHORA)).toBe(false);
  });

  it('si el token no dice cuándo se usó Google, se toma como posterior', () => {
    expect(googleDuranteLaEntrega(HASTA, con('oauth', null), AHORA)).toBe(true);
  });

  it('sin entrega vigente, Google entra como siempre', () => {
    expect(googleDuranteLaEntrega(null, con('oauth', AHORA), AHORA)).toBe(false);
    expect(googleDuranteLaEntrega(HASTA, con('oauth', AHORA), Date.parse(HASTA) + 1)).toBe(false);
  });
});
