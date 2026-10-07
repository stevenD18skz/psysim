import { describe, expect, it } from 'vitest';

import { type MensajeConversacion } from '@/types';

import { emocionActual, EMOCIONES_NPC, extraerEmocion } from './emociones';

describe('extraerEmocion', () => {
  it('separa la etiqueta del inicio de la respuesta', () => {
    expect(extraerEmocion('[emocion: triste] No he podido dormir.')).toEqual({
      texto: 'No he podido dormir.',
      emocion: 'triste',
    });
  });

  it('acepta la etiqueta sin prefijo, como suele escribirla el modelo', () => {
    expect(extraerEmocion('[molesto] Uy, son muchas preguntas.')).toEqual({
      texto: 'Uy, son muchas preguntas.',
      emocion: 'molesto',
    });
  });

  it.each([
    ['[Emoción: Abrumada] Es mucho.', 'abrumado'],
    ['[Triste] No sé.', 'triste'],
    ['(emocion = ansiosa) Me sudan las manos.', 'ansioso'],
    ['[EMOCION:molesto] ¿Y eso qué tiene que ver?', 'molesto'],
    ['[emocion: tranquila] Gracias.', 'tranquilo'],
  ] as const)('tolera tildes, mayúsculas y género: %s', (texto, emocion) => {
    expect(extraerEmocion(texto).emocion).toBe(emocion);
  });

  it('quita etiquetas en cualquier posición sin dejar espacios dobles', () => {
    expect(extraerEmocion('Bueno… [emocion: aliviado] la verdad sí.').texto).toBe(
      'Bueno… la verdad sí.'
    );
  });

  it('quita una etiqueta con emoción desconocida y devuelve null', () => {
    expect(extraerEmocion('[emocion: eufórico] ¡Hola!')).toEqual({
      texto: '¡Hola!',
      emocion: null,
    });
  });

  it('sin etiqueta deja el texto igual', () => {
    expect(extraerEmocion('Hola, buenas tardes.')).toEqual({
      texto: 'Hola, buenas tardes.',
      emocion: null,
    });
  });

  it('respeta los corchetes que no son etiquetas', () => {
    expect(extraerEmocion('Me dijo [no recuerdo qué] y me fui.').texto).toBe(
      'Me dijo [no recuerdo qué] y me fui.'
    );
    expect(extraerEmocion('(suspira) Bueno, sí.')).toEqual({
      texto: '(suspira) Bueno, sí.',
      emocion: null,
    });
  });

  it('se queda con la primera emoción reconocida', () => {
    expect(extraerEmocion('[emocion: triste] Sí. [emocion: molesto]').emocion).toBe('triste');
  });
});

describe('emocionActual', () => {
  const mensaje = (
    remitente: MensajeConversacion['remitente'],
    emocion?: MensajeConversacion['emocion']
  ): MensajeConversacion => ({
    id: crypto.randomUUID(),
    remitente,
    contenido: '…',
    timestamp: '2026-10-06T15:00:00.000Z',
    ...(emocion && { emocion }),
  });

  it('es la de la última respuesta del paciente', () => {
    expect(
      emocionActual([mensaje('npc', 'triste'), mensaje('estudiante'), mensaje('npc', 'aliviado')])
    ).toBe('aliviado');
    // Mientras el estudiante escribe, el paciente conserva la emoción de su última respuesta.
    expect(emocionActual([mensaje('npc', 'triste'), mensaje('estudiante')])).toBe('triste');
  });

  it('es neutral sin respuestas o si la respuesta no trae emoción (sesión retomada)', () => {
    expect(emocionActual([])).toBe('neutral');
    expect(emocionActual([mensaje('npc')])).toBe('neutral');
  });

  it('incluye la emoción neutral', () => {
    expect(EMOCIONES_NPC).toContain('neutral');
  });
});
