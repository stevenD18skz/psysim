import { type EmocionNpc } from '@/lib/conversacion/emociones';

/**
 * Voz inventada de los pacientes (como el "simlish" o el habla de Animal Crossing): no dice
 * palabras, balbucea sílabas con la entonación de la frase mientras el texto aparece en pantalla.
 * Aquí solo se planifica (lógica pura); `MotorAudio` la sintetiza.
 */

/** Voz de un personaje. */
export interface Voz {
  /** Tono fundamental (Hz): más grave en hombres y personas mayores. */
  tono: number;
  /** Multiplicador del ritmo de sílabas (1 = normal, menos = más pausado). */
  ritmo: number;
}

export const VOZ_POR_DEFECTO: Voz = { tono: 180, ritmo: 1 };

/** Una sílaba sintetizada. Tiempos en segundos desde el inicio de la frase. */
export interface Silaba {
  inicio: number;
  duracion: number;
  /** Tono de la sílaba (Hz). */
  tono: number;
  /** Frecuencia del formante de su vocal (Hz): le da el color de "a", "e", "i", "o", "u". */
  formante: number;
  /** De 0 a 1. */
  volumen: number;
}

/** Primer formante aproximado de cada vocal del español, ajustado para sonar claro. */
const FORMANTE: Readonly<Record<string, number>> = {
  a: 900,
  e: 1700,
  i: 2400,
  o: 650,
  u: 450,
};

/** Cómo cambia el habla con la emoción: tono, ritmo y cuánto varía el tono entre sílabas. */
const POR_EMOCION: Readonly<
  Record<EmocionNpc, { tono: number; ritmo: number; variacion: number }>
> = {
  neutral: { tono: 1, ritmo: 1, variacion: 0.08 },
  tranquilo: { tono: 0.97, ritmo: 0.9, variacion: 0.06 },
  aliviado: { tono: 1.03, ritmo: 1, variacion: 0.1 },
  triste: { tono: 0.88, ritmo: 0.75, variacion: 0.04 },
  ansioso: { tono: 1.1, ritmo: 1.25, variacion: 0.14 },
  molesto: { tono: 0.95, ritmo: 1.15, variacion: 0.06 },
  abrumado: { tono: 1.05, ritmo: 1.1, variacion: 0.18 },
};

const PAUSA_CORTA_S = 0.12;
const PAUSA_LARGA_S = 0.25;
/** Duración natural de una sílaba a ritmo 1 (s). */
const SILABA_S = 0.11;
const SILABA_MINIMA_S = 0.07;

type Ficha = { tipo: 'silaba'; vocal: string } | { tipo: 'pausa'; larga: boolean; cierre: string };

/** Sílabas (por grupos de vocales) y pausas (puntuación) del texto. */
function fichas(texto: string): Ficha[] {
  const normal = texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const resultado: Ficha[] = [];
  let enVocal = false;
  for (const caracter of normal) {
    if (caracter in FORMANTE) {
      if (!enVocal) resultado.push({ tipo: 'silaba', vocal: caracter });
      enVocal = true;
      continue;
    }
    enVocal = false;
    const larga = /[.!?…]/.test(caracter);
    if (!larga && !/[,;:]/.test(caracter)) continue;
    // Puntuación seguida ("...", "?!", ".,") es una sola pausa: la más larga, con su cierre.
    const anterior = resultado.at(-1);
    if (anterior?.tipo === 'pausa') {
      if (larga && !anterior.larga) Object.assign(anterior, { larga, cierre: caracter });
      else if (caracter === '?') anterior.cierre = '?';
      continue;
    }
    resultado.push({ tipo: 'pausa', larga, cierre: caracter });
  }
  return resultado;
}

/** Variación determinista entre -1 y 1 (mismo texto, misma melodía; útil para probarla). */
function variacion(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * Planifica el balbuceo de una frase para que dure `duracion` segundos (lo que tarda el texto en
 * aparecer). Si el texto tiene más sílabas de las que caben, se toman de forma pareja: suena a
 * habla rápida, no a ráfaga. La entonación baja al final de una afirmación y sube en una pregunta.
 */
export function planVoz(texto: string, voz: Voz, emocion: EmocionNpc, duracion: number): Silaba[] {
  const estilo = POR_EMOCION[emocion];
  const todas = fichas(texto);
  const pausas = todas.filter(f => f.tipo === 'pausa');
  const tiempoPausas = pausas.reduce((t, p) => t + (p.larga ? PAUSA_LARGA_S : PAUSA_CORTA_S), 0);
  const disponible = Math.max(0, duracion - tiempoPausas);

  let silabas = todas.filter(f => f.tipo === 'silaba');
  const caben = Math.floor(disponible / SILABA_MINIMA_S);
  if (silabas.length === 0 || caben === 0) return [];
  if (silabas.length > caben) {
    const paso = silabas.length / caben;
    const elegidas = new Set(Array.from({ length: caben }, (_, i) => Math.floor(i * paso)));
    silabas = silabas.filter((_, i) => elegidas.has(i));
  }

  const natural = SILABA_S / (voz.ritmo * estilo.ritmo);
  const duracionSilaba = Math.max(SILABA_MINIMA_S, Math.min(natural, disponible / silabas.length));
  const conservar = new Set(silabas);

  const plan: Silaba[] = [];
  let tiempo = 0;
  let indice = 0;
  for (const ficha of todas) {
    if (ficha.tipo === 'pausa') {
      // Entonación de la frase: la última sílaba baja (afirmación) o sube (pregunta).
      const ultima = plan.at(-1);
      if (ultima && ficha.larga) ultima.tono *= ficha.cierre === '?' ? 1.18 : 0.88;
      tiempo += ficha.larga ? PAUSA_LARGA_S : PAUSA_CORTA_S;
      continue;
    }
    if (!conservar.has(ficha)) continue;
    plan.push({
      inicio: tiempo,
      duracion: duracionSilaba * 0.9,
      tono: voz.tono * estilo.tono * (1 + estilo.variacion * variacion(indice)),
      formante: FORMANTE[ficha.vocal]!,
      volumen: 0.85 + 0.15 * variacion(indice + 97),
    });
    tiempo += duracionSilaba;
    indice++;
  }
  // Sin puntuación final, la frase también cae al terminar.
  const ultima = plan.at(-1);
  if (ultima && todas.at(-1)?.tipo !== 'pausa') ultima.tono *= 0.9;
  return plan;
}
