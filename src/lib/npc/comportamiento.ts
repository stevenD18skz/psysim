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
 *   emoción ─────────┘   + expresión (postura, mirada, respiración, inquietud, habla, rostro)
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

  // ---------- Rostro (`rostro.ts`) ----------
  /** Altura de las cejas (-1 bajas y tensas … 1 levantadas). */
  cejaAltura: number;
  /** Inclinación de las cejas (1 = extremos internos arriba, preocupación; -1 = ceño). */
  cejaInclinacion: number;
  /** Cuánto se juntan las cejas hacia el entrecejo (0–1). */
  cejaJuntar: number;
  /** Una ceja más alta que la otra (0–1): duda, desconcierto. */
  cejaAsimetria: number;
  /** Curva de la boca (-1 comisuras abajo … 1 sonrisa). */
  sonrisa: number;
  /** Apertura de la boca en reposo (0–1); al hablar se suma la de cada sílaba. */
  bocaApertura: number;
  /** Ancho de la boca (1 = normal; menos = labios apretados, más = estirados por el miedo). */
  bocaAncho: number;
  /** Boca torcida hacia un lado (-1–1), como al pensar. */
  bocaLado: number;
  /** Inclinación de los párpados (1 = caídos hacia fuera, tristeza; -1 = mirada dura). */
  parpadoInclinacion: number;
  /** Color de las mejillas (-1 pálidas … 1 enrojecidas). */
  rubor: number;
  /** Ojos húmedos, con más brillo (0–1). */
  ojosHumedos: number;
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
  cejaAltura: 0,
  cejaInclinacion: 0,
  cejaJuntar: 0,
  cejaAsimetria: 0,
  sonrisa: 0.05,
  bocaApertura: 0,
  bocaAncho: 1,
  bocaLado: 0,
  parpadoInclinacion: 0,
  rubor: 0,
  ojosHumedos: 0,
};

/**
 * Cómo cambian el cuerpo y el rostro con cada emoción (respecto a la expresión neutra). Los
 * gestos faciales siguen las unidades de acción de FACS (Ekman): la tristeza levanta el extremo
 * interno de las cejas y baja las comisuras; el miedo levanta y junta las cejas y estira los
 * labios; el enojo baja y junta las cejas y aprieta los labios.
 */
const POR_EMOCION: Readonly<Record<EmocionNpc, Partial<Expresion>>> = {
  neutral: {},
  tranquilo: {
    encorvado: -0.03,
    periodoRespiracion: 5,
    contactoVisual: 1,
    cejaAltura: 0.05,
    sonrisa: 0.4,
    apertura: 0.92,
  },
  triste: {
    cabeceo: 0.14,
    ladeo: 0.06,
    encorvado: 0.16,
    apertura: 0.6,
    periodoRespiracion: 5.6,
    amplitudRespiracion: 0.028,
    contactoVisual: 0.35,
    cejaInclinacion: 0.85,
    cejaJuntar: 0.4,
    sonrisa: -0.6,
    bocaAncho: 0.9,
    parpadoInclinacion: 0.6,
    rubor: -0.4,
    ojosHumedos: 0.8,
  },
  ansioso: {
    encorvado: 0.05,
    apertura: 1.1,
    periodoRespiracion: 2.2,
    amplitudRespiracion: 0.03,
    inquietud: 1,
    contactoVisual: 0.5,
    cejaAltura: 0.55,
    cejaInclinacion: 0.5,
    cejaJuntar: 0.55,
    sonrisa: -0.2,
    bocaAncho: 1.15,
    bocaApertura: 0.08,
    rubor: 0.25,
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
    cejaAltura: 0.25,
    cejaInclinacion: 0.75,
    cejaJuntar: 0.6,
    sonrisa: -0.4,
    bocaApertura: 0.22,
    parpadoInclinacion: 0.4,
    ojosHumedos: 1,
  },
  molesto: {
    cabeceo: -0.08,
    encorvado: -0.04,
    apertura: 0.72,
    periodoRespiracion: 3.2,
    contactoVisual: 0.9,
    cejaAltura: -0.6,
    cejaInclinacion: -0.85,
    cejaJuntar: 0.85,
    sonrisa: -0.3,
    bocaAncho: 0.78,
    parpadoInclinacion: -0.5,
    rubor: 0.7,
  },
  aliviado: {
    cabeceo: -0.03,
    encorvado: -0.06,
    periodoRespiracion: 5.2,
    amplitudRespiracion: 0.03,
    contactoVisual: 1,
    cejaAltura: 0.15,
    cejaInclinacion: 0.25,
    sonrisa: 0.5,
    bocaApertura: 0.06,
    rubor: 0.15,
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
 * - pensando (`procesando`): desvía la mirada, baja un poco la cabeza y tuerce la boca;
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
      // Piensa: una ceja se levanta y la boca se tuerce hacia un lado.
      return {
        ...e,
        contactoVisual: e.contactoVisual * 0.25,
        cabeceo: e.cabeceo + 0.06,
        cejaAsimetria: 0.6,
        bocaLado: 0.6,
        bocaApertura: 0,
      };
    case 'respondiendo':
      return { ...e, habla: 1, contactoVisual: 0.3 + 0.7 * e.contactoVisual };
    case 'error_comunicacion':
      return { ...e, ladeo: e.ladeo + 0.1, contactoVisual: 0.5, cejaAsimetria: 0.8 };
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
