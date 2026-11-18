import { describe, expect, it } from 'vitest';

import {
  clasificarEstado,
  clasificarExcepcion,
  ErrorOrquestador,
  esFalloDelServicio,
  leerRetryAfter,
} from './errores';

describe('clasificarEstado', () => {
  it.each([
    [401, 'autenticacion'],
    [403, 'permiso'],
    [404, 'no_encontrado'],
    [400, 'datos'],
    [422, 'datos'],
    [429, 'limite'],
    [408, 'tiempo_agotado'],
    [504, 'tiempo_agotado'],
    [500, 'servidor'],
    [502, 'servidor'],
    [503, 'servidor'],
  ] as const)('%i → %s', (estado, tipo) => {
    expect(clasificarEstado(estado)).toBe(tipo);
  });

  it('un 500 en conversación deja el turno en duda; un 502 lo descartó', () => {
    expect(clasificarEstado(500, true)).toBe('descarte_incierto');
    expect(clasificarEstado(502, true)).toBe('servidor');
  });
});

describe('clasificarExcepcion', () => {
  it('distingue el tiempo agotado de un fallo de red', () => {
    expect(clasificarExcepcion(new DOMException('tardó', 'TimeoutError'))).toBe('tiempo_agotado');
    expect(clasificarExcepcion(new DOMException('abortada', 'AbortError'))).toBe('tiempo_agotado');
    expect(clasificarExcepcion(new TypeError('fetch failed'))).toBe('red');
    expect(clasificarExcepcion('cualquier cosa')).toBe('red');
  });
});

describe('leerRetryAfter', () => {
  it('lee segundos, redondeando hacia arriba', () => {
    expect(leerRetryAfter('12')).toBe(12);
    expect(leerRetryAfter('0.4')).toBe(1);
  });

  it('lee una fecha HTTP', () => {
    const ahora = Date.parse('2026-11-11T10:00:00Z');
    expect(leerRetryAfter('Wed, 11 Nov 2026 10:00:30 GMT', ahora)).toBe(30);
    expect(leerRetryAfter('Wed, 11 Nov 2026 09:00:00 GMT', ahora)).toBe(0);
  });

  it('devuelve null si falta o no se entiende', () => {
    expect(leerRetryAfter(null)).toBeNull();
    expect(leerRetryAfter('')).toBeNull();
    expect(leerRetryAfter('pronto')).toBeNull();
    expect(leerRetryAfter('-3')).toBeNull();
  });
});

describe('esFalloDelServicio', () => {
  it('solo los fallos reales del orquestador activan el respaldo', () => {
    for (const tipo of [
      'red',
      'tiempo_agotado',
      'servidor',
      'descarte_incierto',
      'autenticacion',
      'respuesta_invalida',
    ] as const) {
      expect(esFalloDelServicio(tipo), tipo).toBe(true);
    }
  });

  it('el límite y los errores de datos de PsySim nunca activan el respaldo', () => {
    for (const tipo of ['limite', 'permiso', 'no_encontrado', 'datos'] as const) {
      expect(esFalloDelServicio(tipo), tipo).toBe(false);
    }
  });
});

describe('ErrorOrquestador', () => {
  it('conserva el tipo, el estado y la espera sin exponer el detalle del proveedor', () => {
    const error = new ErrorOrquestador('limite', { estado: 429, esperaS: 7 });
    expect(error).toMatchObject({ tipo: 'limite', estado: 429, esperaS: 7 });
    expect(error.message).toBe('Fallo del orquestador: limite');
    expect(new ErrorOrquestador('red')).toMatchObject({ estado: null, esperaS: null });
  });
});
