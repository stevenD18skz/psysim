import { describe, expect, it } from 'vitest';

import { type MensajeConversacion } from '@/types';

import {
  intercalarIntentos,
  intervencionesDe,
  separarIntentos,
  sePuedeReformular,
} from './intentos';

const m = (
  id: string,
  remitente: MensajeConversacion['remitente'],
  descartadoEn?: string
): MensajeConversacion => ({
  id,
  remitente,
  contenido: id,
  timestamp: '2026-10-18T15:00:00.000Z',
  ...(descartadoEn && { descartadoEn }),
});

describe('separarIntentos', () => {
  it('sin descartes, todo es conversación vigente', () => {
    const todos = [m('e1', 'estudiante'), m('p1', 'npc')];
    expect(separarIntentos(todos)).toEqual({ vigentes: todos, intentos: [] });
  });

  it('agrupa el tramo descartado en su posición de la conversación', () => {
    const { vigentes, intentos } = separarIntentos([
      m('e1', 'estudiante'),
      m('p1', 'npc'),
      m('e2', 'estudiante', 'T1'),
      m('p2', 'npc', 'T1'),
      m('e2b', 'estudiante'),
      m('p2b', 'npc'),
    ]);
    expect(vigentes.map(x => x.id)).toEqual(['e1', 'p1', 'e2b', 'p2b']);
    expect(intentos).toEqual([
      {
        posicion: 2,
        mensajes: [expect.objectContaining({ id: 'e2' }), expect.objectContaining({ id: 'p2' })],
      },
    ]);
  });

  it('une en un solo bloque varios intentos en el mismo punto (reformular dos veces)', () => {
    const { intentos } = separarIntentos([
      m('e1', 'estudiante'),
      m('p1', 'npc'),
      m('e2', 'estudiante', 'T1'),
      m('p2', 'npc', 'T1'),
      m('e3', 'estudiante', 'T2'),
      m('p3', 'npc', 'T2'),
      m('e4', 'estudiante'),
    ]);
    expect(intentos).toHaveLength(1);
    expect(intentos[0]!.posicion).toBe(2);
    expect(intervencionesDe(intentos[0]!)).toBe(2);
  });
});

describe('intercalarIntentos', () => {
  it('pone cada intento antes del mensaje vigente que lo siguió, o al final', () => {
    const vigentes = [m('e1', 'estudiante'), m('p1', 'npc')];
    const intentos = [
      { posicion: 0, mensajes: [m('x', 'estudiante', 'T0')] },
      { posicion: 2, mensajes: [m('y', 'estudiante', 'T1')] },
    ];
    expect(
      intercalarIntentos(vigentes, intentos).map(e =>
        e.tipo === 'mensaje' ? e.mensaje.id : `intento@${e.intento.posicion}`
      )
    ).toEqual(['intento@0', 'e1', 'p1', 'intento@2']);
  });
});

describe('sePuedeReformular', () => {
  it('solo intervenciones propias ya guardadas y vigentes', () => {
    expect(sePuedeReformular(m('e1', 'estudiante'))).toBe(true);
    expect(sePuedeReformular(m('p1', 'npc'))).toBe(false);
    expect(sePuedeReformular({ ...m('e2', 'estudiante'), sinGuardar: true })).toBe(false);
    expect(sePuedeReformular(m('e3', 'estudiante', 'T1'))).toBe(false);
  });
});
