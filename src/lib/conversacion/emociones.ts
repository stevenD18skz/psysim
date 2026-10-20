import { type MensajeConversacion } from '@/types';

/**
 * Emociones que el paciente virtual expresa con el cuerpo (postura, mirada, respiración). La IA
 * elige una en cada respuesta con una etiqueta al inicio del texto (ver `reglas.ts`); el servidor
 * la separa del texto y la escena 3D la convierte en lenguaje no verbal.
 *
 * No se muestran como texto en la interfaz: leer la emoción del paciente es parte de la práctica.
 */
export const EMOCIONES_NPC = [
  'neutral',
  'tranquilo',
  'triste',
  'ansioso',
  'abrumado',
  'molesto',
  'aliviado',
] as const;

export type EmocionNpc = (typeof EMOCIONES_NPC)[number];

export function esEmocionNpc(valor: string): valor is EmocionNpc {
  return (EMOCIONES_NPC as readonly string[]).includes(valor);
}

/** Cuánto se nota la emoción: 1 apenas, 2 claramente, 3 desborda al paciente. */
export type IntensidadEmocion = 1 | 2 | 3;

export const INTENSIDAD_POR_DEFECTO: IntensidadEmocion = 2;

/**
 * Etiqueta de emoción en cualquier parte del texto: `[triste]`, `[triste 2]`, `[emocion: triste]`,
 * `[Emoción: Abrumada · 3]`, `(emocion = ansioso)`… Se toleran tildes, mayúsculas y el género
 * femenino; el número final (1–3) es la intensidad. Sin el prefijo "emoción", solo se trata como
 * etiqueta si la palabra es una emoción válida: así se respetan los corchetes normales del texto.
 */
const ETIQUETA = /[[(]\s*(emoci[oó]n\s*[:=]\s*)?([^\])\n]{1,30}?)\s*[\])]/giu;
const CON_INTENSIDAD = /^(.*?)[\s:,·|/-]*(\d+)$/u;

/** "Abrumada" → "abrumado", "Molésta" → "molesto": normaliza tildes, mayúsculas y género. */
function normalizar(valor: string): string {
  const base = valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  return base.endsWith('a') ? `${base.slice(0, -1)}o` : base;
}

/**
 * Separa la etiqueta de emoción de la respuesta de la IA. Quita todas las etiquetas que haya
 * (aunque la emoción no sea válida) para que nunca lleguen al estudiante, y devuelve la primera
 * emoción reconocida (o `null`) con su intensidad, si la indicó.
 */
export function extraerEmocion(texto: string): {
  texto: string;
  emocion: EmocionNpc | null;
  intensidad: IntensidadEmocion | null;
} {
  let emocion: EmocionNpc | null = null;
  let intensidad: IntensidadEmocion | null = null;
  const limpio = texto.replace(ETIQUETA, (etiqueta, prefijo: string | undefined, valor: string) => {
    const partes = CON_INTENSIDAD.exec(valor.trim());
    const candidata = normalizar(partes ? partes[1]! : valor);
    const valida = esEmocionNpc(candidata);
    if (!prefijo && !valida) return etiqueta;
    if (!emocion && valida) {
      emocion = candidata;
      const numero = partes ? Number(partes[2]) : NaN;
      // Una intensidad fuera de 1–3 se ignora, pero la etiqueta igual se quita del texto.
      if (numero >= 1 && numero <= 3) intensidad = numero as IntensidadEmocion;
    }
    return ' ';
  });
  return { texto: limpio.replace(/[ \t]{2,}/g, ' ').trim(), emocion, intensidad };
}

/** Intensidad vigente: la de la última respuesta del paciente (2 si no la indicó). */
export function intensidadActual(mensajes: readonly MensajeConversacion[]): IntensidadEmocion {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const mensaje = mensajes[i]!;
    if (mensaje.remitente === 'npc') return mensaje.intensidad ?? INTENSIDAD_POR_DEFECTO;
  }
  return INTENSIDAD_POR_DEFECTO;
}

/** Emoción vigente del paciente: la de su última respuesta (o neutral si aún no hay). */
export function emocionActual(mensajes: readonly MensajeConversacion[]): EmocionNpc {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const mensaje = mensajes[i]!;
    if (mensaje.remitente === 'npc') return mensaje.emocion ?? 'neutral';
  }
  return 'neutral';
}
