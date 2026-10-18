import { type EmocionNpc } from '@/lib/conversacion/emociones';

/**
 * Rellenos conversacionales mientras la IA responde. Las esperas de más de unos 4 s empeoran la
 * experiencia, y lo que ayuda no es un indicador de «pensando…» sino que el personaje se comporte
 * como alguien que piensa: un «mmm…», un suspiro, mirar hacia abajo (Maslych et al., CUI '25;
 * arXiv 2508.11781). El relleno no se guarda: lo reemplaza la respuesta en cuanto llega.
 */

/** Espera tras la que el paciente empieza su relleno (ms). */
export const RETRASO_RELLENO_MS = 3_500;

const RELLENOS: Readonly<Record<EmocionNpc, readonly string[]>> = {
  neutral: ['Mmm…', 'A ver…'],
  tranquilo: ['Mmm, a ver…', 'Déjeme pensar…'],
  triste: ['…', 'Es que…'],
  ansioso: ['Eh… es que…', 'Mmm… no sé cómo decirlo…'],
  abrumado: ['…no sé…', '…'],
  molesto: ['Mmm.', 'Pues…'],
  aliviado: ['Pues…', 'Mmm…'],
};

/** Relleno para la emoción vigente; `turno` varía la frase sin azar (estable en pruebas). */
export function fraseRelleno(emocion: EmocionNpc, turno: number): string {
  const opciones = RELLENOS[emocion];
  return opciones[turno % opciones.length]!;
}

/**
 * Silencio del estudiante frente al paciente (s). Pasado el primero, el paciente se acomoda y lo
 * mira esperando; pasado el segundo, suspira. Practicar el manejo del silencio es parte del caso.
 */
export const SILENCIO_ACOMODARSE_S = 35;
export const SILENCIO_SUSPIRAR_S = 70;
