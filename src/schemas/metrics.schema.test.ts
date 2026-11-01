import { describe, expect, it } from 'vitest';

import {
  LIMITES_METRICAS,
  metricsSaveErrorSchema,
  metricsSaveRequestSchema,
  metricsSaveResponseSchema,
} from './metrics.schema';

const SESION_ID = '44444444-4444-4444-8444-444444444444';
const VALIDO = {
  sesion_id: SESION_ID,
  total_mensajes: 4,
  latencia_promedio_ms: 1820,
  latencia_maxima_ms: 3400,
  indicadores: { proximidad_promedio: 1.8 },
};

function campos(cuerpo: unknown) {
  const resultado = metricsSaveRequestSchema.safeParse(cuerpo);
  if (resultado.success) return null;
  return resultado.error.flatten().fieldErrors as Record<string, string[]>;
}

describe('metricsSaveRequestSchema (HU-19 · T01)', () => {
  it('acepta un cuerpo completo', () => {
    expect(metricsSaveRequestSchema.parse(VALIDO)).toEqual(VALIDO);
  });

  it('acepta una práctica sin conversación (todo nulo o en cero)', () => {
    const sinConversacion = {
      sesion_id: SESION_ID,
      total_mensajes: 0,
      latencia_promedio_ms: null,
      latencia_maxima_ms: null,
      indicadores: null,
    };
    expect(metricsSaveRequestSchema.safeParse(sinConversacion).success).toBe(true);
    expect(
      metricsSaveRequestSchema.safeParse({
        ...sinConversacion,
        indicadores: { proximidad_promedio: null },
      }).success
    ).toBe(true);
  });

  it.each([
    ['sesion_id que no es UUID', { ...VALIDO, sesion_id: 'abc' }, 'sesion_id'],
    ['sin sesion_id', { ...VALIDO, sesion_id: undefined }, 'sesion_id'],
    ['total_mensajes negativo', { ...VALIDO, total_mensajes: -1 }, 'total_mensajes'],
    ['total_mensajes decimal', { ...VALIDO, total_mensajes: 1.5 }, 'total_mensajes'],
    [
      'total_mensajes por encima del tope',
      { ...VALIDO, total_mensajes: LIMITES_METRICAS.mensajes + 1 },
      'total_mensajes',
    ],
    ['total_mensajes como texto', { ...VALIDO, total_mensajes: '4' }, 'total_mensajes'],
    ['latencia con decimales', { ...VALIDO, latencia_promedio_ms: 12.5 }, 'latencia_promedio_ms'],
    ['latencia negativa', { ...VALIDO, latencia_promedio_ms: -1 }, 'latencia_promedio_ms'],
    [
      'latencia absurda',
      { ...VALIDO, latencia_maxima_ms: LIMITES_METRICAS.latenciaMs + 1 },
      'latencia_maxima_ms',
    ],
    [
      'proximidad negativa',
      { ...VALIDO, indicadores: { proximidad_promedio: -0.1 } },
      'indicadores',
    ],
    [
      'proximidad fuera del consultorio',
      { ...VALIDO, indicadores: { proximidad_promedio: LIMITES_METRICAS.proximidadM + 1 } },
      'indicadores',
    ],
  ])('rechaza %s señalando el campo', (_, cuerpo, campo) => {
    expect(campos(cuerpo)).toHaveProperty(campo);
  });

  it('exige que la latencia promedio y la máxima se envíen juntas', () => {
    expect(campos({ ...VALIDO, latencia_promedio_ms: null })).toHaveProperty(
      'latencia_promedio_ms'
    );
    expect(campos({ ...VALIDO, latencia_maxima_ms: null })).toHaveProperty('latencia_maxima_ms');
  });

  it('rechaza una máxima menor que el promedio', () => {
    expect(campos({ ...VALIDO, latencia_maxima_ms: 1000 })).toHaveProperty('latencia_maxima_ms');
  });

  it('ignora campos que no forman parte del contrato', () => {
    const resultado = metricsSaveRequestSchema.parse({ ...VALIDO, tokens: 999, estado: 'x' });
    expect(resultado).toEqual(VALIDO);
  });
});

describe('respuestas del Route Handler', () => {
  it('la respuesta exitosa lleva la sesión y el id de la métrica', () => {
    const cuerpo = { sesion_id: SESION_ID, metrica_id: '55555555-5555-4555-8555-555555555555' };
    expect(metricsSaveResponseSchema.parse(cuerpo)).toEqual(cuerpo);
    expect(metricsSaveResponseSchema.safeParse({ sesion_id: SESION_ID }).success).toBe(false);
  });

  it('el error lleva un mensaje y, opcionalmente, el detalle por campo', () => {
    expect(metricsSaveErrorSchema.safeParse({ error: 'x' }).success).toBe(true);
    expect(
      metricsSaveErrorSchema.safeParse({ error: 'x', campos: { sesion_id: ['mal'] } }).success
    ).toBe(true);
    expect(metricsSaveErrorSchema.safeParse({ campos: {} }).success).toBe(false);
  });
});
