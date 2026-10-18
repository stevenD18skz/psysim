import { describe, expect, it } from 'vitest';

import { climaDeConversacion } from '@/lib/ambiente/clima';
import { elegirVoz } from '@/lib/audio/voz-sistema';
import { fraseRelleno } from '@/lib/conversacion/relleno';
import { objetivosDePractica } from '@/lib/escenarios/preparacion';
import { type MensajeConversacion } from '@/types';

import {
  EXPRESION_NEUTRA,
  expresionDeEmocion,
  expresionEscuchando,
  expresionPara,
} from './comportamiento';

describe('intensidad de la emoción', () => {
  it('una tristeza intensa se aleja más de la neutra que una leve', () => {
    const leve = expresionDeEmocion('triste', 1);
    const intensa = expresionDeEmocion('triste', 3);
    expect(intensa.encorvado).toBeGreaterThan(leve.encorvado);
    expect(intensa.contactoVisual).toBeLessThan(leve.contactoVisual);
    expect(intensa.sonrisa).toBeLessThan(leve.sonrisa);
  });

  it('la intensidad media es la expresión de siempre y los valores quedan en rango', () => {
    expect(expresionPara('esperando_input', 'ansioso')).toEqual(
      expresionPara('esperando_input', 'ansioso', 2)
    );
    const desbordado = expresionDeEmocion('abrumado', 3);
    expect(desbordado.contactoVisual).toBeGreaterThanOrEqual(0);
    expect(desbordado.ojosHumedos).toBeLessThanOrEqual(1);
    expect(desbordado.apertura).toBeGreaterThanOrEqual(0.3);
  });

  it('la intensidad pesa en el clima del consultorio', () => {
    const respuesta = (intensidad: 1 | 3): MensajeConversacion => ({
      id: 'x',
      remitente: 'npc',
      contenido: '…',
      timestamp: 'T',
      emocion: 'abrumado',
      intensidad,
    });
    expect(climaDeConversacion([respuesta(3)]).valencia).toBeLessThan(
      climaDeConversacion([respuesta(1)]).valencia
    );
  });
});

describe('escucha activa', () => {
  it('mientras el estudiante escribe, el paciente mira más y se aquieta', () => {
    const base = expresionPara('esperando_input', 'ansioso');
    const escuchando = expresionEscuchando(base);
    expect(escuchando.contactoVisual).toBeGreaterThan(base.contactoVisual);
    expect(escuchando.inquietud).toBeLessThan(base.inquietud);
    expect(expresionEscuchando(EXPRESION_NEUTRA).contactoVisual).toBeLessThanOrEqual(1);
  });
});

describe('relleno de la espera', () => {
  it('depende de la emoción y varía entre turnos sin azar', () => {
    expect(fraseRelleno('ansioso', 0)).not.toBe(fraseRelleno('ansioso', 1));
    expect(fraseRelleno('triste', 2)).toBe(fraseRelleno('triste', 0));
  });
});

describe('voz del sistema', () => {
  const voz = (name: string, lang: string, localService = true) =>
    ({ name, lang, localService }) as SpeechSynthesisVoice;

  it('prefiere el español de Colombia y el género que sugiere el tono del personaje', () => {
    const voces = [
      voz('Microsoft Helena - Spanish (Spain)', 'es-ES'),
      voz('Microsoft Salome - Spanish (Colombia)', 'es-CO'),
      voz('Microsoft Gonzalo - Spanish (Colombia)', 'es-CO'),
      voz('Microsoft David - English', 'en-US'),
    ];
    expect(elegirVoz(voces, { tono: 255, ritmo: 1 })?.name).toContain('Salome');
    expect(elegirVoz(voces, { tono: 115, ritmo: 1 })?.name).toContain('Gonzalo');
  });

  it('sin voces en español no elige ninguna', () => {
    expect(elegirVoz([voz('David', 'en-US')], { tono: 150, ritmo: 1 })).toBeNull();
  });
});

describe('preparación previa (INACSL)', () => {
  it('los objetivos incluyen la competencia del caso, el encuadre y el cierre', () => {
    const objetivos = objetivosDePractica('Empatía y validación emocional.', 'clinico');
    expect(objetivos).toHaveLength(4);
    expect(objetivos[2]).toBe('Practicar la competencia del caso: empatía y validación emocional.');
    expect(objetivos[0]).toMatch(/preséntate/);
    expect(objetivos[3]).toMatch(/resumen/);
  });
});
