import { type Escena, type Vector3Tuple } from '@/schemas/escena.schema';

type ConfigNpc = Pick<Escena['npc'], 'posicion' | 'rotacion' | 'postura' | 'puntoConversacion'>;

/** Distancia (m) a la que se ubica el estudiante frente al paciente durante la conversación. */
export const DISTANCIA_CONVERSACION = 1.7;
/**
 * Cuánto por debajo de los ojos del paciente apunta la cámara (m). Así su rostro queda en el
 * tercio superior de la pantalla y el panel de conversación (abajo) no lo tapa.
 */
export const DESCENSO_MIRADA = 0.45;
/** Distancia máxima (m, en el plano del suelo) para poder iniciar la conversación. */
export const DISTANCIA_INTERACCION = 3.2;

/** Altura aproximada de los ojos del paciente según su postura. */
export function alturaCabezaNpc(postura: Escena['npc']['postura']): number {
  return postura === 'sentado' ? 1.18 : 1.6;
}

/** Dirección (X, Z) hacia la que mira el paciente: +Z rotado `rotacion` grados sobre Y. */
export function direccionNpc(rotacionGrados: number): [number, number] {
  const radianes = (rotacionGrados * Math.PI) / 180;
  return [Math.sin(radianes), Math.cos(radianes)];
}

/**
 * HU-13 · T01 — Encuadre de la cámara durante la conversación: el estudiante se "sienta"
 * frente al paciente (ojos a 1,25 m si el paciente está sentado) y lo mira ligeramente por
 * debajo de los ojos, para que su rostro quede visible sobre el panel de conversación.
 */
export function encuadreConversacion(npc: ConfigNpc): {
  posicion: Vector3Tuple;
  mirarA: Vector3Tuple;
} {
  const [x, , z] = npc.posicion;
  const alturaCabeza = alturaCabezaNpc(npc.postura);
  const mirarA: Vector3Tuple = [x, alturaCabeza - DESCENSO_MIRADA, z];

  if (npc.puntoConversacion) return { posicion: npc.puntoConversacion, mirarA };

  const [dx, dz] = direccionNpc(npc.rotacion);
  const alturaOjos = npc.postura === 'sentado' ? 1.25 : 1.6;
  return {
    posicion: [x + dx * DISTANCIA_CONVERSACION, alturaOjos, z + dz * DISTANCIA_CONVERSACION],
    mirarA,
  };
}

/** Distancia en el plano del suelo entre dos puntos. */
export function distanciaXZ(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0]! - b[0]!, a[2]! - b[2]!);
}
