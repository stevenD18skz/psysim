/**
 * Lo que se ve por la ventana del consultorio. Cada práctica sortea un paisaje y un momento del día
 * para que la sala no sea siempre la misma, pero todas las combinaciones son tranquilas: nada de
 * escenas dramáticas, solo luz de mañana, de tarde o de noche sobre una ciudad, un parque, unas
 * montañas o un lago. El clima emocional de la conversación (nubes, lluvia) se suma encima.
 *
 * El momento del día también entra en la sala: la luz de la ventana (la direccional de la escena)
 * se tiñe y se atenúa con él, así una vista de noche no convive con un sol de mediodía en el piso.
 */

export const PAISAJES = ['ciudad', 'parque', 'montanas', 'lago'] as const;
export type Paisaje = (typeof PAISAJES)[number];

export const MOMENTOS = ['manana', 'mediodia', 'tarde', 'atardecer', 'noche'] as const;
export type Momento = (typeof MOMENTOS)[number];

type Rgb = readonly [number, number, number];

/** Parámetros del cielo y de la luz para el shader de la vista (colores en sRGB, de 0 a 1). */
export interface LuzDelMomento {
  cenit: Rgb;
  horizonte: Rgb;
  /**
   * Dirección del sol (o de la luna, de noche), hacia afuera de la ventana. Salvo al mediodía,
   * cerca del centro del cristal: así se alcanza a ver desde el sillón.
   */
  direccionSol: Rgb;
  colorSol: Rgb;
  /** Cuánta luz reciben el suelo, los árboles y los edificios (1 = mediodía). */
  luz: number;
  /** 0 de día, 1 de noche: estrellas, luna, faroles y ventanas encendidas. */
  noche: number;
  /** Cómo entra ese momento en la sala. */
  sala: {
    /** Factor sobre la intensidad de la luz de la ventana (la direccional de la escena). */
    ventana: number;
    /** Color hacia el que se tiñe la luz de la ventana, y cuánto. */
    tinte: string;
    mezcla: number;
    /** Factor sobre la luz ambiental y la del cielo. */
    ambiente: number;
    /** Factor sobre las lámparas: de noche son las que iluminan la sala. */
    lamparas: number;
  };
}

export const LUZ_DEL_MOMENTO: Readonly<Record<Momento, LuzDelMomento>> = {
  manana: {
    cenit: [0.42, 0.64, 0.86],
    horizonte: [0.93, 0.9, 0.86],
    direccionSol: [-0.25, 0.16, -1],
    colorSol: [1, 0.9, 0.78],
    luz: 0.92,
    noche: 0,
    sala: { ventana: 0.9, tinte: '#ffe6cc', mezcla: 0.3, ambiente: 1, lamparas: 1 },
  },
  mediodia: {
    cenit: [0.36, 0.62, 0.85],
    horizonte: [0.8, 0.89, 0.94],
    direccionSol: [0.25, 0.75, -1],
    colorSol: [1, 0.96, 0.88],
    luz: 1,
    noche: 0,
    sala: { ventana: 1, tinte: '#ffffff', mezcla: 0, ambiente: 1, lamparas: 1 },
  },
  tarde: {
    cenit: [0.38, 0.58, 0.8],
    horizonte: [0.96, 0.88, 0.74],
    direccionSol: [0.3, 0.22, -1],
    colorSol: [1, 0.86, 0.62],
    luz: 0.95,
    noche: 0,
    sala: { ventana: 1, tinte: '#ffd9a8', mezcla: 0.35, ambiente: 1, lamparas: 1 },
  },
  atardecer: {
    cenit: [0.3, 0.36, 0.6],
    horizonte: [0.98, 0.66, 0.5],
    direccionSol: [0.2, 0.035, -1],
    colorSol: [1, 0.66, 0.4],
    luz: 0.68,
    noche: 0.25,
    sala: { ventana: 0.7, tinte: '#ffad78', mezcla: 0.6, ambiente: 0.95, lamparas: 1.1 },
  },
  noche: {
    cenit: [0.03, 0.05, 0.12],
    horizonte: [0.12, 0.15, 0.26],
    direccionSol: [-0.18, 0.24, -1],
    colorSol: [0.86, 0.9, 1],
    luz: 0.16,
    noche: 1,
    sala: { ventana: 0.18, tinte: '#a9bde0', mezcla: 0.8, ambiente: 0.85, lamparas: 1.2 },
  },
};

export interface VistaVentana {
  paisaje: Paisaje;
  momento: Momento;
  /** Varía los detalles (dónde caen los árboles, los edificios, las nubes) dentro del paisaje. */
  semilla: number;
}

/** Vista de siempre (la de antes de las variantes): ciudad a media tarde. */
export const VISTA_POR_DEFECTO: Readonly<VistaVentana> = {
  paisaje: 'ciudad',
  momento: 'tarde',
  semilla: 0,
};

const elegir = <T>(opciones: readonly T[], azar: number): T =>
  opciones[Math.min(opciones.length - 1, Math.floor(azar * opciones.length))]!;

/**
 * Sortea la vista de una práctica. `forzada` («lago-noche», «ciudad», «noche») fija el paisaje, el
 * momento o ambos: sirve para revisar cada variante sin depender de la suerte (parámetro
 * `?ventana=` de la simulación). Lo que no se reconoce se ignora.
 */
export function elegirVistaVentana(
  azar: () => number = Math.random,
  forzada?: string | null
): VistaVentana {
  const partes = (forzada ?? '').toLowerCase().split(/[-_,\s]+/);
  const paisajeForzado = PAISAJES.find(p => partes.includes(p));
  const momentoForzado = MOMENTOS.find(m => partes.includes(m));
  return {
    paisaje: paisajeForzado ?? elegir(PAISAJES, azar()),
    momento: momentoForzado ?? elegir(MOMENTOS, azar()),
    semilla: Math.round(azar() * 1000) / 10,
  };
}

/** Índice del paisaje para el shader (un `float` uniforme). */
export const indicePaisaje = (paisaje: Paisaje): number => PAISAJES.indexOf(paisaje);
