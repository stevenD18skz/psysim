import { describe, expect, it } from 'vitest';

import { metricsSaveRequestSchema } from '@/schemas/metrics.schema';

import { calcularMetricasAgregadas, construirMetricasCierre, promediarProximidad } from './metrics';

const SESION_ID = '44444444-4444-4444-8444-444444444444';

/** HU-18 · T04 — contrato acordado en Taiga: `latencias` (ms) → promedio redondeado y máximo. */
describe('calcularMetricasAgregadas (HU-18 · T04)', () => {
  it('calcula la latencia promedio (redondeada) y la máxima', () => {
    expect(calcularMetricasAgregadas([1200, 800, 2501])).toMatchObject({
      latencia_promedio_ms: 1500,
      latencia_maxima_ms: 2501,
    });
  });

  it('redondea la media al entero más cercano', () => {
    expect(calcularMetricasAgregadas([1000, 1001]).latencia_promedio_ms).toBe(1001);
    expect(calcularMetricasAgregadas([999, 1000, 1000]).latencia_promedio_ms).toBe(1000);
  });

  it('con una sola respuesta, promedio y máximo coinciden', () => {
    expect(calcularMetricasAgregadas([730])).toMatchObject({
      latencia_promedio_ms: 730,
      latencia_maxima_ms: 730,
    });
  });

  it('sin respuestas del paciente devuelve nulos (no 0 ni NaN)', () => {
    expect(calcularMetricasAgregadas([])).toMatchObject({
      latencia_promedio_ms: null,
      latencia_maxima_ms: null,
    });
  });

  it('es pura: no modifica el arreglo recibido y da lo mismo con la misma entrada', () => {
    const latencias = Object.freeze([300, 100, 200]);
    const primera = calcularMetricasAgregadas(latencias);
    expect(calcularMetricasAgregadas(latencias)).toEqual(primera);
    expect(latencias).toEqual([300, 100, 200]);
  });
});

describe('promediarProximidad (HU-18 · T03)', () => {
  it('promedia las muestras con dos decimales', () => {
    expect(promediarProximidad(10, 3)).toBe(3.33);
    expect(promediarProximidad(5.4, 3)).toBe(1.8);
  });

  it('sin muestras devuelve null (no NaN)', () => {
    expect(promediarProximidad(0, 0)).toBeNull();
  });
});

describe('construirMetricasCierre (HU-18 · T04)', () => {
  const capturadas = {
    totalMensajes: 4,
    latencias: [1200.4, 800.6, 2500],
    proximidadSuma: 9,
    proximidadMuestras: 5,
  };

  it('arma el cuerpo de /api/metrics/save con latencias enteras y la proximidad media', () => {
    expect(construirMetricasCierre(SESION_ID, capturadas)).toEqual({
      sesion_id: SESION_ID,
      total_mensajes: 4,
      latencia_promedio_ms: 1500,
      latencia_maxima_ms: 2500,
      indicadores: { proximidad_promedio: 1.8 },
    });
  });

  it('una práctica sin conversación ni muestras envía nulos válidos', () => {
    const cuerpo = construirMetricasCierre(SESION_ID, {
      totalMensajes: 0,
      latencias: [],
      proximidadSuma: 0,
      proximidadMuestras: 0,
    });
    expect(cuerpo).toMatchObject({
      latencia_promedio_ms: null,
      latencia_maxima_ms: null,
      indicadores: { proximidad_promedio: null },
    });
  });

  it('lo que construye siempre cumple el contrato del Route Handler', () => {
    expect(
      metricsSaveRequestSchema.safeParse(construirMetricasCierre(SESION_ID, capturadas)).success
    ).toBe(true);
    expect(
      metricsSaveRequestSchema.safeParse(
        construirMetricasCierre(SESION_ID, { ...capturadas, latencias: [-5.2, 0.4] })
      ).success
    ).toBe(true);
  });
});
