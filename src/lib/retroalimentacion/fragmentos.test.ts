import { describe, expect, it } from 'vitest';

import { type Anotacion } from '@/types';

import {
  aPuntosDeCodigo,
  fragmentoEntre,
  recortarSeleccion,
  segmentarMensaje,
  seSolapa,
} from './fragmentos';

function anotacion(id: string, inicio: number, fin: number): Anotacion {
  return { id, mensajeId: 'm1', inicio, fin, fragmento: '', comentario: `Comentario ${id}` };
}

const CON_EMOJI = 'Hola 😊, ¿cómo está?';

describe('posiciones en puntos de código', () => {
  it('un emoji cuenta como un carácter, igual que en PostgreSQL', () => {
    // En JavaScript el emoji ocupa dos unidades UTF-16.
    const indiceComa = CON_EMOJI.indexOf(',');
    expect(indiceComa).toBe(7);
    expect(aPuntosDeCodigo(CON_EMOJI, indiceComa)).toBe(6);
    expect(fragmentoEntre(CON_EMOJI, 5, 6)).toBe('😊');
  });
});

describe('recortarSeleccion', () => {
  it('quita los espacios de los bordes', () => {
    expect(recortarSeleccion('  hablaste muy  duro ', 0, 16)).toEqual({ inicio: 2, fin: 14 });
  });

  it('acepta la selección al revés y la limita al texto', () => {
    expect(recortarSeleccion('hola', 10, 1)).toEqual({ inicio: 1, fin: 4 });
  });

  it('una selección de solo espacios no sirve', () => {
    expect(recortarSeleccion('a   b', 1, 4)).toBeNull();
  });
});

describe('seSolapa', () => {
  const existentes = [anotacion('a', 5, 10)];

  it.each([
    [0, 6, true],
    [9, 12, true],
    [6, 8, true],
    [0, 5, false],
    [10, 15, false],
  ])('[%i, %i) → %s', (inicio, fin, esperado) => {
    expect(seSolapa(existentes, inicio, fin)).toBe(esperado);
  });
});

describe('segmentarMensaje', () => {
  it('alterna texto normal y subrayado, en orden', () => {
    const segmentos = segmentarMensaje('Me parece que usted exagera.', [
      anotacion('b', 20, 27),
      anotacion('a', 0, 9),
    ]);
    expect(segmentos.map(s => [s.texto, s.anotacion?.id ?? null])).toEqual([
      ['Me parece', 'a'],
      [' que usted ', null],
      ['exagera', 'b'],
      ['.', null],
    ]);
  });

  it('respeta los emojis al partir el texto', () => {
    const segmentos = segmentarMensaje(CON_EMOJI, [anotacion('a', 5, 6)]);
    expect(segmentos.map(s => s.texto)).toEqual(['Hola ', '😊', ', ¿cómo está?']);
  });

  it('sin anotaciones devuelve el texto completo', () => {
    expect(segmentarMensaje('Hola', [])).toEqual([{ texto: 'Hola', anotacion: null }]);
  });

  it('ignora las anotaciones solapadas o fuera del texto', () => {
    const segmentos = segmentarMensaje('abcdef', [
      anotacion('a', 0, 3),
      anotacion('b', 2, 4),
      anotacion('c', 4, 99),
    ]);
    expect(segmentos.map(s => [s.texto, s.anotacion?.id ?? null])).toEqual([
      ['abc', 'a'],
      ['def', null],
    ]);
  });
});
