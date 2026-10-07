import { type EmocionNpc } from '@/lib/conversacion/emociones';
import { type EstadoNpc } from '@/lib/conversacion/estados-npc';

import { type AccionNpc } from './acciones';

/**
 * Lenguaje no verbal del paciente 3D. Es lógica pura (sin Three.js): decide qué clip suena en
 * bucle, qué gesto hace al cambiar de estado y cómo se ve su cuerpo según la emoción. El
 * `AnimadorPaciente` lo ejecuta.
 *
 *   estado del NPC ─┐
 *                    ├─▶ clip en bucle (reposo / pensar) + gesto puntual (saludar, asentir…)
 *   emoción ─────────┘   + expresión (postura, mirada, respiración, inquietud, habla)
 */

/** Parámetros que la capa procedural aplica sobre los clips del GLB. */
export interface Expresion {
  /** Inclinación de la cabeza hacia abajo (rad; negativo = mentón arriba). */
  cabeceo: number;
  /** Ladeo de la cabeza (rad). */
  ladeo: number;
  /** Encorvamiento del torso hacia delante (rad; negativo = erguido). */
  encorvado: number;
  /** Apertura de los ojos (1 = normal; menos = párpados caídos). */
  apertura: number;
  /** Periodo de la respiración (s): más corto = respiración agitada. */
  periodoRespiracion: number;
  /** Amplitud de la respiración (rad de pecho). */
  amplitudRespiracion: number;
  /** Movimientos nerviosos pequeños (0–1). */
  inquietud: number;
  /** Contacto visual con el estudiante (0 = desvía la mirada, 1 = lo mira). */
  contactoVisual: number;
  /** Cabeceos y balanceo al ritmo de la voz (0–1). */
  habla: number;
}

export const EXPRESION_NEUTRA: Readonly<Expresion> = {
  cabeceo: 0,
  ladeo: 0,
  encorvado: 0,
  apertura: 1,
  periodoRespiracion: 4.2,
  amplitudRespiracion: 0.02,
  inquietud: 0,
  contactoVisual: 0.85,
  habla: 0,
};

/** Cómo cambia el cuerpo con cada emoción (respecto a la expresión neutra). */
const POR_EMOCION: Readonly<Record<EmocionNpc, Partial<Expresion>>> = {
  neutral: {},
  tranquilo: { encorvado: -0.03, periodoRespiracion: 5, contactoVisual: 1 },
  triste: {
    cabeceo: 0.14,
    ladeo: 0.06,
    encorvado: 0.16,
    apertura: 0.6,
    periodoRespiracion: 5.6,
    amplitudRespiracion: 0.028,
    contactoVisual: 0.35,
  },
  ansioso: {
    encorvado: 0.05,
    apertura: 1.1,
    periodoRespiracion: 2.2,
    amplitudRespiracion: 0.03,
    inquietud: 1,
    contactoVisual: 0.5,
  },
  abrumado: {
    cabeceo: 0.18,
    ladeo: -0.08,
    encorvado: 0.24,
    apertura: 0.5,
    periodoRespiracion: 2.4,
    amplitudRespiracion: 0.04,
    inquietud: 0.5,
    contactoVisual: 0.15,
  },
  molesto: {
    cabeceo: -0.08,
    encorvado: -0.04,
    apertura: 0.72,
    periodoRespiracion: 3.2,
    contactoVisual: 0.9,
  },
  aliviado: {
    cabeceo: -0.03,
    encorvado: -0.06,
    periodoRespiracion: 5.2,
    amplitudRespiracion: 0.03,
    contactoVisual: 1,
  },
};

/** Emociones que empiezan con un suspiro (respiración profunda y lenta una vez). */
export const EMOCIONES_CON_SUSPIRO: ReadonlySet<EmocionNpc> = new Set([
  'triste',
  'abrumado',
  'aliviado',
]);

/**
 * Expresión del paciente para un estado de la conversación y una emoción. La emoción da la
 * postura de fondo; el estado ajusta la mirada y el habla:
 * - escuchando (`esperando_input`): busca el contacto visual;
 * - pensando (`procesando`): desvía la mirada y baja un poco la cabeza, como al recordar;
 * - respondiendo: habla mirando al estudiante en la medida en que la emoción lo permite;
 * - sin conexión: ladea la cabeza, desconcertado.
 */
export function expresionPara(estado: EstadoNpc, emocion: EmocionNpc): Expresion {
  const e: Expresion = { ...EXPRESION_NEUTRA, ...POR_EMOCION[emocion] };
  switch (estado) {
    case 'esperando_input':
    case 'sesion_finalizada':
      return { ...e, contactoVisual: Math.min(1, e.contactoVisual + 0.15) };
    case 'procesando':
      return { ...e, contactoVisual: e.contactoVisual * 0.25, cabeceo: e.cabeceo + 0.06 };
    case 'respondiendo':
      return { ...e, habla: 1, contactoVisual: 0.3 + 0.7 * e.contactoVisual };
    case 'error_comunicacion':
      return { ...e, ladeo: e.ladeo + 0.1, contactoVisual: 0.5 };
    case 'inactivo':
      return { ...e, contactoVisual: e.contactoVisual * 0.7 };
  }
}

/** Clip que suena en bucle en cada estado: pensar mientras procesa, reposo el resto. */
export function clipEnBucle(estado: EstadoNpc): AccionNpc {
  return estado === 'procesando' ? 'think' : 'idle';
}

export interface ContextoTransicion {
  /** Aún no hay mensajes: el estudiante recién llega y el paciente lo saluda. */
  primerEncuentro: boolean;
  /** Última respuesta del paciente (para asentir o negar al empezar a hablar). */
  respuesta?: string;
}

/**
 * Gesto puntual al cambiar de estado (o `null`): saluda cuando el estudiante se sienta frente a
 * él por primera vez (si vuelve, asiente), asiente o niega según cómo empieza su respuesta y se
 * despide al finalizar la sesión.
 */
export function gestoDeTransicion(
  desde: EstadoNpc,
  hacia: EstadoNpc,
  { primerEncuentro, respuesta = '' }: ContextoTransicion
): AccionNpc | null {
  if (desde === hacia) return null;
  if (hacia === 'sesion_finalizada') return 'wave';
  if (desde === 'inactivo' && hacia === 'esperando_input') return primerEncuentro ? 'wave' : 'yes';
  if (desde === 'procesando' && hacia === 'respondiendo') return gestoDeRespuesta(respuesta);
  return null;
}

const AFIRMACION = /^(si|claro|exacto|asi es|correcto|tal cual|de acuerdo|cierto|eso es)\b/;
/** "No", "No, no…", "No quiero…"; pero no "No sé" (duda) ni "No me…" (relato). */
const NEGACION = /^no\b(?!\s+(se|me|te|le|lo|la|he|ha|es|era|puedo|tengo|estoy|creo)\b)/;

/** Asiente si la respuesta empieza afirmando y niega si empieza negando. */
export function gestoDeRespuesta(respuesta: string): AccionNpc | null {
  const inicio = respuesta
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/^[\s¿¡"'«“(.…-]+/u, '');
  if (AFIRMACION.test(inicio)) return 'yes';
  if (NEGACION.test(inicio)) return 'no';
  return null;
}
