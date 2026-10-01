/**
 * Acciones de los NPC del laboratorio. Las animaciones vienen dentro de cada GLB (un clip por
 * acción, con estos mismos nombres); aquí solo se definen la etiqueta, el atajo de teclado, si se
 * repite y la frase que dice el personaje al empezarla.
 */

export const ACCIONES_NPC = [
  'idle',
  'walk',
  'run',
  'wave',
  'jump',
  'dance',
  'yes',
  'no',
  'think',
  'celebrate',
  'sleep',
  'sit',
  'bow',
] as const;

export type AccionNpc = (typeof ACCIONES_NPC)[number];

export interface MetaAccion {
  id: AccionNpc;
  etiqueta: string;
  /** Atajo de teclado (tecla mostrada y comparada en mayúsculas). */
  tecla: string;
  /** Se repite en bucle; si no, vuelve a reposo al terminar. */
  bucle: boolean;
  /** Frase que dice al empezar la acción. */
  frase?: string;
  /** Velocidad de desplazamiento (m/s) al pasear en círculo. */
  avance?: number;
}

export const METADATOS_ACCIONES: readonly MetaAccion[] = [
  { id: 'idle', etiqueta: 'Reposo', tecla: '1', bucle: true },
  {
    id: 'walk',
    etiqueta: 'Caminar',
    tecla: '2',
    bucle: true,
    frase: 'Dando un paseo…',
    avance: 0.55,
  },
  { id: 'run', etiqueta: 'Correr', tecla: '3', bucle: true, frase: '¡Voy tarde!', avance: 1.6 },
  { id: 'wave', etiqueta: 'Saludar', tecla: '4', bucle: false, frase: '¡Hola, viajero!' },
  { id: 'jump', etiqueta: 'Saltar', tecla: '5', bucle: false, frase: '¡Hop!' },
  { id: 'dance', etiqueta: 'Bailar', tecla: '6', bucle: true, frase: '♪ la la la ♪' },
  { id: 'yes', etiqueta: 'Asentir', tecla: '7', bucle: false, frase: 'Sí, claro.' },
  { id: 'no', etiqueta: 'Negar', tecla: '8', bucle: false, frase: 'Mmm… no.' },
  { id: 'think', etiqueta: 'Pensar', tecla: '9', bucle: true, frase: 'Déjame pensar…' },
  { id: 'celebrate', etiqueta: 'Celebrar', tecla: '0', bucle: true, frase: '¡Lo logramos!' },
  { id: 'sleep', etiqueta: 'Dormitar', tecla: 'Q', bucle: true, frase: 'Zzz…' },
  { id: 'sit', etiqueta: 'Sentarse', tecla: 'W', bucle: true, frase: 'Qué buen día.' },
  { id: 'bow', etiqueta: 'Reverencia', tecla: 'E', bucle: false, frase: 'A su servicio.' },
];

export function metaAccion(id: AccionNpc): MetaAccion {
  return METADATOS_ACCIONES.find(a => a.id === id)!;
}

export function esAccionNpc(valor: string): valor is AccionNpc {
  return (ACCIONES_NPC as readonly string[]).includes(valor);
}
