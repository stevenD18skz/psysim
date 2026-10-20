import { describe, expect, it } from 'vitest';

import {
  coincideBusqueda,
  conParametros,
  dentroDelPeriodo,
  diasDesde,
  leerOpcion,
  leerPagina,
  paginar,
} from './listas';

describe('paginar', () => {
  const elementos = Array.from({ length: 183 }, (_, i) => i + 1);

  it('corta la página pedida y dice qué rango muestra', () => {
    const pagina = paginar(elementos, 2);
    expect(pagina.visibles).toHaveLength(20);
    expect(pagina).toMatchObject({ pagina: 2, totalPaginas: 10, total: 183, desde: 21, hasta: 40 });
  });

  it('ajusta una página que ya no existe (p. ej. tras filtrar) a la última', () => {
    expect(paginar(elementos, 99)).toMatchObject({ pagina: 10, desde: 181, hasta: 183 });
  });

  it('sin elementos hay una página vacía', () => {
    expect(paginar([], 1)).toMatchObject({ visibles: [], totalPaginas: 1, desde: 0, hasta: 0 });
  });
});

describe('leer parámetros', () => {
  it('acepta solo opciones conocidas', () => {
    expect(leerOpcion('nota', ['nombre', 'nota'] as const, 'nombre')).toBe('nota');
    expect(leerOpcion('<script>', ['nombre', 'nota'] as const, 'nombre')).toBe('nombre');
    expect(leerOpcion(['nota', 'nombre'], ['nombre', 'nota'] as const, 'nombre')).toBe('nota');
  });

  it('la página es un entero positivo', () => {
    expect(leerPagina('3')).toBe(3);
    expect(leerPagina('-2')).toBe(1);
    expect(leerPagina('abc')).toBe(1);
    expect(leerPagina(undefined)).toBe(1);
  });
});

describe('coincideBusqueda', () => {
  it('sin tildes ni mayúsculas y con las palabras en cualquier orden', () => {
    expect(coincideBusqueda('maria e-03', 'María José Pérez', 'E-03')).toBe(true);
    expect(coincideBusqueda('PEREZ jose', 'María José Pérez')).toBe(true);
    expect(coincideBusqueda('lopez', 'María José Pérez')).toBe(false);
    expect(coincideBusqueda('   ', 'cualquiera')).toBe(true);
  });
});

describe('dentroDelPeriodo y diasDesde', () => {
  const ahora = new Date('2026-10-18T12:00:00.000Z');
  it('cuenta hacia atrás desde ahora', () => {
    expect(dentroDelPeriodo('2026-10-15T12:00:00.000Z', 'semana', ahora)).toBe(true);
    expect(dentroDelPeriodo('2026-10-01T12:00:00.000Z', 'semana', ahora)).toBe(false);
    expect(dentroDelPeriodo('2020-01-01T00:00:00.000Z', 'todo', ahora)).toBe(true);
    expect(diasDesde('2026-10-15T12:00:00.000Z', ahora)).toBe(3);
    expect(diasDesde('2026-10-19T12:00:00.000Z', ahora)).toBe(0);
  });
});

describe('conParametros', () => {
  it('omite los valores por defecto y vuelve a la página 1 al cambiar un filtro', () => {
    const actuales = { q: 'ana', orden: 'nota', pagina: '3' };
    expect(conParametros('/sesiones', actuales, { caso: 'E-01' }, { orden: 'espera' })).toBe(
      '/sesiones?q=ana&orden=nota&caso=E-01'
    );
    expect(conParametros('/sesiones', actuales, { orden: 'espera' }, { orden: 'espera' })).toBe(
      '/sesiones?q=ana'
    );
  });

  it('conserva los filtros al cambiar de página', () => {
    expect(conParametros('/sesiones', { q: 'ana' }, { pagina: 2 })).toBe(
      '/sesiones?q=ana&pagina=2'
    );
    expect(conParametros('/sesiones', { q: 'ana', pagina: '2' }, { pagina: 1 })).toBe(
      '/sesiones?q=ana'
    );
  });
});
