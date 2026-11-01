import { describe, expect, it } from 'vitest';

import { LIMITES_CHAT } from '@/schemas/npc-chat.schema';

import {
  contarIntervenciones,
  type FilaMensaje,
  historialDesdeFilas,
  MAX_INTERVENCIONES_POR_SESION,
} from './historial';

const fila = (
  remitente: FilaMensaje['remitente'],
  contenido: string,
  descartado_en: string | null = null
): FilaMensaje => ({ remitente, contenido, descartado_en });

describe('historialDesdeFilas (OWASP LLM01: el contexto sale del servidor)', () => {
  it('traduce estudiante→user y npc→assistant en orden', () => {
    expect(historialDesdeFilas([fila('estudiante', 'Hola'), fila('npc', 'Buenas')])).toEqual([
      { rol: 'user', contenido: 'Hola' },
      { rol: 'assistant', contenido: 'Buenas' },
    ]);
  });

  it('descarta lo que el estudiante reformuló', () => {
    const historial = historialDesdeFilas([
      fila('estudiante', 'Vigente'),
      fila('npc', 'Respuesta', null),
      fila('estudiante', 'Descartada', '2026-10-25T10:00:00.000Z'),
      fila('npc', 'Su respuesta', '2026-10-25T10:00:00.000Z'),
    ]);
    expect(historial.map(m => m.contenido)).toEqual(['Vigente', 'Respuesta']);
  });

  it('sin mensajes devuelve un historial vacío', () => {
    expect(historialDesdeFilas([])).toEqual([]);
  });

  it('no supera el máximo de mensajes de contexto: conserva los más recientes', () => {
    const filas = Array.from({ length: LIMITES_CHAT.historial + 10 }, (_, i) =>
      fila(i % 2 === 0 ? 'estudiante' : 'npc', `m${i}`)
    );
    const historial = historialDesdeFilas(filas);
    expect(historial).toHaveLength(LIMITES_CHAT.historial);
    expect(historial.at(-1)?.contenido).toBe(`m${filas.length - 1}`);
  });

  it('no modifica las filas recibidas', () => {
    const filas = Object.freeze([fila('estudiante', 'Hola')]);
    expect(() => historialDesdeFilas(filas)).not.toThrow();
  });
});

describe('contarIntervenciones (OWASP LLM10: consumo sin límite)', () => {
  it('cuenta solo las del estudiante', () => {
    expect(
      contarIntervenciones([fila('estudiante', 'a'), fila('npc', 'b'), fila('estudiante', 'c')])
    ).toBe(2);
  });

  it('cuenta también las reformuladas: ya gastaron cuota de la IA', () => {
    expect(contarIntervenciones([fila('estudiante', 'a', 'x'), fila('estudiante', 'b')])).toBe(2);
  });

  it('el tope por práctica deja margen de sobra para una práctica real', () => {
    expect(MAX_INTERVENCIONES_POR_SESION).toBeGreaterThanOrEqual(60);
    expect(MAX_INTERVENCIONES_POR_SESION).toBeLessThanOrEqual(300);
  });
});
