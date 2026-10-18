import { describe, expect, it } from 'vitest';

import { EMOCIONES_NPC } from '@/lib/conversacion/emociones';

import {
  amplitudGestos,
  candidatosGesto,
  type ContextoGesto,
  cortarGesto,
  duracionSostenida,
  elegirGesto,
  elegirSinRepetir,
  envolvente,
  frecuenciaGestos,
  gestoDeEmocion,
  gestoPermitido,
  GESTOS_POR_EMOCION,
  GESTOS_PROCEDURALES,
  gestoTerminado,
  gestoVacio,
  METADATOS_GESTOS,
  pausaEntreGestos,
  pesoDeGesto,
} from './repertorio-gestos';

const CONTEXTO: ContextoGesto = {
  estado: 'esperando_input',
  emocion: 'neutral',
  intensidad: 2,
  escuchando: false,
  sentado: true,
  reducido: false,
  ultimo: null,
};

/** Azar determinista para las pruebas (generador congruencial). */
function azarFijo(semilla = 1) {
  let x = semilla;
  return () => {
    x = (x * 1_103_515_245 + 12_345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

describe('elegirSinRepetir', () => {
  const opciones = [
    { valor: 'a', peso: 1 },
    { valor: 'b', peso: 3 },
  ];

  it('respeta los pesos', () => {
    expect(elegirSinRepetir(opciones, null, 0.1)).toBe('a');
    expect(elegirSinRepetir(opciones, null, 0.5)).toBe('b');
  });

  it('nunca repite el último', () => {
    for (let i = 0; i < 20; i++) expect(elegirSinRepetir(opciones, 'b', i / 20)).toBe('a');
  });

  it('si la única opción es la última, no elige ninguna', () => {
    expect(elegirSinRepetir([{ valor: 'a', peso: 1 }], 'a', 0.5)).toBeNull();
    expect(elegirSinRepetir([], null, 0.5)).toBeNull();
  });
});

describe('elegirGesto', () => {
  it('en una secuencia larga nunca repite dos veces seguidas', () => {
    const azar = azarFijo(7);
    let ultimo: ContextoGesto['ultimo'] = null;
    const vistos = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const gesto = elegirGesto({ ...CONTEXTO, ultimo }, azar());
      expect(gesto).not.toBeNull();
      expect(gesto).not.toBe(ultimo);
      vistos.add(gesto!);
      ultimo = gesto;
    }
    // Varía: usa buena parte del repertorio, no dos gestos alternados.
    expect(vistos.size).toBeGreaterThanOrEqual(5);
  });

  it('con más intensidad, la emoción pesa más frente al reposo', () => {
    const pesoEmocional = (intensidad: 1 | 2 | 3) => {
      const candidatos = candidatosGesto({ ...CONTEXTO, emocion: 'molesto', intensidad });
      const total = candidatos.reduce((s, c) => s + c.peso, 0);
      return candidatos.find(c => c.valor === 'brazos_cruzados')!.peso / total;
    };
    expect(pesoEmocional(3)).toBeGreaterThan(pesoEmocional(2));
    expect(pesoEmocional(2)).toBeGreaterThan(pesoEmocional(1));
  });

  it('pensando o sin conexión no gesticula (el clip de pensar usa los brazos)', () => {
    expect(elegirGesto({ ...CONTEXTO, estado: 'procesando' }, 0.5)).toBeNull();
    expect(elegirGesto({ ...CONTEXTO, estado: 'error_comunicacion' }, 0.5)).toBeNull();
  });

  it('mientras el estudiante escribe no mira por la ventana ni se toca el pelo', () => {
    const candidatos = candidatosGesto({ ...CONTEXTO, escuchando: true }).map(c => c.valor);
    expect(candidatos).not.toContain('mirar_ventana');
    expect(candidatos).not.toContain('tocar_pelo');
    expect(candidatos).toContain('inclinarse');
  });

  it('de pie no usa los gestos del regazo', () => {
    const candidatos = candidatosGesto({ ...CONTEXTO, sentado: false }).map(c => c.valor);
    expect(candidatos).not.toContain('inclinarse');
    expect(candidatos).not.toContain('tocar_ropa');
  });

  it('con movimiento reducido no hay gestos amplios', () => {
    for (const emocion of EMOCIONES_NPC) {
      for (const { valor } of candidatosGesto({ ...CONTEXTO, emocion, reducido: true })) {
        expect(METADATOS_GESTOS[valor].amplio).toBe(false);
      }
    }
  });

  it('no empieza un gesto en una capa ocupada', () => {
    expect(gestoPermitido('mano_al_pecho', { ...CONTEXTO, brazosOcupados: true })).toBe(false);
    expect(gestoPermitido('cambiar_peso', { ...CONTEXTO, brazosOcupados: true })).toBe(true);
    expect(gestoPermitido('cambiar_peso', { ...CONTEXTO, posturaOcupada: true })).toBe(false);
  });
});

describe('gestoDeEmocion', () => {
  it.each([
    ['ansioso', ['frotar_manos', 'entrelazar_manos', 'tocar_pelo', 'cambiar_peso']],
    ['molesto', ['brazos_cruzados', 'cambiar_peso']],
    ['abrumado', ['mano_a_la_frente', 'mano_a_la_cara', 'mirar_suelo']],
    ['triste', ['mano_al_pecho', 'mirar_suelo', 'entrelazar_manos']],
  ] as const)('%s elige uno de sus gestos', (emocion, propios) => {
    for (let i = 0; i < 10; i++) {
      expect(propios).toContain(gestoDeEmocion({ ...CONTEXTO, emocion }, i / 10));
    }
  });

  it('cada gesto de una emoción existe en el catálogo', () => {
    for (const emocion of EMOCIONES_NPC) {
      for (const { gesto } of GESTOS_POR_EMOCION[emocion]) {
        expect(GESTOS_PROCEDURALES).toContain(gesto);
      }
    }
  });
});

describe('intensidad', () => {
  it('escala amplitud y frecuencia; el movimiento reducido las baja', () => {
    expect(amplitudGestos(1)).toBeLessThan(amplitudGestos(2));
    expect(amplitudGestos(2)).toBeLessThan(amplitudGestos(3));
    expect(frecuenciaGestos(3)).toBeGreaterThan(frecuenciaGestos(1));
    expect(amplitudGestos(3, true)).toBeLessThan(amplitudGestos(3));
  });

  it('con más intensidad, gestos más seguidos y más sostenidos', () => {
    expect(pausaEntreGestos('esperando_input', 3, false, 0.5)).toBeLessThan(
      pausaEntreGestos('esperando_input', 1, false, 0.5)
    );
    expect(duracionSostenida('brazos_cruzados', 3, 0.5)).toBeGreaterThan(
      duracionSostenida('brazos_cruzados', 1, 0.5)
    );
  });

  it('las pausas son irregulares y nunca demasiado cortas', () => {
    const pausas = Array.from({ length: 11 }, (_, i) =>
      pausaEntreGestos('respondiendo', 3, false, i / 10)
    );
    expect(Math.min(...pausas)).toBeGreaterThanOrEqual(2.5);
    expect(Math.max(...pausas) / Math.min(...pausas)).toBeGreaterThan(1.8);
    // Hablando gesticula más seguido que escuchando.
    expect(pausaEntreGestos('respondiendo', 2, false, 0.5)).toBeLessThan(
      pausaEntreGestos('esperando_input', 2, false, 0.5)
    );
  });
});

describe('envolvente y gesto en curso', () => {
  it('entra suave, se sostiene y vuelve a 0', () => {
    expect(envolvente(0, 1, 2, 1)).toBe(0);
    expect(envolvente(0.5, 1, 2, 1)).toBeCloseTo(0.5);
    expect(envolvente(2, 1, 2, 1)).toBe(1);
    expect(envolvente(3.5, 1, 2, 1)).toBeCloseTo(0.5);
    expect(envolvente(4, 1, 2, 1)).toBe(0);
    expect(envolvente(10, 1, 2, 1)).toBe(0);
  });

  it('un gesto cortado vuelve al reposo desde donde estaba', () => {
    const g = { ...gestoVacio(), gesto: 'brazos_cruzados' as const, inicio: 0, sostener: 8 };
    const { entrada, salida } = METADATOS_GESTOS.brazos_cruzados;
    cortarGesto(g, entrada / 2);
    expect(g.pesoCorte).toBeCloseTo(0.5);
    expect(pesoDeGesto(g, entrada / 2)).toBeCloseTo(0.5);
    expect(pesoDeGesto(g, entrada / 2 + salida)).toBe(0);
    expect(gestoTerminado(g, entrada / 2 + salida)).toBe(true);
    expect(gestoTerminado(g, entrada / 2 + salida / 2)).toBe(false);
  });

  it('sin gesto, el peso es 0 y ya terminó', () => {
    expect(pesoDeGesto(gestoVacio(), 3)).toBe(0);
    expect(gestoTerminado(gestoVacio(), 3)).toBe(true);
  });
});
