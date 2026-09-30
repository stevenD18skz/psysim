import { describe, expect, it } from 'vitest';

import { calcularAjuste } from './ajuste';

describe('calcularAjuste', () => {
  it('escala un modelo en centímetros a la altura objetivo y lo apoya en el suelo', () => {
    // Silla de 90 × 45 × 50 "unidades" (cm) con el origen en su centro.
    const resultado = calcularAjuste(
      { min: [-22.5, -45, -25], max: [22.5, 45, 25] },
      { alto: 0.9, girar: 0 }
    );
    expect(resultado.escala).toBeCloseTo(0.01);
    expect(resultado.desplazamiento[0]).toBeCloseTo(0);
    expect(resultado.desplazamiento[1]).toBeCloseTo(0.45);
    expect(resultado.desplazamiento[2]).toBeCloseTo(0);
  });

  it('escala por ancho y centra un modelo desplazado', () => {
    const resultado = calcularAjuste({ min: [2, 0, 4], max: [6, 1, 6] }, { ancho: 2, girar: 0 });
    expect(resultado.escala).toBeCloseTo(0.5);
    expect(resultado.desplazamiento).toEqual([-2, -0, -2.5]);
  });

  it('sin medida objetivo conserva la escala', () => {
    const resultado = calcularAjuste({ min: [-1, 0.2, -1], max: [1, 2, 1] }, { girar: 0 });
    expect(resultado.escala).toBe(1);
    expect(resultado.desplazamiento[1]).toBeCloseTo(-0.2);
  });
});
