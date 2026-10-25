import { describe, expect, it } from 'vitest';

import { type MensajeConversacion } from '@/types';

import {
  type FilaMetrica,
  formatearDistancia,
  formatearLatencia,
  metricasDeSesion,
} from './resultados';

function mensaje(
  remitente: MensajeConversacion['remitente'],
  latencia_ms?: number
): MensajeConversacion {
  return {
    id: crypto.randomUUID(),
    remitente,
    contenido: 'x',
    timestamp: '2026-10-20T15:01:00.000Z',
    ...(latencia_ms !== undefined && { latencia_ms }),
  };
}

const SESION = {
  comenzada: true,
  inicio: '2026-10-20T15:00:00.000Z',
  fin: '2026-10-20T15:05:30.000Z',
  mensajes: [
    mensaje('estudiante'),
    mensaje('npc', 1000),
    mensaje('estudiante'),
    mensaje('npc', 3000),
  ],
};

const FILA: FilaMetrica = {
  total_mensajes: 5,
  latencia_promedio_ms: 1820,
  latencia_maxima_ms: 3400,
  duracion_segundos: 600,
  indicadores: { proximidad_promedio: 1.8 },
};

describe('metricasDeSesion (HU-21)', () => {
  it('con la fila guardada usa sus valores, no los de la conversación', () => {
    expect(metricasDeSesion(SESION, FILA)).toEqual({
      totalMensajes: 5,
      latenciaPromedioMs: 1820,
      latenciaMaximaMs: 3400,
      duracionSegundos: 600,
      proximidadPromedioM: 1.8,
      origen: 'guardadas',
    });
  });

  it('sin fila las reconstruye con la conversación y la duración de la sesión', () => {
    expect(metricasDeSesion(SESION, null)).toEqual({
      totalMensajes: 2,
      latenciaPromedioMs: 2000,
      latenciaMaximaMs: 3000,
      duracionSegundos: 330,
      proximidadPromedioM: null,
      origen: 'reconstruidas',
    });
  });

  it('una práctica que no llegó a comenzar no tiene duración', () => {
    const metricas = metricasDeSesion({ ...SESION, comenzada: false, mensajes: [] }, null);
    expect(metricas).toMatchObject({
      totalMensajes: 0,
      latenciaPromedioMs: null,
      latenciaMaximaMs: null,
      duracionSegundos: null,
    });
  });

  it('ignora los mensajes del paciente sin latencia (anteriores a las métricas)', () => {
    const metricas = metricasDeSesion({ ...SESION, mensajes: [mensaje('npc')] }, null);
    expect(metricas.latenciaPromedioMs).toBeNull();
  });

  it.each([
    ['sin indicadores', null],
    ['indicadores que no son un objeto', 'texto'],
    ['proximidad que no es un número', { proximidad_promedio: 'cerca' }],
    ['proximidad nula', { proximidad_promedio: null }],
  ])('%s → proximidad sin valor', (_, indicadores) => {
    expect(metricasDeSesion(SESION, { ...FILA, indicadores }).proximidadPromedioM).toBeNull();
  });
});

describe('formatearLatencia', () => {
  it.each([
    [null, '—'],
    [0, '0 ms'],
    [850, '850 ms'],
    [999, '999 ms'],
    [1000, '1,0 s'],
    [1820, '1,8 s'],
    [12_500, '12,5 s'],
  ])('%s → %s', (ms, esperado) => {
    expect(formatearLatencia(ms)).toBe(esperado);
  });
});

describe('formatearDistancia', () => {
  it.each([
    [null, '—'],
    [1.8, '1,8 m'],
    [3, '3,0 m'],
    [0, '0,0 m'],
  ])('%s → %s', (metros, esperado) => {
    expect(formatearDistancia(metros)).toBe(esperado);
  });
});
