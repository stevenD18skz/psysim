import { describe, expect, it } from 'vitest';

import { type CajaXZ, circuloIntersectaCaja, resolverMovimiento } from './colisiones';

const LIMITES: CajaXZ = { minX: -3, maxX: 3, minZ: -3, maxZ: 3 };
const MESA: CajaXZ = { minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 };
const RADIO = 0.3;

describe('circuloIntersectaCaja', () => {
  it('detecta la superposición', () => {
    expect(circuloIntersectaCaja({ x: 0.7, z: 0 }, RADIO, MESA)).toBe(true);
  });

  it('no detecta colisión a más distancia que el radio', () => {
    expect(circuloIntersectaCaja({ x: 0.9, z: 0 }, RADIO, MESA)).toBe(false);
  });

  it('usa la distancia a la esquina, no a la caja expandida', () => {
    // A 0.25 en X y en Z de la esquina: distancia ≈ 0.354 > 0.3.
    expect(circuloIntersectaCaja({ x: 0.75, z: 0.75 }, RADIO, MESA)).toBe(false);
  });
});

describe('resolverMovimiento', () => {
  it('se mueve libremente sin obstáculos', () => {
    expect(resolverMovimiento({ x: 0, z: 2 }, { x: 0.1, z: -0.2 }, [], LIMITES, RADIO)).toEqual({
      x: 0.1,
      z: 1.8,
    });
  });

  it('respeta los límites de navegación', () => {
    const p = resolverMovimiento({ x: 2.9, z: -2.9 }, { x: 1, z: -1 }, [], LIMITES, RADIO);
    expect(p).toEqual({ x: 3, z: -3 });
  });

  it('bloquea el avance contra un obstáculo', () => {
    const p = resolverMovimiento({ x: 0, z: 1 }, { x: 0, z: -0.3 }, [MESA], LIMITES, RADIO);
    expect(p).toEqual({ x: 0, z: 1 });
  });

  it('se desliza a lo largo del obstáculo (resuelve cada eje por separado)', () => {
    const p = resolverMovimiento({ x: 0, z: 0.85 }, { x: 0.2, z: -0.2 }, [MESA], LIMITES, RADIO);
    expect(p.x).toBeCloseTo(0.2);
    expect(p.z).toBeCloseTo(0.85);
  });

  it('permite salir de un obstáculo si el estudiante aparece dentro de él', () => {
    const p = resolverMovimiento({ x: 0, z: 0 }, { x: 0, z: 0.2 }, [MESA], LIMITES, RADIO);
    expect(p).toEqual({ x: 0, z: 0.2 });
  });
});
