import { describe, expect, it } from 'vitest';

import { LARGO_MAXIMO_RESPUESTA, limpiarTexto, recortarRespuesta } from './limpieza';

describe('limpiarTexto', () => {
  it.each([
    ['  Hola.  ', 'Hola.'],
    ['"No sé por dónde empezar."', 'No sé por dónde empezar.'],
    ['«Estoy cansada.»', 'Estoy cansada.'],
    ['Marta Lucía: Buenas tardes.', 'Buenas tardes.'],
    ['**Marta Lucía**: Buenas tardes.', 'Buenas tardes.'],
  ])('%j → %j', (entrada, esperado) => {
    expect(limpiarTexto(entrada, 'Marta Lucía')).toBe(esperado);
  });

  it('no altera comillas internas', () => {
    expect(limpiarTexto('Me dijo "tranquila" y se fue.')).toBe('Me dijo "tranquila" y se fue.');
  });
});

describe('recortarRespuesta', () => {
  it('el máximo es el que acepta la columna de la base de datos', () => {
    expect(LARGO_MAXIMO_RESPUESTA).toBe(4000);
  });

  it('no toca una respuesta que cabe', () => {
    expect(recortarRespuesta('Duermo mal.')).toBe('Duermo mal.');
    const justa = 'a'.repeat(LARGO_MAXIMO_RESPUESTA);
    expect(recortarRespuesta(justa)).toBe(justa);
  });

  it('corta en el final de la última frase que cabe', () => {
    const texto = 'Primera frase. Segunda frase, más larga. Tercera que no cabe entera.';
    expect(recortarRespuesta(texto, 45)).toBe('Primera frase. Segunda frase, más larga.');
  });

  it.each(['?', '!', '…'])('reconoce «%s» como final de frase', signo => {
    const texto = `Una pregunta larga${signo} Y lo que sigue ya no cabe.`;
    expect(recortarRespuesta(texto, 30)).toBe(`Una pregunta larga${signo}`);
  });

  it('sin puntuación corta en un espacio y lo marca', () => {
    const recortada = recortarRespuesta('palabra '.repeat(20), 50);
    expect(recortada.endsWith('…')).toBe(true);
    expect(recortada).toBe('palabra palabra palabra palabra palabra palabra…');
  });

  it('un texto sin espacios se corta en el límite', () => {
    const recortada = recortarRespuesta('x'.repeat(100), 20);
    expect(recortada).toBe(`${'x'.repeat(19)}…`);
  });

  it('nunca devuelve más de lo que acepta la base de datos', () => {
    const larga = 'Frase de relleno que se repite. '.repeat(400);
    expect(larga.length).toBeGreaterThan(LARGO_MAXIMO_RESPUESTA);
    const recortada = recortarRespuesta(larga);
    expect(recortada.length).toBeLessThanOrEqual(LARGO_MAXIMO_RESPUESTA);
    expect(recortada.endsWith('.')).toBe(true);
  });
});
