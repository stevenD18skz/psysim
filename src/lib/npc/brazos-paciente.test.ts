// @vitest-environment node
// (GLTFLoader comprueba `instanceof ArrayBuffer`, que falla entre el realm de Node y el de jsdom.)

import { type Bone, Quaternion, SkinnedMesh, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { leerGlb } from '../../../test/leer-glb';

import { AnimadorPaciente, type OpcionesAnimador } from './animador-paciente';
import { type BrazosPaciente } from './brazos-paciente';
import { buscarModeloNpc, CATALOGO_NPC, urlModeloNpc } from './catalogo';
import { POSES_BRAZOS } from './poses-gestos';
import { type GestoProcedural, METADATOS_GESTOS } from './repertorio-gestos';

const SENTADO: OpcionesAnimador = { postura: 'sentado', alturaAsiento: 0.56 };
const FRENTE = new Vector3(0, 1.25, 1.7);
const GESTOS_DE_BRAZOS = Object.keys(POSES_BRAZOS) as GestoProcedural[];
const HUESOS_BRAZO = ['upperArm_L', 'foreArm_L', 'hand_L', 'upperArm_R', 'foreArm_R', 'hand_R'];

/** Azar determinista: diestro, sin gestos espontáneos al principio. */
function azarFijo(semilla = 3) {
  let x = semilla;
  return () => {
    x = (x * 1_103_515_245 + 12_345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

const glb = (id: string) => leerGlb(urlModeloNpc(buscarModeloNpc(id)));

const desmontar: (() => void)[] = [];
async function paciente(id: string, opciones: Partial<OpcionesAnimador> = {}) {
  const animador = new AnimadorPaciente(await glb(id), {
    ...SENTADO,
    azar: azarFijo(),
    ...opciones,
  });
  desmontar.push(animador.montar());
  animador.permitirGestosEspontaneos(false);
  animador.actualizarConducta('esperando_input', 'neutral');
  return animador;
}
afterEach(() => desmontar.splice(0).forEach(fn => fn()));

function avanzar(animador: AnimadorPaciente, segundos: number) {
  for (let i = 0; i < Math.round(segundos * 60); i++) animador.avanzar(1 / 60, FRENTE);
}

function hueso(animador: AnimadorPaciente, nombre: string): Bone {
  let encontrado: Bone | undefined;
  animador.modelo.traverse(o => {
    if (o.name === nombre && (o as Bone).isBone) encontrado = o as Bone;
  });
  return encontrado!;
}

function poseBrazos(animador: AnimadorPaciente): Quaternion[] {
  return HUESOS_BRAZO.map(n => hueso(animador, n).quaternion.clone());
}

interface Interno {
  dentroDeRelieve: (r: unknown, p: Vector3, radio: number, e: Vector3) => number;
  relieves: Map<string, unknown>;
}

/**
 * Lo más que se mete un vértice de las manos o los antebrazos (en la pose actual, con piel) bajo
 * el relieve del pecho, el vientre o los muslos, en metros.
 */
function penetracionMaxima(animador: AnimadorPaciente, lado: 'L' | 'R'): number {
  const brazos = (animador as unknown as { brazos: BrazosPaciente }).brazos as unknown as Interno;
  // Mismas matrices que usa la IK en el último fotograma.
  animador.modelo.updateMatrixWorld(true);
  const v = new Vector3();
  const empuje = new Vector3();
  let maxima = 0;
  animador.modelo.traverse(objeto => {
    if (!(objeto instanceof SkinnedMesh)) return;
    const { skinIndex, skinWeight, position } = objeto.geometry.attributes;
    for (let i = 0; i < position!.count; i++) {
      let mejor = 0;
      let indice = 0;
      for (let k = 0; k < 4; k++) {
        if (skinWeight!.getComponent(i, k) > mejor) {
          mejor = skinWeight!.getComponent(i, k);
          indice = skinIndex!.getComponent(i, k);
        }
      }
      if (!new RegExp(`^(hand|foreArm)_${lado}$`).test(objeto.skeleton.bones[indice]!.name))
        continue;
      objeto.getVertexPosition(i, v);
      objeto.localToWorld(v);
      for (const relieve of brazos.relieves.values()) {
        maxima = Math.max(maxima, brazos.dentroDeRelieve(relieve, v, 0, empuje));
      }
    }
  });
  return maxima;
}

describe('brazos del paciente', () => {
  it.each(CATALOGO_NPC.map(m => m.id))(
    '%s: en reposo no toca los brazos (manos en el regazo, como el clip)',
    async id => {
      const animador = await paciente(id);
      avanzar(animador, 0.5);
      const antes = poseBrazos(animador);
      avanzar(animador, 2);
      poseBrazos(animador).forEach((q, i) => expect(q.angleTo(antes[i]!)).toBeLessThan(5e-3));
      // Las manos siguen sobre los muslos (el regazo), no colgando.
      expect(hueso(animador, 'hand_L').getWorldPosition(new Vector3()).z).toBeGreaterThan(0.1);
    }
  );

  it.each(CATALOGO_NPC.map(m => m.id))(
    '%s: ningún gesto mete las manos ni los antebrazos en el torso o los muslos',
    async id => {
      // Lo que ya roza el clip en reposo (las manos sobre el regazo) no cuenta. Hasta 4 cm es
      // la manga apoyada contra el cuerpo (en los gestos de contacto los puños rozan el pecho);
      // un antebrazo que atravesara el torso pasaría de 10 cm. Al alisarse la ropa la mano va
      // sobre el regazo y el puño se apoya en la falda: ahí el margen es algo mayor.
      const reposo = await paciente(id);
      avanzar(reposo, 0.5);
      const base = { L: penetracionMaxima(reposo, 'L'), R: penetracionMaxima(reposo, 'R') };
      const margen = (lado: 'L' | 'R', tolerancia: number) =>
        Math.max(base[lado] + 0.003, tolerancia);
      for (const gesto of GESTOS_DE_BRAZOS) {
        const animador = await paciente(id);
        animador.hacerGesto(gesto);
        // En la mitad de la entrada (el arco) y en el máximo.
        avanzar(animador, METADATOS_GESTOS[gesto].entrada / 2);
        for (const lado of ['L', 'R'] as const) {
          expect(penetracionMaxima(animador, lado), `${gesto} ${lado} (entrando)`).toBeLessThan(
            margen(lado, 0.04)
          );
        }
        avanzar(animador, METADATOS_GESTOS[gesto].entrada / 2 + 0.2);
        expect(animador.gestosEnCurso.brazos).toBe(gesto);
        for (const lado of ['L', 'R'] as const) {
          expect(penetracionMaxima(animador, lado), `${gesto} ${lado}`).toBeLessThan(
            margen(lado, gesto === 'tocar_ropa' ? 0.06 : 0.04)
          );
        }
      }
    },
    60_000
  );

  it('la mano al pecho llega al pecho y vuelve sola al reposo', async () => {
    const animador = await paciente('marina');
    avanzar(animador, 0.5);
    const reposo = poseBrazos(animador);
    const pecho = hueso(animador, 'chest').getWorldPosition(new Vector3());

    animador.hacerGesto('mano_al_pecho');
    avanzar(animador, 1.5);
    const mano = hueso(animador, 'hand_R').getWorldPosition(new Vector3());
    // A la altura del pecho, delante de él y cerca del centro.
    expect(Math.abs(mano.y - pecho.y)).toBeLessThan(0.12);
    expect(mano.z).toBeGreaterThan(pecho.z);
    expect(Math.abs(mano.x)).toBeLessThan(0.12);

    avanzar(animador, 6);
    expect(animador.gestosEnCurso.brazos).toBeNull();
    poseBrazos(animador).forEach((q, i) => expect(q.angleTo(reposo[i]!)).toBeLessThan(1e-3));
  });

  it('encogerse sube los hombros y los devuelve', async () => {
    const animador = await paciente('tomas');
    avanzar(animador, 0.5);
    const altura = () => hueso(animador, 'upperArm_L').getWorldPosition(new Vector3()).y;
    const antes = altura();
    animador.hacerGesto('encogerse');
    avanzar(animador, 0.45);
    expect(altura()).toBeGreaterThan(antes + 0.01);
    avanzar(animador, 3);
    // (La respiración mueve los hombros un milímetro.)
    expect(altura()).toBeCloseTo(antes, 2);
  });

  it('un gesto pedido mientras otro ocupa los brazos espera a que vuelvan al reposo', async () => {
    const animador = await paciente('lucia');
    animador.hacerGesto('brazos_cruzados');
    avanzar(animador, 1.5);
    animador.hacerGesto('encogerse');
    // Primero descruza los brazos…
    expect(animador.gestosEnCurso.brazos).toBe('brazos_cruzados');
    avanzar(animador, METADATOS_GESTOS.brazos_cruzados.salida + 0.1);
    // …y luego se encoge.
    expect(animador.gestosEnCurso.brazos).toBe('encogerse');
  });

  it('cede los brazos al clip de pensar', async () => {
    const animador = await paciente('leo');
    animador.hacerGesto('entrelazar_manos');
    avanzar(animador, 1.5);
    animador.actualizarConducta('procesando', 'neutral');
    avanzar(animador, 2);
    expect(animador.accionActual).toBe('think');
    expect(animador.gestosEnCurso.brazos).toBeNull();
  });

  it('con movimiento reducido no hace gestos amplios', async () => {
    const animador = await paciente('rosa', { movimientoReducido: true });
    animador.hacerGesto('brazos_cruzados');
    animador.hacerGesto('mirar_ventana');
    expect(animador.gestosEnCurso).toEqual({ brazos: null, postura: null });
    animador.hacerGesto('frotar_manos');
    expect(animador.gestosEnCurso.brazos).toBe('frotar_manos');
  });

  it('de pie no se inclina sobre las rodillas, pero sí cruza los brazos', async () => {
    const animador = await paciente('tomas', { postura: 'de-pie', alturaAsiento: 0 });
    animador.hacerGesto('inclinarse');
    expect(animador.gestosEnCurso.brazos).toBeNull();
    animador.hacerGesto('brazos_cruzados');
    avanzar(animador, 1.5);
    expect(animador.gestosEnCurso.brazos).toBe('brazos_cruzados');
  });
});

describe('la cara siempre a la vista', () => {
  it('abrumado al máximo, sostener la cabeza o mirar al suelo apenas la baja más', async () => {
    const mirada = async (gesto: GestoProcedural | null) => {
      const animador = await paciente('rosa');
      animador.actualizarConducta('esperando_input', 'abrumado', 3);
      if (gesto) animador.hacerGesto(gesto);
      avanzar(animador, 1.6);
      const q = hueso(animador, 'head').getWorldQuaternion(new Quaternion());
      return new Vector3(0, 0, 1).applyQuaternion(q).y;
    };
    const base = await mirada(null);
    expect(await mirada('mano_a_la_frente')).toBeGreaterThan(base - 0.15);
    expect(await mirada('mirar_suelo')).toBeGreaterThan(base - 0.2);
  });
});

describe('gestos espontáneos', () => {
  it('varía sin repetir el mismo gesto dos veces seguidas', async () => {
    const animador = new AnimadorPaciente(await glb('marina'), { ...SENTADO, azar: azarFijo(11) });
    desmontar.push(animador.montar());
    animador.actualizarConducta('esperando_input', 'ansioso', 3);
    const secuencia: string[] = [];
    for (let i = 0; i < 180 * 10; i++) {
      animador.avanzar(1 / 10, FRENTE);
      const { brazos, postura } = animador.gestosEnCurso;
      for (const gesto of [brazos, postura]) {
        if (gesto && secuencia.at(-1) !== gesto && !secuencia.slice(-2).includes(gesto)) {
          secuencia.push(gesto);
        }
      }
    }
    expect(secuencia.length).toBeGreaterThan(8);
    expect(new Set(secuencia).size).toBeGreaterThanOrEqual(4);
    // Con ansiedad intensa, sobre todo los suyos: frotarse o entrelazar las manos.
    const propios = secuencia.filter(g => g === 'frotar_manos' || g === 'entrelazar_manos');
    expect(propios.length).toBeGreaterThan(secuencia.length / 4);
  });

  it('con una emoción nueva, pronto hace un gesto de esa emoción', async () => {
    const animador = new AnimadorPaciente(await glb('rosa'), { ...SENTADO, azar: azarFijo(5) });
    desmontar.push(animador.montar());
    animador.actualizarConducta('esperando_input', 'neutral');
    avanzar(animador, 1);
    animador.actualizarConducta('esperando_input', 'molesto');
    avanzar(animador, 2.5);
    const { brazos, postura } = animador.gestosEnCurso;
    expect([brazos, postura]).toContainEqual(expect.stringMatching(/brazos_cruzados|cambiar_peso/));
  });
});

describe('al hablar', () => {
  it('se encoge de hombros cuando dice «no sé» a mitad de la frase', async () => {
    const animador = await paciente('lucia');
    animador.actualizarConducta('respondiendo', 'neutral');
    const texto = 'Lo he pensado mucho y la verdad no sé qué hacer con eso.';
    animador.hablar([], texto);
    avanzar(animador, 0.5);
    expect(animador.gestosEnCurso.brazos).toBeNull();
    avanzar(animador, 1);
    expect(animador.gestosEnCurso.brazos).toBe('encogerse');
  });
});
