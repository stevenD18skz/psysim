import { describe, expect, it } from 'vitest';

import {
  alturaCabezaNpc,
  DESCENSO_MIRADA,
  DISTANCIA_CONVERSACION,
  distanciaXZ,
  encuadreConversacion,
} from './encuadre';

describe('encuadreConversacion (HU-13 · T01)', () => {
  it('ubica al estudiante frente a un paciente sentado que mira hacia +Z', () => {
    const { posicion, mirarA } = encuadreConversacion({
      posicion: [0, 0, -1.95],
      rotacion: 0,
      postura: 'sentado',
    });
    expect(posicion[0]).toBeCloseTo(0);
    expect(posicion[1]).toBeCloseTo(1.25);
    expect(posicion[2]).toBeCloseTo(-1.95 + DISTANCIA_CONVERSACION);
    // Mira un poco por debajo de los ojos: el rostro queda sobre el panel de conversación.
    expect(mirarA).toEqual([0, alturaCabezaNpc('sentado') - DESCENSO_MIRADA, -1.95]);
  });

  it('respeta la rotación del paciente', () => {
    const { posicion } = encuadreConversacion({
      posicion: [0, 0, 0],
      rotacion: 90,
      postura: 'de-pie',
    });
    expect(posicion[0]).toBeCloseTo(DISTANCIA_CONVERSACION);
    expect(posicion[1]).toBeCloseTo(1.6);
    expect(posicion[2]).toBeCloseTo(0);
  });

  it('usa el punto de conversación del JSON si existe', () => {
    const { posicion } = encuadreConversacion({
      posicion: [0, 0, -2],
      rotacion: 0,
      postura: 'sentado',
      puntoConversacion: [0.4, 1.3, -0.2],
    });
    expect(posicion).toEqual([0.4, 1.3, -0.2]);
  });
});

describe('distanciaXZ', () => {
  it('ignora la altura', () => {
    expect(distanciaXZ([0, 1.6, 3], [0, 0, -1])).toBeCloseTo(4);
    expect(distanciaXZ([3, 0, 0], [0, 5, 4])).toBeCloseTo(5);
  });
});
