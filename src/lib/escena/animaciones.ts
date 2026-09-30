import { type EstadoNpc } from '@/lib/conversacion/estados-npc';
import { type Escena } from '@/schemas/escena.schema';

/** Duración del fundido entre animaciones (HU-15 · T02). */
export const DURACION_FUNDIDO_S = 0.3;

type FaseAnimacion = keyof Escena['npc']['animaciones'];

/** Fase de animación que corresponde a cada estado del paciente (HU-14 · T03). */
export function faseAnimacion(estado: EstadoNpc): FaseAnimacion {
  if (estado === 'procesando') return 'pensando';
  if (estado === 'respondiendo') return 'hablando';
  return 'idle';
}

export interface PoseProcedural {
  /** Inclinación de la cabeza hacia abajo (rad). */
  cabeceo: number;
  /** Giro de la cabeza hacia los lados (rad). */
  giro: number;
  /** Ladeo de la cabeza (rad). */
  ladeo: number;
  /** Apertura de la boca, de 0 a 1. */
  boca: number;
  /** Periodo de la respiración (s): más lento al reflexionar. */
  periodoRespiracion: number;
}

const GIRO_MAXIMO = 0.6;
const CABECEO_MAXIMO = 0.25;

function limitar(valor: number, maximo: number) {
  return Math.max(-maximo, Math.min(maximo, valor));
}

/**
 * HU-11 · T03 y HU-15 · T01/T02 — Pose del paciente procedural según su estado, sin clips de
 * animación:
 * - reposo: respira y sigue con la mirada al estudiante;
 * - `procesando`: respira más despacio, baja y ladea la cabeza (escucha y reflexiona);
 * - `respondiendo`: pequeños asentimientos y movimiento de la boca mientras "habla".
 *
 * `mirada` es la dirección hacia la cámara en el espacio local de la cabeza (rad).
 */
export function poseProcedural(
  estado: EstadoNpc,
  tiempo: number,
  mirada: { giro: number; cabeceo: number }
): PoseProcedural {
  const giroMirada = limitar(mirada.giro, GIRO_MAXIMO);
  const cabeceoMirada = limitar(mirada.cabeceo, CABECEO_MAXIMO);

  switch (faseAnimacion(estado)) {
    case 'pensando':
      return {
        cabeceo: 0.22 + 0.03 * Math.sin(tiempo * 0.8),
        giro: giroMirada * 0.25,
        ladeo: 0.09,
        boca: 0,
        periodoRespiracion: 5.6,
      };
    case 'hablando':
      return {
        cabeceo: cabeceoMirada + 0.035 * Math.sin(tiempo * 8.5),
        giro: giroMirada * 0.8 + 0.03 * Math.sin(tiempo * 2.1),
        ladeo: 0.02 * Math.sin(tiempo * 1.7),
        boca: 0.3 + 0.7 * Math.abs(Math.sin(tiempo * 11)),
        periodoRespiracion: 3.8,
      };
    case 'idle':
      return {
        cabeceo: cabeceoMirada,
        giro: giroMirada * 0.8,
        ladeo: 0,
        boca: 0,
        periodoRespiracion: 4.2,
      };
  }
}

/**
 * Nombre del clip a reproducir para un estado. Si el GLB no trae el clip de esa fase se usa el
 * de reposo y, en último caso, el primero disponible. Devuelve `null` si no hay animaciones.
 */
export function clipParaEstado(
  estado: EstadoNpc,
  disponibles: readonly string[],
  nombres: Escena['npc']['animaciones']
): string | null {
  const preferido = nombres[faseAnimacion(estado)];
  if (disponibles.includes(preferido)) return preferido;
  if (disponibles.includes(nombres.idle)) return nombres.idle;
  return disponibles[0] ?? null;
}
