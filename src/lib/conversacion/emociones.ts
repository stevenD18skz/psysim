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

/**
 * Etiqueta de emoción en cualquier parte del texto: `[triste]`, `[emocion: triste]`,
 * `[Emoción: Abrumada]`, `(emocion = ansioso)`… Se toleran tildes, mayúsculas y el género
 * femenino. Sin el prefijo "emoción", solo se trata como etiqueta si la palabra es una emoción
 * válida: así se respetan los corchetes normales del texto.
 */
const ETIQUETA = /[[(]\s*(emoci[oó]n\s*[:=]\s*)?([^\])\n]{1,30}?)\s*[\])]/giu;

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
 * emoción reconocida o `null`.
 */
export function extraerEmocion(texto: string): { texto: string; emocion: EmocionNpc | null } {
  let emocion: EmocionNpc | null = null;
  const limpio = texto.replace(ETIQUETA, (etiqueta, prefijo: string | undefined, valor: string) => {
    const candidata = normalizar(valor);
    const valida = esEmocionNpc(candidata);
    if (!prefijo && !valida) return etiqueta;
    if (!emocion && valida) emocion = candidata;
    return ' ';
  });
  return { texto: limpio.replace(/[ \t]{2,}/g, ' ').trim(), emocion };
}

/** Emoción vigente del paciente: la de su última respuesta (o neutral si aún no hay). */
export function emocionActual(mensajes: readonly MensajeConversacion[]): EmocionNpc {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const mensaje = mensajes[i]!;
    if (mensaje.remitente === 'npc') return mensaje.emocion ?? 'neutral';
  }
  return 'neutral';
}
