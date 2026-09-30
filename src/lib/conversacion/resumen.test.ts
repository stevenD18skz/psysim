import { describe, expect, it } from 'vitest';

import { formatearDuracion, resumirSesion } from './resumen';

describe('resumirSesion', () => {
  it('calcula duración, intervenciones y latencia media', () => {
    expect(
      resumirSesion('2026-09-30T15:00:00.000Z', '2026-09-30T15:12:34.400Z', {
        totalMensajes: 5,
        latencias: [900, 1100, 1300],
      })
    ).toEqual({ duracionSegundos: 754, intervenciones: 5, latenciaPromedioMs: 1100 });
  });

  it('sin respuestas del paciente la latencia es null', () => {
    expect(
      resumirSesion('2026-09-30T15:00:00Z', '2026-09-30T15:00:10Z', {
        totalMensajes: 1,
        latencias: [],
      }).latenciaPromedioMs
    ).toBeNull();
  });
});

describe('formatearDuracion', () => {
  it.each([
    [0, '00:00'],
    [59.9, '00:59'],
    [754, '12:34'],
    [3725, '1:02:05'],
    [-5, '00:00'],
  ])('%d s → %s', (segundos, esperado) => {
    expect(formatearDuracion(segundos)).toBe(esperado);
  });
});
