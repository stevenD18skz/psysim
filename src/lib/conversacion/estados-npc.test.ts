import { describe, expect, it } from 'vitest';

import { ESTADOS_NPC, esTransicionValida, estaConversando } from './estados-npc';

describe('máquina de estados del NPC (HU-14 · T01)', () => {
  it.each([
    ['inactivo', 'esperando_input'],
    ['esperando_input', 'procesando'],
    ['procesando', 'respondiendo'],
    ['respondiendo', 'esperando_input'],
    ['procesando', 'error_comunicacion'],
    ['error_comunicacion', 'procesando'],
    ['error_comunicacion', 'sesion_finalizada'],
    ['esperando_input', 'inactivo'],
  ] as const)('permite %s → %s', (desde, hacia) => {
    expect(esTransicionValida(desde, hacia)).toBe(true);
  });

  it.each([
    ['procesando', 'procesando'],
    ['inactivo', 'procesando'],
    ['procesando', 'sesion_finalizada'],
    ['respondiendo', 'procesando'],
    ['error_comunicacion', 'esperando_input'],
  ] as const)('rechaza %s → %s', (desde, hacia) => {
    expect(esTransicionValida(desde, hacia)).toBe(false);
  });

  it('sesion_finalizada es un estado terminal', () => {
    for (const hacia of ESTADOS_NPC) {
      expect(esTransicionValida('sesion_finalizada', hacia)).toBe(false);
    }
  });

  it('solo se conversa entre el inicio de la conversación y el cierre', () => {
    expect(estaConversando('inactivo')).toBe(false);
    expect(estaConversando('sesion_finalizada')).toBe(false);
    expect(estaConversando('procesando')).toBe(true);
    expect(estaConversando('error_comunicacion')).toBe(true);
  });
});
