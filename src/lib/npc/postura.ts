import {
  AnimationClip,
  Euler,
  type KeyframeTrack,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
} from 'three';

import { type AccionNpc } from './acciones';
import { type RigNpc } from './rig';

/**
 * Postura sentada de los personajes. Los clips del GLB están pensados de pie (y `sit` es sentado
 * en el suelo), así que para sentarlos en una silla la animación se separa en dos capas que no
 * comparten huesos:
 *
 * - tren inferior (caderas y piernas): un clip fijo de "sentado en silla" (`clipSentado`);
 * - tren superior (torso, cabeza y brazos): los clips de siempre sin sus pistas de piernas
 *   (`adaptarClipSentado`), que se mezclan entre sí sin mover las caderas.
 */

export type Postura = 'sentado' | 'de-pie';
export type Piernas = 'estiradas' | 'dobladas';

export const HUESOS_TREN_INFERIOR: ReadonlySet<string> = new Set([
  'hips',
  'thigh_L',
  'shin_L',
  'foot_L',
  'thigh_R',
  'shin_R',
  'foot_R',
]);

/**
 * Manos apoyadas en los muslos (rotación local de cada hueso). Sentado, reemplaza a los brazos
 * colgando de los clips que no hacen nada especial con ellos, y completa los brazos que un clip
 * no anima (p. ej. el izquierdo al saludar).
 */
const BRAZOS_EN_REGAZO: Readonly<Record<string, Euler>> = {
  upperArm_L: new Euler(-0.25, 0, 0.05),
  foreArm_L: new Euler(-0.4, 0, -0.18),
  hand_L: new Euler(-0.3, 0, 0),
  upperArm_R: new Euler(-0.25, 0, -0.05),
  foreArm_R: new Euler(-0.4, 0, 0.18),
  hand_R: new Euler(-0.3, 0, 0),
};

/** Clips cuyos brazos solo cuelgan: sentado, sus manos quedan en el regazo. */
const CLIPS_CON_MANOS_EN_REGAZO: ReadonlySet<AccionNpc> = new Set(['idle', 'yes']);

/**
 * Flexión de rodillas y tobillos (rad). Los muslos de los personajes son cortos para la
 * profundidad de un sillón: si doblaran las rodillas a 90°, las pantorrillas atravesarían el
 * cojín. Ahí quedan casi estiradas hacia delante, como en el clip `sit`, con los pies asomando
 * por el borde. En una silla, cuyo asiento es poco profundo, cuelgan dobladas.
 */
const FLEXION: Readonly<Record<Piernas, { rodillas: number; tobillos: number }>> = {
  estiradas: { rodillas: 0.22, tobillos: 0.65 },
  dobladas: { rodillas: 1.45, tobillos: 0.15 },
};

function huesoDePista(pista: KeyframeTrack): string {
  return pista.name.slice(0, pista.name.lastIndexOf('.'));
}

function pistaFija(hueso: string, rotacion: Euler, duracion: number): QuaternionKeyframeTrack {
  const q = new Quaternion().setFromEuler(rotacion).toArray();
  return new QuaternionKeyframeTrack(`${hueso}.quaternion`, [0, duracion], [...q, ...q]);
}

/**
 * Clip del tren inferior sentado en una silla cuyo asiento está a `alturaAsiento` metros del
 * suelo (en coordenadas del personaje). Parte del clip `sit` del GLB (sentado en el suelo):
 * conserva sus muslos y su leve balanceo, sube la cadera hasta el asiento y estira o dobla las
 * piernas.
 */
export function clipSentado(
  rig: RigNpc,
  alturaAsiento: number,
  piernas: Piernas = 'estiradas'
): AnimationClip {
  const sit = rig.clips.get('sit');
  const caderas = rig.hueso('hips');
  if (!sit || !caderas?.parent) {
    throw new Error('El personaje no trae el clip "sit" o el hueso "hips".');
  }

  // La posición de la cadera está en el espacio de su padre: convierte metros a sus unidades.
  rig.raiz.updateMatrixWorld(true);
  const escala = caderas.parent.getWorldScale(new Vector3()).y;
  const subida = alturaAsiento / escala;

  const pistas = sit.tracks
    .filter(p => HUESOS_TREN_INFERIOR.has(huesoDePista(p)))
    .map(original => {
      const pista = original.clone();
      if (pista.name === 'hips.position') {
        for (let i = 1; i < pista.values.length; i += 3) pista.values[i]! += subida;
      }
      return pista;
    })
    .filter(p => !/^shin_[LR]\.|^foot_[LR]\./.test(p.name));

  const { rodillas, tobillos } = FLEXION[piernas];
  for (const lado of ['L', 'R'] as const) {
    pistas.push(pistaFija(`shin_${lado}`, new Euler(rodillas, 0, 0), sit.duration));
    pistas.push(pistaFija(`foot_${lado}`, new Euler(tobillos, 0, 0), sit.duration));
  }

  return new AnimationClip('sentado', sit.duration, pistas);
}

/**
 * Versión sentada de un clip del tren superior: sin pistas de caderas ni piernas (las pone
 * `clipSentado`) y con las manos en el regazo donde el clip original solo dejaba colgar los
 * brazos.
 */
export function adaptarClipSentado(clip: AnimationClip, id: AccionNpc): AnimationClip {
  const manosEnRegazo = CLIPS_CON_MANOS_EN_REGAZO.has(id);
  const pistas = clip.tracks.filter(pista => {
    const hueso = huesoDePista(pista);
    if (HUESOS_TREN_INFERIOR.has(hueso)) return false;
    return !(manosEnRegazo && hueso in BRAZOS_EN_REGAZO);
  });

  const animados = new Set(pistas.map(huesoDePista));
  for (const [hueso, rotacion] of Object.entries(BRAZOS_EN_REGAZO)) {
    if (!animados.has(hueso)) pistas.push(pistaFija(hueso, rotacion, clip.duration));
  }

  return new AnimationClip(clip.name, clip.duration, pistas);
}
