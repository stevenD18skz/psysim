import { describe, expect, it } from 'vitest';

import { type EmocionNpc, EMOCIONES_NPC } from '@/lib/conversacion/emociones';
import { type MensajeConversacion } from '@/types';

import { CLIMA_NEUTRO, climaDeConversacion, efectosDeClima } from './clima';

function respuesta(emocion?: EmocionNpc): MensajeConversacion {
  return {
    id: crypto.randomUUID(),
    remitente: 'npc',
    contenido: '…',
    timestamp: '2026-10-06T15:00:00.000Z',
    ...(emocion && { emocion }),
  };
}

const estudiante: MensajeConversacion = { ...respuesta(), remitente: 'estudiante' };

describe('climaDeConversacion', () => {
  it('sin respuestas con emoción el clima es neutro', () => {
    expect(climaDeConversacion([])).toEqual(CLIMA_NEUTRO);
    expect(climaDeConversacion([estudiante, respuesta()])).toEqual(CLIMA_NEUTRO);
  });

  it('una respuesta lo mueve; varias seguidas lo llevan casi al extremo', () => {
    const una = climaDeConversacion([respuesta('abrumado')]);
    const tres = climaDeConversacion([
      respuesta('abrumado'),
      estudiante,
      respuesta('abrumado'),
      respuesta('abrumado'),
    ]);
    expect(una.valencia).toBeLessThan(-0.4);
    expect(tres.valencia).toBeLessThan(una.valencia);
    expect(tres.valencia).toBeLessThan(-0.8);
  });

  it('la reparación aclara el clima de forma gradual, no de golpe', () => {
    const tenso = [respuesta('abrumado'), respuesta('abrumado')];
    const tras = climaDeConversacion([...tenso, respuesta('aliviado')]);
    expect(tras.valencia).toBeGreaterThan(climaDeConversacion(tenso).valencia);
    expect(tras.valencia).toBeLessThan(0.8);
  });
});

describe('efectosDeClima', () => {
  it('el clima neutro deja la escena como está diseñada', () => {
    expect(efectosDeClima(CLIMA_NEUTRO)).toMatchObject({
      calma: 0,
      tension: 0,
      pesadumbre: 0,
      brillo: 1,
      calidez: 0,
      niebla: 0,
      vineta: 0,
      pulso: false,
    });
  });

  it.each(EMOCIONES_NPC)('%s da valores en rango', emocion => {
    const efectos = efectosDeClima(climaDeConversacion([respuesta(emocion), respuesta(emocion)]));
    for (const clave of ['calma', 'tension', 'pesadumbre', 'niebla', 'vineta'] as const) {
      expect(efectos[clave]).toBeGreaterThanOrEqual(0);
      expect(efectos[clave]).toBeLessThanOrEqual(1);
    }
    expect(efectos.brillo).toBeGreaterThan(0.4);
    expect(efectos.brillo).toBeLessThan(1.3);
  });

  const extremo = (emocion: EmocionNpc) =>
    efectosDeClima(climaDeConversacion(Array.from({ length: 6 }, () => respuesta(emocion))));

  it('abrumado: tensión alta, niebla, viñeta que late y luz más tenue y fría', () => {
    const e = extremo('abrumado');
    expect(e.tension).toBeGreaterThan(0.7);
    expect(e.pulso).toBe(true);
    expect(e.niebla).toBeGreaterThan(0.6);
    expect(e.brillo).toBeLessThan(0.75);
    expect(e.calidez).toBeLessThan(0);
  });

  it('triste: pesadumbre (lluvia, luz fría) sin el pulso de la tensión', () => {
    const e = extremo('triste');
    expect(e.pesadumbre).toBeGreaterThan(e.tension);
    expect(e.pulso).toBe(false);
    expect(e.calidez).toBeLessThan(0);
  });

  it('tranquilo y aliviado: calma, luz más cálida y brillante, sin niebla', () => {
    for (const emocion of ['tranquilo', 'aliviado'] as const) {
      const e = extremo(emocion);
      expect(e.calma).toBeGreaterThan(0.4);
      expect(e.brillo).toBeGreaterThan(1);
      expect(e.calidez).toBeGreaterThan(0);
      expect(e.niebla).toBe(0);
    }
  });
});
