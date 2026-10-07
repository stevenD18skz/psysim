// @vitest-environment node
// (GLTFLoader comprueba `instanceof ArrayBuffer`, que falla entre el realm de Node y el de jsdom.)

import { type Bone, Quaternion, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { leerGlb } from '../../../test/leer-glb';

import { AnimadorPaciente, type OpcionesAnimador } from './animador-paciente';
import { buscarModeloNpc, urlModeloNpc } from './catalogo';
import { adaptarClipSentado, HUESOS_TREN_INFERIOR } from './postura';
import { RigNpc } from './rig';

const SENTADO: OpcionesAnimador = { postura: 'sentado', alturaAsiento: 0.56 };
/** Cámara del estudiante sentado frente al paciente, a 1,7 m. */
const FRENTE = new Vector3(0, 1.25, 1.7);

const glb = (id = 'rosa') => leerGlb(urlModeloNpc(buscarModeloNpc(id)));

function hueso(animador: AnimadorPaciente, nombre: string): Bone {
  let encontrado: Bone | undefined;
  animador.modelo.traverse(o => {
    if (o.name === nombre && (o as Bone).isBone) encontrado = o as Bone;
  });
  return encontrado!;
}

function alturaDe(animador: AnimadorPaciente, nombre: string): number {
  animador.modelo.updateMatrixWorld(true);
  return hueso(animador, nombre).getWorldPosition(new Vector3()).y;
}

/** Avanza `segundos` en fotogramas de 60 FPS. */
function avanzar(animador: AnimadorPaciente, segundos: number, camara = FRENTE) {
  for (let i = 0; i < Math.round(segundos * 60); i++) animador.avanzar(1 / 60, camara);
}

const desmontar: (() => void)[] = [];
function montar(animador: AnimadorPaciente) {
  desmontar.push(animador.montar());
  return animador;
}
afterEach(() => desmontar.splice(0).forEach(fn => fn()));

describe('postura sentada', () => {
  it('los clips del torso no tocan caderas ni piernas y completan los brazos', async () => {
    const rig = new RigNpc(await glb(), 'test');
    const think = adaptarClipSentado(rig.clips.get('think')!, 'think');
    const huesos = think.tracks.map(p => p.name.split('.')[0]!);
    expect(huesos.some(h => HUESOS_TREN_INFERIOR.has(h))).toBe(false);
    // Al pensar, la mano derecha va al mentón: conserva sus brazos.
    expect(huesos).toContain('foreArm_R');

    const idle = adaptarClipSentado(rig.clips.get('idle')!, 'idle');
    expect(idle.tracks.map(p => p.name)).toEqual(
      expect.arrayContaining(['upperArm_L.quaternion', 'hand_R.quaternion'])
    );
  });

  it.each(['rosa', 'tomas', 'lucia', 'marina', 'leo', 'ernesto'])(
    '%s se sienta sobre el asiento con los ojos a la altura de una persona sentada',
    async id => {
      const animador = montar(new AnimadorPaciente(await glb(id), SENTADO));
      avanzar(animador, 0.5);
      // La cadera queda sobre el cojín (~0,56 m), no en el suelo como en el clip `sit`.
      expect(alturaDe(animador, 'hips')).toBeGreaterThan(0.6);
      expect(alturaDe(animador, 'hips')).toBeLessThan(0.75);
      expect(animador.alturaOjos).toBeGreaterThan(1);
      expect(animador.alturaOjos).toBeLessThan(1.45);
    }
  );

  it('en una silla las piernas cuelgan dobladas', async () => {
    const opciones = { ...SENTADO, alturaAsiento: 0.49 };
    const estiradas = montar(new AnimadorPaciente(await glb('leo'), opciones));
    const dobladas = montar(
      new AnimadorPaciente(await glb('leo'), { ...opciones, piernas: 'dobladas' })
    );
    avanzar(estiradas, 0.2);
    avanzar(dobladas, 0.2);
    expect(alturaDe(dobladas, 'foot_L')).toBeLessThan(alturaDe(estiradas, 'foot_L') - 0.1);
  });

  it('de pie no usa el clip de postura: la cadera queda a la altura de pie', async () => {
    const animador = montar(
      new AnimadorPaciente(await glb('tomas'), { postura: 'de-pie', alturaAsiento: 0 })
    );
    avanzar(animador, 0.5);
    expect(alturaDe(animador, 'hips')).toBeGreaterThan(0.45);
    expect(alturaDe(animador, 'hips')).toBeLessThan(0.6);
  });
});

describe('conducta', () => {
  it('piensa mientras la IA procesa y vuelve al reposo', async () => {
    const animador = montar(new AnimadorPaciente(await glb(), SENTADO));
    expect(animador.accionActual).toBe('idle');

    animador.actualizarConducta('procesando', 'neutral');
    expect(animador.accionActual).toBe('think');
    animador.actualizarConducta('respondiendo', 'triste');
    expect(animador.accionActual).toBe('idle');
  });

  it('un gesto termina y vuelve al bucle del estado, aunque cambie mientras gesticula', async () => {
    const animador = montar(new AnimadorPaciente(await glb(), SENTADO));
    animador.hacerGesto('wave');
    expect(animador.accionActual).toBe('wave');

    // Mientras saluda, el estudiante envía su mensaje: al terminar, pasa a pensar.
    animador.actualizarConducta('procesando', 'neutral');
    expect(animador.accionActual).toBe('wave');
    avanzar(animador, 3);
    expect(animador.accionActual).toBe('think');
  });

  it('ignora gestos que son bucles o que el personaje no trae', async () => {
    const animador = montar(new AnimadorPaciente(await glb(), SENTADO));
    animador.hacerGesto('think');
    animador.hacerGesto('dance');
    expect(animador.accionActual).toBe('idle');
  });
});

describe('capa procedural', () => {
  it('no acumula rotaciones ni escalas fotograma a fotograma', async () => {
    const animador = montar(new AnimadorPaciente(await glb(), SENTADO));
    animador.actualizarConducta('esperando_input', 'abrumado');
    avanzar(animador, 2);
    const cabeza = hueso(animador, 'head').quaternion.clone();
    const ojo = hueso(animador, 'eye_L').scale.y;

    avanzar(animador, 20);
    // Tras 1.200 fotogramas más, la cabeza sigue en una pose parecida (no gira sin control) y
    // los ojos no se cierran del todo por multiplicar su escala una y otra vez.
    expect(hueso(animador, 'head').quaternion.angleTo(cabeza)).toBeLessThan(0.5);
    expect(hueso(animador, 'eye_L').scale.y).toBeGreaterThan(0.05);
    expect(hueso(animador, 'eye_L').scale.y).toBeLessThan(ojo * 3);
  });

  it('gira la cabeza hacia el estudiante cuando lo escucha', async () => {
    const animador = montar(new AnimadorPaciente(await glb(), SENTADO));
    animador.actualizarConducta('esperando_input', 'neutral');

    const giroHacia = (camara: Vector3) => {
      avanzar(animador, 2, camara);
      const q = hueso(animador, 'head').getWorldQuaternion(new Quaternion());
      const frente = new Vector3(0, 0, 1).applyQuaternion(q);
      return Math.atan2(frente.x, frente.z);
    };

    const derecha = giroHacia(new Vector3(1.2, 1.25, 1.2));
    const izquierda = giroHacia(new Vector3(-1.2, 1.25, 1.2));
    expect(derecha).toBeGreaterThan(0.2);
    expect(izquierda).toBeLessThan(-0.2);
  });

  it('cabizbajo cuando está abrumado', async () => {
    const animador = montar(new AnimadorPaciente(await glb(), SENTADO));
    const alturaMirada = (emocion: 'neutral' | 'abrumado') => {
      animador.actualizarConducta('esperando_input', emocion);
      avanzar(animador, 3);
      const q = hueso(animador, 'head').getWorldQuaternion(new Quaternion());
      return new Vector3(0, 0, 1).applyQuaternion(q).y;
    };
    expect(alturaMirada('abrumado')).toBeLessThan(alturaMirada('neutral') - 0.15);
  });
});
