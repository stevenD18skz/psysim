import { describe, expect, it } from 'vitest';

import { planVoz, VOZ_POR_DEFECTO } from '@/lib/audio/voz';

import { ademanesDeHabla, momentosClave, reaccionAlInicio } from './gestos-habla';

const FRASE = 'Pues la verdad es que no duermo bien. Me despierto a las tres y ya no puedo volver.';
const silabas = (texto = FRASE, duracion = 5) =>
  planVoz(texto, VOZ_POR_DEFECTO, 'neutral', duracion);

describe('ademanesDeHabla', () => {
  it('marca el inicio de cada frase y respeta la separación mínima', () => {
    const plan = silabas();
    const ademanes = ademanesDeHabla(plan, 2, 'neutral');
    expect(ademanes[0]!.t).toBe(0);
    expect(ademanes[0]!.fuerza).toBe(1);
    // La segunda frase (tras el punto) también empieza con un ademán marcado.
    expect(ademanes.filter(a => a.fuerza === 1).length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < ademanes.length; i++) {
      expect(ademanes[i]!.t - ademanes[i - 1]!.t).toBeGreaterThanOrEqual(0.75 * 0.6 - 1e-9);
    }
  });

  it('con más intensidad hay más ademanes; con tristeza, menos', () => {
    const plan = silabas();
    expect(ademanesDeHabla(plan, 3, 'neutral').length).toBeGreaterThan(
      ademanesDeHabla(plan, 1, 'neutral').length
    );
    expect(ademanesDeHabla(plan, 2, 'triste').length).toBeLessThan(
      ademanesDeHabla(plan, 2, 'ansioso').length
    );
  });

  it('la mano dominante hace la mayoría', () => {
    const ademanes = ademanesDeHabla(silabas(FRASE.repeat(3), 15), 3, 'neutral');
    const derecha = ademanes.filter(a => a.lado === -1).length;
    expect(derecha).toBeGreaterThan(ademanes.length / 2);
    const zurdo = ademanesDeHabla(silabas(FRASE.repeat(3), 15), 3, 'neutral', false);
    expect(zurdo.filter(a => a.lado === 1).length).toBeGreaterThan(zurdo.length / 2);
  });

  it('sin plan (o con muy pocas sílabas) no hay ademanes', () => {
    expect(ademanesDeHabla([], 2, 'neutral')).toEqual([]);
    expect(ademanesDeHabla(silabas('Sí.', 0.4), 2, 'neutral')).toEqual([]);
  });
});

describe('momentosClave', () => {
  it('se encoge al decir «no sé», en su momento', () => {
    const texto = 'Me pasa casi todos los días y, la verdad, no sé por qué.';
    const momentos = momentosClave(texto, 4);
    const duda = momentos.find(m => m.reaccion === 'encogerse')!;
    expect(duda).toBeDefined();
    expect(duda.t).toBeCloseTo((texto.indexOf('no sé') / texto.length) * 4, 5);
  });

  it('distingue «no sé» de «no se puede»', () => {
    expect(momentosClave('Eso no se puede hablar en casa.', 3)).toEqual([]);
    expect(momentosClave('No se, la verdad.', 2)[0]?.reaccion).toBe('encogerse');
  });

  it('lleva la mano al pecho con el dolor y alza las cejas al preguntar', () => {
    const momentos = momentosClave('Es que me duele mucho todavía. ¿Usted cree que pase?', 6);
    expect(momentos.map(m => m.reaccion)).toEqual(['mano_al_pecho', 'alzar_cejas']);
    // Las cejas suben al final de la pregunta, no al principio.
    expect(momentos[1]!.t).toBeGreaterThan(4.5);
  });

  it('niega levemente con «nunca», «tampoco»… pero no con «no me acuerdo»', () => {
    expect(momentosClave('Mi papá nunca me escuchó.', 3).map(m => m.reaccion)).toEqual([
      'negar_leve',
    ]);
    expect(momentosClave('No me acuerdo bien de eso.', 3)).toEqual([]);
  });

  it('no amontona reacciones: separa y prioriza las más expresivas', () => {
    const momentos = momentosClave('No, nunca, no sé, me duele, ¿sabe?', 1.2);
    expect(momentos).toHaveLength(1);
    expect(['encogerse', 'mano_al_pecho']).toContain(momentos[0]!.reaccion);
    const largo = momentosClave('No sé. '.repeat(20), 40);
    expect(largo.length).toBeLessThanOrEqual(4);
  });
});

describe('reaccionAlInicio', () => {
  it.each([
    ['No sé qué decirle.', 'encogerse'],
    ['Pues… no sé.', 'encogerse'],
    ['Me duele recordarlo.', 'mano_al_pecho'],
    ['Bueno, es complicado.', null],
    ['Tuve un día largo y al final no sé qué pasó.', null],
  ] as const)('«%s» → %s', (texto, esperado) => {
    expect(reaccionAlInicio(texto)).toBe(esperado);
  });
});
