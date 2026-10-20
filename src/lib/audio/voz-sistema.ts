import { type EmocionNpc } from '@/lib/conversacion/emociones';

import { type Voz } from './voz';

/*
 * Voz del sistema: el paciente dice sus respuestas con la síntesis de voz del navegador (Web
 * Speech API), en español. Es opcional frente a la voz inventada: suena más real, pero su calidad
 * depende del sistema operativo y no pasa por el audio espacial de la escena. El texto que se
 * sintetiza es solo la respuesta del paciente.
 */

export type ModoVoz = 'inventada' | 'sistema';

const CLAVE_MODO = 'psysim:voz-paciente';
const oyentes = new Set<() => void>();

/** Preferencias de español, de la más cercana (Colombia) a la más lejana. */
const IDIOMAS = ['es-co', 'es-419', 'es-mx', 'es-us', 'es-ar', 'es-cl', 'es-pe', 'es-es', 'es'];

/** Nombres frecuentes de las voces femeninas y masculinas de Windows, macOS, Android y Chrome. */
const FEMENINAS =
  /sabina|dalia|paloma|helena|laura|salome|elvira|monica|paulina|camila|lucia|ximena|renata|marisol|valentina|elena|google español/i;
const MASCULINAS =
  /raul|jorge|pablo|gonzalo|alvaro|emilio|diego|andres|gerardo|tomas|alonso|juan|carlos|enrique|dario/i;

/** Cómo cambia la voz con la emoción (ritmo y tono relativos). */
const POR_EMOCION: Readonly<Record<EmocionNpc, { ritmo: number; tono: number }>> = {
  neutral: { ritmo: 1, tono: 1 },
  tranquilo: { ritmo: 0.95, tono: 1 },
  aliviado: { ritmo: 1, tono: 1.04 },
  triste: { ritmo: 0.86, tono: 0.92 },
  ansioso: { ritmo: 1.12, tono: 1.08 },
  molesto: { ritmo: 1.05, tono: 0.96 },
  abrumado: { ritmo: 1.06, tono: 1.04 },
};

export function vozSistemaDisponible(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function leerModoVoz(): ModoVoz {
  try {
    return localStorage.getItem(CLAVE_MODO) === 'sistema' && vozSistemaDisponible()
      ? 'sistema'
      : 'inventada';
  } catch {
    return 'inventada';
  }
}

export function guardarModoVoz(modo: ModoVoz) {
  try {
    localStorage.setItem(CLAVE_MODO, modo);
  } catch {
    // Sin almacenamiento: la preferencia dura solo esta visita.
  }
  oyentes.forEach(oyente => oyente());
}

export function suscribirModoVoz(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/**
 * La voz en español que mejor encaja con el personaje: primero el idioma más cercano y luego el
 * género que sugiere su tono (las voces de más de 190 Hz se tratan como femeninas).
 */
export function elegirVoz(
  voces: readonly SpeechSynthesisVoice[],
  voz: Voz
): SpeechSynthesisVoice | null {
  const femenina = voz.tono > 190;
  let mejor: SpeechSynthesisVoice | null = null;
  let mejorPuntaje = -Infinity;
  for (const candidata of voces) {
    const idioma = candidata.lang.toLowerCase().replace('_', '-');
    const posicion = IDIOMAS.findIndex(i => idioma === i || idioma.startsWith(`${i}-`));
    if (posicion === -1) continue;
    const coincide = femenina ? FEMENINAS.test(candidata.name) : MASCULINAS.test(candidata.name);
    const contraria = femenina ? MASCULINAS.test(candidata.name) : FEMENINAS.test(candidata.name);
    const puntaje =
      (IDIOMAS.length - posicion) * 2 +
      (coincide ? 12 : 0) -
      (contraria ? 12 : 0) +
      (candidata.localService ? 1 : 0);
    if (puntaje > mejorPuntaje) {
      mejor = candidata;
      mejorPuntaje = puntaje;
    }
  }
  return mejor;
}

/** Dice la respuesta del paciente. Corta cualquier frase anterior. */
export function hablarConVozSistema(texto: string, voz: Voz, emocion: EmocionNpc) {
  if (!vozSistemaDisponible()) return;
  const sintesis = window.speechSynthesis;
  sintesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  const elegida = elegirVoz(sintesis.getVoices(), voz);
  if (elegida) {
    frase.voice = elegida;
    frase.lang = elegida.lang;
  } else {
    frase.lang = 'es-CO';
  }
  const ajuste = POR_EMOCION[emocion];
  // El ritmo propio del personaje (las personas mayores hablan más despacio) y su emoción.
  frase.rate = Math.min(1.4, Math.max(0.7, ajuste.ritmo * (0.85 + 0.15 * voz.ritmo)));
  frase.pitch = Math.min(1.4, Math.max(0.6, ajuste.tono));
  frase.volume = 0.9;
  sintesis.speak(frase);
}

export function callarVozSistema() {
  if (vozSistemaDisponible()) window.speechSynthesis.cancel();
}
