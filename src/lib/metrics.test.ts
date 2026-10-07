import { beforeAll, describe, expect, it } from 'vitest';

import { existe } from '../../test/pendiente';

/**
 * HU-26 · T03 (Sprint 6) — `calcularMetricasAgregadas` del Sprint 4 (HU-18 · T04).
 *
 * Pendiente: se activa cuando exista `src/lib/metrics.ts`. Define el contrato acordado en Taiga:
 * recibe el arreglo `latencias` del slice de métricas (ms) y devuelve, al menos,
 * `latencia_promedio_ms` (media redondeada) y `latencia_maxima_ms`; sin latencias, ambos `null`
 * (el Route Handler los acepta como nulos). Si al implementarla cambia la firma, ajusta aquí.
 */
const MODULO = './metrics';

interface MetricasAgregadas {
  latencia_promedio_ms: number | null;
  latencia_maxima_ms: number | null;
}

describe.skipIf(!existe('src/lib/metrics.ts'))('calcularMetricasAgregadas (HU-18 · T04)', () => {
  let calcular: (latencias: readonly number[]) => MetricasAgregadas;

  beforeAll(async () => {
    ({ calcularMetricasAgregadas: calcular } = await import(/* @vite-ignore */ MODULO));
  });

  it('calcula la latencia promedio (redondeada) y la máxima', () => {
    expect(calcular([1200, 800, 2501])).toMatchObject({
      latencia_promedio_ms: 1500,
      latencia_maxima_ms: 2501,
    });
  });

  it('redondea la media al entero más cercano', () => {
    expect(calcular([1000, 1001]).latencia_promedio_ms).toBe(1001);
    expect(calcular([999, 1000, 1000]).latencia_promedio_ms).toBe(1000);
  });

  it('con una sola respuesta, promedio y máximo coinciden', () => {
    expect(calcular([730])).toMatchObject({ latencia_promedio_ms: 730, latencia_maxima_ms: 730 });
  });

  it('sin respuestas del paciente devuelve nulos (no 0 ni NaN)', () => {
    expect(calcular([])).toMatchObject({ latencia_promedio_ms: null, latencia_maxima_ms: null });
  });

  it('es pura: no modifica el arreglo recibido y da lo mismo con la misma entrada', () => {
    const latencias = Object.freeze([300, 100, 200]);
    const primera = calcular(latencias);
    expect(calcular(latencias)).toEqual(primera);
    expect(latencias).toEqual([300, 100, 200]);
  });
});
