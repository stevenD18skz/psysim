import { describe, expect, it } from 'vitest';

import { planVoz, type Silaba, VOZ_POR_DEFECTO } from './voz';

const promedio = (plan: Silaba[]) => plan.reduce((s, x) => s + x.tono, 0) / plan.length;

describe('planVoz', () => {
  it('una sílaba por grupo de vocales, en orden y dentro de la duración', () => {
    const plan = planVoz('Hola, buenas tardes.', VOZ_POR_DEFECTO, 'neutral', 3);
    // ho-la, bue-nas tar-des → 6 sílabas.
    expect(plan).toHaveLength(6);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i]!.inicio).toBeGreaterThan(plan[i - 1]!.inicio);
    }
    const final = plan.at(-1)!;
    expect(final.inicio + final.duracion).toBeLessThanOrEqual(3);
  });

  it('la puntuación agrega pausas y cada vocal tiene su color', () => {
    const plan = planVoz('a, i', VOZ_POR_DEFECTO, 'neutral', 2);
    expect(plan[1]!.inicio - plan[0]!.inicio).toBeGreaterThan(plan[0]!.duracion + 0.1);
    expect(plan[1]!.formante).toBeGreaterThan(plan[0]!.formante);
  });

  it('un texto largo con poco tiempo toma sílabas de forma pareja sin bajar de 70 ms', () => {
    const largo = 'Bueno, la verdad es que no he podido dormir bien. '.repeat(6);
    const plan = planVoz(largo, VOZ_POR_DEFECTO, 'neutral', 4);
    expect(plan.length).toBeGreaterThan(20);
    expect(Math.min(...plan.map(s => s.duracion))).toBeGreaterThanOrEqual(0.07 * 0.9);
    const final = plan.at(-1)!;
    expect(final.inicio + final.duracion).toBeLessThanOrEqual(4.01);
  });

  it('la tristeza habla más grave y lento que la ansiedad', () => {
    const texto = 'No sé qué hacer con todo esto que siento.';
    const triste = planVoz(texto, VOZ_POR_DEFECTO, 'triste', 10);
    const ansioso = planVoz(texto, VOZ_POR_DEFECTO, 'ansioso', 10);
    expect(promedio(triste)).toBeLessThan(promedio(ansioso));
    expect(triste[1]!.inicio).toBeGreaterThan(ansioso[1]!.inicio);
  });

  it('cada personaje suena con su propio tono', () => {
    const grave = planVoz('Hola', { tono: 115, ritmo: 0.85 }, 'neutral', 2);
    const aguda = planVoz('Hola', { tono: 260, ritmo: 1 }, 'neutral', 2);
    expect(promedio(grave)).toBeLessThan(promedio(aguda));
  });

  it('la puntuación seguida ("...", "?!") cuenta como una sola pausa', () => {
    const puntos = planVoz('Bueno... sí', VOZ_POR_DEFECTO, 'neutral', 3);
    const punto = planVoz('Bueno. sí', VOZ_POR_DEFECTO, 'neutral', 3);
    expect(puntos.at(-1)!.inicio).toBeCloseTo(punto.at(-1)!.inicio, 5);
    const sorpresa = planVoz('¿En serio?!', VOZ_POR_DEFECTO, 'neutral', 3);
    const pregunta = planVoz('¿En serio?', VOZ_POR_DEFECTO, 'neutral', 3);
    expect(sorpresa.at(-1)!.tono).toBeCloseTo(pregunta.at(-1)!.tono, 5);
  });

  it('la pregunta sube al final y la afirmación baja', () => {
    const pregunta = planVoz('¿Usted cree?', VOZ_POR_DEFECTO, 'neutral', 3);
    const afirmacion = planVoz('Usted cree.', VOZ_POR_DEFECTO, 'neutral', 3);
    expect(pregunta.at(-1)!.tono).toBeGreaterThan(afirmacion.at(-1)!.tono);
  });

  it('es determinista y no produce nada sin vocales o sin tiempo', () => {
    expect(planVoz('Hola', VOZ_POR_DEFECTO, 'neutral', 2)).toEqual(
      planVoz('Hola', VOZ_POR_DEFECTO, 'neutral', 2)
    );
    expect(planVoz('…', VOZ_POR_DEFECTO, 'neutral', 2)).toEqual([]);
    expect(planVoz('Hola', VOZ_POR_DEFECTO, 'neutral', 0)).toEqual([]);
  });
});
