import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrquestadorEnv, getProveedorIa } from '@/lib/env/orquestador';
import { claveDeCuenta } from '@/lib/orquestador/cuentas';
import { createClient } from '@/lib/supabase/server';

import { crearSupabaseFalso, type SupabaseFalso } from '../../../test/supabase-falso';

import { ETIQUETA_CAMBIO, leerConfiguracionIa, obtenerMetricasIa } from './ia';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/env/orquestador', () => ({ getProveedorIa: vi.fn(), getOrquestadorEnv: vi.fn() }));

const DOCENTE = { correo: 'docente@correounivalle.edu.co', contrasena: 'secreta-1' };
const GRUPO = [
  { correo: 'grupo1@psysim.test', contrasena: 'secreta-2' },
  { correo: 'grupo2@psysim.test', contrasena: 'secreta-3' },
];

/** Lo que devuelve `admin_metricas_ia` (JSON calculado por la base de datos). */
const metricas = {
  desde: '2026-11-04T15:00:00+00:00',
  tope_practicas_por_cuenta: null,
  proveedores: [
    {
      proveedor: 'orquestador',
      turnos: 120,
      latencia_media_ms: 5400,
      latencia_p95_ms: 11200,
      tokens_entrada: 96000,
      tokens_salida: 4800,
      severidad_media: 2.85,
      emociones_deducidas: 7,
    },
    {
      proveedor: 'gemini',
      turnos: 9,
      latencia_media_ms: 1800,
      latencia_p95_ms: 2600,
      tokens_entrada: 7000,
      tokens_salida: 300,
      severidad_media: null,
      emociones_deducidas: 0,
    },
  ],
  practicas: {
    total: 14,
    en_orquestador: 12,
    pasaron_a_gemini: 2,
    cierres_por_crisis: 1,
    cierres_por_conducta: 0,
  },
  turnos_de_respaldo: 9,
  cambios: [{ motivo: 'red', practicas: 2 }],
  eventos: [
    {
      tipo: 'espera',
      detalle: 'turnero',
      veces: 18,
      espera_media_ms: 4200,
      espera_maxima_ms: 19000,
    },
    { tipo: 'error', detalle: 'red', veces: 3, espera_media_ms: null, espera_maxima_ms: null },
  ],
  cuentas: [
    { cuenta: claveDeCuenta(DOCENTE.correo), practicas: 12, activas: 3, turnos_ultimo_minuto: 8 },
  ],
};

let db: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  db = crearSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(db.cliente as never);
  vi.mocked(getProveedorIa).mockReturnValue('orquestador');
  vi.mocked(getOrquestadorEnv).mockReturnValue({
    url: 'https://orquestador.test',
    docente: DOCENTE,
    grupo: [],
  });
});

describe('obtenerMetricasIa', () => {
  it('pide las métricas a la base de datos con la sesión del Administrador', async () => {
    db.responder('rpc:admin_metricas_ia', { data: metricas });
    expect(await obtenerMetricasIa(7)).toEqual(metricas);
    expect(db.rpc).toHaveBeenCalledWith('admin_metricas_ia', { p_dias: 7 });
  });

  it('si la función rechaza a quien consulta (no es el Administrador), lanza', async () => {
    db.responder('rpc:admin_metricas_ia', { error: { code: '42501' } });
    await expect(obtenerMetricasIa(30)).rejects.toThrow(/No pudimos cargar las métricas/);
  });

  it('un formato inesperado no se muestra a medias', async () => {
    db.responder('rpc:admin_metricas_ia', { data: { proveedores: 'x' } });
    await expect(obtenerMetricasIa(30)).rejects.toThrow(/formato inesperado/);
  });
});

describe('leerConfiguracionIa', () => {
  it('modo de una sola cuenta: la cuenta teacher atiende unas 3 prácticas sin esperas', () => {
    const configuracion = leerConfiguracionIa();
    expect(configuracion).toMatchObject({
      proveedor: 'orquestador',
      orquestadorListo: true,
      cuentasDelGrupo: 0,
      capacidad: 3,
    });
    expect(configuracion.etiquetas[claveDeCuenta(DOCENTE.correo)]).toBe(
      'Cuenta principal (teacher)'
    );
  });

  it('con grupo: nombra cada cuenta por su posición, nunca por su correo', () => {
    vi.mocked(getOrquestadorEnv).mockReturnValue({
      url: 'https://orquestador.test',
      docente: DOCENTE,
      grupo: GRUPO,
    });
    const configuracion = leerConfiguracionIa();
    expect(configuracion).toMatchObject({ cuentasDelGrupo: 2, capacidad: 6 });
    expect(configuracion.etiquetas[claveDeCuenta(GRUPO[1]!.correo)]).toBe('Cuenta 2 del grupo');
    expect(JSON.stringify(configuracion)).not.toMatch(/@|secreta/);
  });

  it('sin las variables del orquestador no falla: solo Gemini', () => {
    vi.mocked(getProveedorIa).mockReturnValue('gemini');
    vi.mocked(getOrquestadorEnv).mockImplementation(() => {
      throw new Error('Variables de entorno inválidas');
    });
    expect(leerConfiguracionIa()).toEqual({
      proveedor: 'gemini',
      orquestadorListo: false,
      cuentasDelGrupo: 0,
      capacidad: 0,
      etiquetas: {},
    });
  });
});

describe('etiquetas', () => {
  it('cada motivo con el que el servidor pasa una práctica a Gemini tiene su texto', () => {
    for (const motivo of [
      'red',
      'tiempo_agotado',
      'servidor',
      'descarte_incierto',
      'autenticacion',
      'respuesta_invalida',
      'reformulacion',
      'fuga',
      'vacia',
      'interruptor',
      'sesion_borrada',
      'historial_previo',
      'sesion_incompleta',
      'cuenta_retirada',
    ]) {
      expect(ETIQUETA_CAMBIO[motivo], motivo).toBeTruthy();
    }
  });
});
