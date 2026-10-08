import { describe, expect, it } from 'vitest';

import {
  calcularVencimiento,
  estadoAsignacion,
  generarCodigoAcceso,
  normalizarCodigoAcceso,
  PATRON_CODIGO_ACCESO,
  rutaUnirse,
  textoDias,
} from './codigo';

describe('generarCodigoAcceso', () => {
  it('genera códigos con el formato de Meet (abc-defg-hij)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generarCodigoAcceso()).toMatch(PATRON_CODIGO_ACCESO);
    }
  });

  it('no repite códigos en la práctica', () => {
    const codigos = new Set(Array.from({ length: 500 }, generarCodigoAcceso));
    expect(codigos.size).toBe(500);
  });
});

describe('normalizarCodigoAcceso', () => {
  it.each([
    ['abc-defg-hij', 'abc-defg-hij'],
    ['  ABC-DEFG-HIJ ', 'abc-defg-hij'],
    ['abcdefghij', 'abc-defg-hij'],
    ['abc defg hij', 'abc-defg-hij'],
    ['abc--defg-hij', 'abc-defg-hij'],
    ['https://psysim.vercel.app/unirse/abc-defg-hij', 'abc-defg-hij'],
    ['https://psysim.vercel.app/unirse/ABC-DEFG-HIJ/', 'abc-defg-hij'],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizarCodigoAcceso(entrada)).toBe(esperado);
  });

  it.each([
    '',
    'abc-defg',
    'abc-defg-hi',
    'xabc-defg-hij',
    'abc-defg-hij1',
    'ábc-defg-hij',
    '12345',
  ])('rechaza %j', entrada => {
    expect(normalizarCodigoAcceso(entrada)).toBeNull();
  });
});

describe('estadoAsignacion', () => {
  const ahora = new Date('2026-10-07T12:00:00.000Z');
  const vigente = { sesionId: null, anuladaEn: null, expiraEn: '2026-10-08T12:00:00.000Z' };

  it('pendiente mientras no se use, anule ni venza', () => {
    expect(estadoAsignacion(vigente, ahora)).toBe('pendiente');
  });

  it('vencida al pasar la fecha', () => {
    expect(estadoAsignacion({ ...vigente, expiraEn: '2026-10-07T11:59:59.000Z' }, ahora)).toBe(
      'vencida'
    );
  });

  it('el canje y la anulación mandan sobre el vencimiento', () => {
    const vencida = { ...vigente, expiraEn: '2026-10-01T00:00:00.000Z' };
    expect(estadoAsignacion({ ...vencida, sesionId: 's1' }, ahora)).toBe('usada');
    expect(estadoAsignacion({ ...vencida, anuladaEn: '2026-09-30T00:00:00.000Z' }, ahora)).toBe(
      'anulada'
    );
  });
});

describe('utilidades', () => {
  it('calcula el vencimiento sumando días completos', () => {
    expect(calcularVencimiento(7, new Date('2026-10-07T12:00:00.000Z')).toISOString()).toBe(
      '2026-10-14T12:00:00.000Z'
    );
  });

  it('arma el enlace y el texto de la vigencia', () => {
    expect(rutaUnirse('abc-defg-hij')).toBe('/unirse/abc-defg-hij');
    expect(textoDias(1)).toBe('1 día');
    expect(textoDias(30)).toBe('30 días');
  });
});
