import { describe, expect, it } from 'vitest';

import {
  elegirVistaVentana,
  indicePaisaje,
  LUZ_DEL_MOMENTO,
  MOMENTOS,
  PAISAJES,
} from '@/lib/ambiente/vista-ventana';

/** Azar fijo que devuelve los valores en orden (y repite el último). */
const secuencia = (...valores: number[]) => {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)]!;
};

describe('elegirVistaVentana', () => {
  it('sortea paisaje y momento con el azar recibido', () => {
    expect(elegirVistaVentana(secuencia(0, 0, 0.5))).toEqual({
      paisaje: 'ciudad',
      momento: 'manana',
      semilla: 50,
    });
    expect(elegirVistaVentana(secuencia(0.99, 0.99, 0))).toMatchObject({
      paisaje: 'lago',
      momento: 'noche',
    });
  });

  it('cubre todas las combinaciones (ningún paisaje ni momento queda fuera del sorteo)', () => {
    const vistos = new Set<string>();
    for (let p = 0; p < PAISAJES.length; p++) {
      for (let m = 0; m < MOMENTOS.length; m++) {
        const vista = elegirVistaVentana(
          secuencia((p + 0.5) / PAISAJES.length, (m + 0.5) / MOMENTOS.length, 0)
        );
        vistos.add(`${vista.paisaje}-${vista.momento}`);
      }
    }
    expect(vistos.size).toBe(PAISAJES.length * MOMENTOS.length);
  });

  it('un azar de exactamente 1 no se sale de la lista', () => {
    expect(elegirVistaVentana(() => 1)).toMatchObject({ paisaje: 'lago', momento: 'noche' });
  });

  it('respeta la vista forzada, completa o en parte', () => {
    expect(elegirVistaVentana(secuencia(0, 0, 0), 'lago-noche')).toMatchObject({
      paisaje: 'lago',
      momento: 'noche',
    });
    expect(elegirVistaVentana(secuencia(0, 0), 'Atardecer')).toMatchObject({
      paisaje: 'ciudad',
      momento: 'atardecer',
    });
    // Lo forzado no consume azar: el primer valor va al momento.
    expect(elegirVistaVentana(secuencia(0, 0.5), 'montanas')).toMatchObject({
      paisaje: 'montanas',
      momento: 'manana',
    });
  });

  it('ignora una vista forzada que no reconoce', () => {
    expect(elegirVistaVentana(secuencia(0, 0), 'playa-amanecer')).toMatchObject({
      paisaje: 'ciudad',
      momento: 'manana',
    });
  });
});

describe('LUZ_DEL_MOMENTO', () => {
  it('de noche la ventana apenas ilumina la sala y las lámparas toman el relevo', () => {
    const noche = LUZ_DEL_MOMENTO.noche;
    expect(noche.noche).toBe(1);
    expect(noche.sala.ventana).toBeLessThan(0.3);
    expect(noche.sala.lamparas).toBeGreaterThan(1);
  });

  it('el mediodía es la luz de referencia de la escena', () => {
    expect(LUZ_DEL_MOMENTO.mediodia.sala).toMatchObject({ ventana: 1, mezcla: 0, ambiente: 1 });
  });

  it('la sala nunca queda a oscuras: el ambiente baja como mucho un 15 %', () => {
    for (const momento of MOMENTOS) {
      expect(LUZ_DEL_MOMENTO[momento].sala.ambiente).toBeGreaterThanOrEqual(0.85);
    }
  });
});

describe('indicePaisaje', () => {
  it('es la posición en la lista que entiende el shader', () => {
    expect(PAISAJES.map(indicePaisaje)).toEqual([0, 1, 2, 3]);
  });
});
