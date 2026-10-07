import { describe, expect, it } from 'vitest';

import { type EstudianteRegistrado } from '@/types';

import {
  buscarPorCodigo,
  contarSesiones,
  filtrarEstudiantes,
  formatearDia,
  formatearTiempoPractica,
  normalizarTexto,
} from './estudiantes';

function estudiante(codigo: string, nombre: string): EstudianteRegistrado {
  return {
    id: codigo,
    codigo,
    nombre,
    creadoEn: '2026-10-01T15:00:00.000Z',
    metricas: {
      sesiones: 1,
      finalizadas: 0,
      segundosPractica: 0,
      casos: 1,
      intervenciones: 0,
      ultimaSesion: null,
    },
  };
}

const LISTA = [
  estudiante('202012345', 'Ana María Pérez'),
  estudiante('202112345', 'José Gómez'),
  estudiante('201998765', 'María José Ruiz'),
];

describe('filtrarEstudiantes', () => {
  it('sin término devuelve los primeros (los más recientes) hasta el límite', () => {
    expect(filtrarEstudiantes(LISTA, '  ', 2).map(e => e.codigo)).toEqual([
      '202012345',
      '202112345',
    ]);
  });

  it('busca por el inicio del código', () => {
    expect(filtrarEstudiantes(LISTA, '2020').map(e => e.nombre)).toEqual(['Ana María Pérez']);
    expect(filtrarEstudiantes(LISTA, '12345')).toEqual([]);
  });

  it('busca por nombre sin importar tildes, mayúsculas ni el orden de las palabras', () => {
    expect(filtrarEstudiantes(LISTA, 'jose').map(e => e.codigo)).toEqual([
      '202112345',
      '201998765',
    ]);
    expect(filtrarEstudiantes(LISTA, 'PEREZ ana').map(e => e.codigo)).toEqual(['202012345']);
  });
});

describe('buscarPorCodigo', () => {
  it('encuentra el código exacto (ignorando espacios alrededor)', () => {
    expect(buscarPorCodigo(LISTA, ' 202112345 ')?.nombre).toBe('José Gómez');
    expect(buscarPorCodigo(LISTA, '2021')).toBeUndefined();
    expect(buscarPorCodigo(LISTA, '')).toBeUndefined();
  });
});

describe('formatos', () => {
  it('normaliza texto para comparar nombres', () => {
    expect(normalizarTexto('  José   PÉREZ ')).toBe('jose perez');
  });

  it.each([
    [0, '—'],
    [20, 'menos de 1 min'],
    [45 * 60, '45 min'],
    [3600, '1 h'],
    [80 * 60, '1 h 20 min'],
  ])('%i s de práctica → %s', (segundos, texto) => {
    expect(formatearTiempoPractica(segundos)).toBe(texto);
  });

  it('cuenta sesiones en singular y plural', () => {
    expect(contarSesiones(1)).toBe('1 sesión');
    expect(contarSesiones(3)).toBe('3 sesiones');
  });

  it('formatea el día en la hora de Colombia', () => {
    // 02:00 UTC del 7 de octubre es aún 6 de octubre en Bogotá.
    expect(formatearDia('2026-10-07T02:00:00.000Z')).toMatch(/^6 de oct/);
  });
});
