import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '@/lib/log';
import { createAdminClient } from '@/lib/supabase/admin';

import { anotarFinPorTiempo, leerTiempoDeConsulta, terminarPorTiempo } from './consulta';
import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

const SESION = '5b1c2f0e-8f7a-4a51-9c5e-1b2f3d4e5f60';

let usuario: SupabaseFalso;
let admin: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  usuario = crearSupabaseFalso();
  admin = crearSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(admin.cliente as never);
});

describe('leerTiempoDeConsulta', () => {
  it('lee la duración y lo transcurrido de la base de datos con el cliente del usuario', async () => {
    usuario.responder('rpc:tiempo_de_consulta', {
      data: [{ duracion_s: 900, transcurrido_s: 125 }],
    });
    expect(await leerTiempoDeConsulta(usuario.cliente as never, SESION)).toEqual({
      duracionS: 900,
      transcurridoS: 125,
    });
    expect(usuario.rpc).toHaveBeenCalledWith('tiempo_de_consulta', { p_sesion_id: SESION });
  });

  it('una consulta que no ha empezado lleva `null`', async () => {
    usuario.responder('rpc:tiempo_de_consulta', {
      data: [{ duracion_s: 600, transcurrido_s: null }],
    });
    expect(await leerTiempoDeConsulta(usuario.cliente as never, SESION)).toEqual({
      duracionS: 600,
      transcurridoS: null,
    });
  });

  it('si no se puede leer (o no es suya), devuelve null y la práctica sigue', async () => {
    usuario.responder('rpc:tiempo_de_consulta', { error: { code: '42883' } });
    expect(await leerTiempoDeConsulta(usuario.cliente as never, SESION)).toBeNull();
    expect(log.error).toHaveBeenCalledWith('practica.tiempo_no_leido', {
      codigo: '42883',
      sesion_id: SESION,
    });

    usuario.responder('rpc:tiempo_de_consulta', { data: [] });
    expect(await leerTiempoDeConsulta(usuario.cliente as never, SESION)).toBeNull();
  });
});

describe('terminarPorTiempo', () => {
  it('termina la práctica en curso con el motivo neutro, con la clave secreta', async () => {
    admin.responder('sesion', { data: [{ id: SESION }] });
    expect(await terminarPorTiempo(SESION)).toBe(true);

    const [escritura] = admin.de('sesion');
    expect(escritura).toMatchObject({
      operacion: 'update',
      valores: { estado: 'finalizada', fin_motivo: 'tiempo' },
    });
    // Solo si sigue en curso: no reabre ni reetiqueta una práctica que ya terminó por otro camino.
    expect(escritura!.filtros).toEqual(
      expect.arrayContaining([
        ['eq', 'id', SESION],
        ['eq', 'estado', 'en_curso'],
      ])
    );
    expect(log.info).toHaveBeenCalledWith('practica.termino_por_tiempo', { sesion_id: SESION });
  });

  it('si ya no estaba en curso, no cambia nada', async () => {
    admin.responder('sesion', { data: [] });
    expect(await terminarPorTiempo(SESION)).toBe(false);
    expect(log.info).not.toHaveBeenCalled();
  });

  it('un fallo no lanza: la práctica sigue y la termina el navegador', async () => {
    admin.responder('sesion', { error: { code: '42501' } });
    expect(await terminarPorTiempo(SESION)).toBe(false);
    expect(log.warn).toHaveBeenCalledWith('practica.no_terminada_por_tiempo', {
      sesion_id: SESION,
    });
  });
});

describe('anotarFinPorTiempo', () => {
  const inicio = '2026-11-15T15:00:00.000Z';
  const fin = (segundos: number) => new Date(Date.parse(inicio) + segundos * 1000).toISOString();
  const practica = (cambios: Record<string, unknown> = {}) => ({
    estado: 'finalizada',
    consulta_inicio: inicio,
    fin: fin(20 * 60),
    duracion_minutos: 15,
    fin_motivo: null,
    ...cambios,
  });

  it('con las horas de la base de datos, anota el motivo neutro con la clave secreta', async () => {
    usuario.responder('sesion', { data: practica() });
    expect(await anotarFinPorTiempo(usuario.cliente as never, SESION)).toBe(true);
    const [escritura] = admin.de('sesion');
    expect(escritura).toMatchObject({ operacion: 'update', valores: { fin_motivo: 'tiempo' } });
    expect(escritura!.filtros).toEqual(
      expect.arrayContaining([
        ['eq', 'id', SESION],
        ['eq', 'estado', 'finalizada'],
      ])
    );
  });

  it('si el estudiante terminó antes del margen, no anota nada', async () => {
    usuario.responder('sesion', { data: practica({ fin: fin(16 * 60) }) });
    expect(await anotarFinPorTiempo(usuario.cliente as never, SESION)).toBe(false);
    expect(admin.de('sesion')).toHaveLength(0);
  });

  it('no toca una práctica ajena (RLS no la devuelve), abierta o ya anotada', async () => {
    usuario.responder('sesion', { data: null });
    usuario.responder('sesion', { data: practica({ estado: 'en_curso' }) });
    usuario.responder('sesion', { data: practica({ fin_motivo: 'tiempo' }) });
    for (let i = 0; i < 3; i++) {
      expect(await anotarFinPorTiempo(usuario.cliente as never, SESION)).toBe(false);
    }
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('un fallo no interrumpe el cierre: queda en el registro', async () => {
    usuario.responder('sesion', { data: practica() });
    admin.responder('sesion', { error: { code: '42703' } });
    expect(await anotarFinPorTiempo(usuario.cliente as never, SESION)).toBe(false);
    expect(log.warn).toHaveBeenCalledWith('practica.fin_por_tiempo_no_anotado', {
      sesion_id: SESION,
    });
  });
});
