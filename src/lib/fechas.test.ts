import { describe, expect, it } from 'vitest';

import { formatearVencimientoCodigo, tiempoRelativo } from './fechas';

describe('formatearVencimientoCodigo', () => {
  const ahora = new Date('2026-11-17T15:00:00-05:00');

  it('dice «Vence hoy» cuando expira el mismo día calendario en Colombia', () => {
    expect(formatearVencimientoCodigo('2026-11-17T23:30:00-05:00', ahora)).toBe('Vence hoy');
  });

  it('dice «Vence mañana» cuando expira el día siguiente en Colombia', () => {
    expect(formatearVencimientoCodigo('2026-11-18T10:00:00-05:00', ahora)).toBe('Vence mañana');
  });

  it('dice «Vence en X días» cuando faltan 2 o más días calendario', () => {
    expect(formatearVencimientoCodigo('2026-11-20T12:00:00-05:00', ahora)).toBe('Vence en 3 días');
    expect(formatearVencimientoCodigo('2026-11-24T15:00:00-05:00', ahora)).toBe('Vence en 7 días');
  });

  it('dice «Vencido» si la fecha ya pasó', () => {
    expect(formatearVencimientoCodigo('2026-11-17T14:00:00-05:00', ahora)).toBe('Vencido');
  });

  it('mantiene tiempoRelativo estable para fechas cercanas', () => {
    expect(tiempoRelativo('2026-11-17T14:59:30-05:00', ahora)).toBe('justo ahora');
  });
});
