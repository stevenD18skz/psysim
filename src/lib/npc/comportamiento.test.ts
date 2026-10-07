import { describe, expect, it } from 'vitest';

import { EMOCIONES_NPC } from '@/lib/conversacion/emociones';
import { ESTADOS_NPC } from '@/lib/conversacion/estados-npc';

import {
  clipEnBucle,
  EXPRESION_NEUTRA,
  expresionPara,
  gestoDeRespuesta,
  gestoDeTransicion,
} from './comportamiento';

describe('expresionPara', () => {
  it.each(ESTADOS_NPC.flatMap(estado => EMOCIONES_NPC.map(emocion => [estado, emocion] as const)))(
    '%s + %s da valores en rango',
    (estado, emocion) => {
      const e = expresionPara(estado, emocion);
      expect(e.contactoVisual).toBeGreaterThanOrEqual(0);
      expect(e.contactoVisual).toBeLessThanOrEqual(1);
      expect(e.apertura).toBeGreaterThan(0.3);
      expect(e.periodoRespiracion).toBeGreaterThan(1);
      expect(Math.abs(e.cabeceo)).toBeLessThan(0.5);
    }
  );

  it('escuchando sin emoción mira al estudiante con la postura neutra', () => {
    expect(expresionPara('esperando_input', 'neutral')).toEqual({
      ...EXPRESION_NEUTRA,
      contactoVisual: 1,
    });
  });

  it('al pensar desvía la mirada y solo habla mientras responde', () => {
    const escuchando = expresionPara('esperando_input', 'neutral');
    const pensando = expresionPara('procesando', 'neutral');
    expect(pensando.contactoVisual).toBeLessThan(escuchando.contactoVisual / 2);
    expect(pensando.habla).toBe(0);
    expect(expresionPara('respondiendo', 'neutral').habla).toBe(1);
  });

  it('abrumado: cabizbajo, encorvado, respiración agitada y sin contacto visual', () => {
    const neutral = expresionPara('esperando_input', 'neutral');
    const abrumado = expresionPara('esperando_input', 'abrumado');
    expect(abrumado.cabeceo).toBeGreaterThan(neutral.cabeceo);
    expect(abrumado.encorvado).toBeGreaterThan(neutral.encorvado);
    expect(abrumado.periodoRespiracion).toBeLessThan(neutral.periodoRespiracion);
    expect(abrumado.contactoVisual).toBeLessThan(0.5);
  });

  it('ansioso se mueve inquieto; triste respira lento con los párpados caídos', () => {
    expect(expresionPara('esperando_input', 'ansioso').inquietud).toBe(1);
    const triste = expresionPara('esperando_input', 'triste');
    expect(triste.apertura).toBeLessThan(1);
    expect(triste.periodoRespiracion).toBeGreaterThan(EXPRESION_NEUTRA.periodoRespiracion);
  });
});

describe('clipEnBucle', () => {
  it('piensa mientras la IA procesa y reposa el resto del tiempo', () => {
    expect(clipEnBucle('procesando')).toBe('think');
    for (const estado of ESTADOS_NPC.filter(e => e !== 'procesando')) {
      expect(clipEnBucle(estado)).toBe('idle');
    }
  });
});

describe('gestoDeTransicion', () => {
  const contexto = { primerEncuentro: false };

  it('saluda la primera vez que el estudiante se sienta frente a él; si vuelve, asiente', () => {
    expect(gestoDeTransicion('inactivo', 'esperando_input', { primerEncuentro: true })).toBe(
      'wave'
    );
    expect(gestoDeTransicion('inactivo', 'esperando_input', contexto)).toBe('yes');
  });

  it('se despide al finalizar la sesión', () => {
    expect(gestoDeTransicion('esperando_input', 'sesion_finalizada', contexto)).toBe('wave');
  });

  it('al empezar a responder asiente o niega según la respuesta', () => {
    expect(
      gestoDeTransicion('procesando', 'respondiendo', { ...contexto, respuesta: 'Sí, eso.' })
    ).toBe('yes');
    expect(
      gestoDeTransicion('procesando', 'respondiendo', { ...contexto, respuesta: 'Pues…' })
    ).toBeNull();
  });

  it('no hace gestos al pensar ni sin cambio de estado', () => {
    expect(gestoDeTransicion('esperando_input', 'procesando', contexto)).toBeNull();
    expect(gestoDeTransicion('procesando', 'procesando', contexto)).toBeNull();
  });
});

describe('gestoDeRespuesta', () => {
  it.each([
    'Sí, la verdad es que sí.',
    '¡Claro! Eso me pasa.',
    '"Exacto", así me siento.',
    'Así es.',
  ])('asiente con "%s"', texto => {
    expect(gestoDeRespuesta(texto)).toBe('yes');
  });

  it.each(['No, no es eso.', 'No quiero hablar de eso.', '¿No? Pues no.'])(
    'niega con "%s"',
    texto => {
      expect(gestoDeRespuesta(texto)).toBe('no');
    }
  );

  it.each(['No sé qué decirle.', 'No me acuerdo bien.', 'Siento que nadie me escucha.', 'Bueno…'])(
    'no gesticula con "%s"',
    texto => {
      expect(gestoDeRespuesta(texto)).toBeNull();
    }
  );
});
