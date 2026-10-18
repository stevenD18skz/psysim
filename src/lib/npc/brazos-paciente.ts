import { type Bone, MathUtils, Matrix4, Quaternion, SkinnedMesh, Vector3 } from 'three';

import {
  type HuesoReferencia,
  type PoseBrazos,
  type PoseMano,
  POSES_BRAZOS,
  reflejarMano,
  type Tripleta,
} from './poses-gestos';
import { type GestoProcedural } from './repertorio-gestos';
import { type RigNpc } from './rig';

/**
 * Brazos del paciente con cinemática inversa: lleva las manos a puntos de su propio cuerpo (el
 * pecho, la cara, los muslos) y evita que atraviesen el torso, la cabeza, los muslos o la silla.
 *
 * El cuerpo se mide una vez en el GLB: cada vértice pertenece al hueso que más lo mueve. Con
 * ellos se arma, en el espacio local de cada hueso (así siguen al cuerpo en cualquier postura):
 * - un relieve del pecho, del vientre y de los muslos: la superficie de delante (o de arriba, en
 *   los muslos) en una cuadrícula, que dice dónde apoyar la palma y desde dónde empujar;
 * - un elipsoide para la cabeza (cuya caja incluye gorros y peinados, por eso es menor).
 * Las manos y los antebrazos se mantienen fuera; los gestos de contacto apoyan la palma justo en
 * la superficie.
 *
 * En cada fotograma, después del mixer y de la capa procedural del torso:
 * 1. lee dónde dejó el mixer cada brazo (su pose de reposo);
 * 2. si hay gesto, lleva la muñeca por un arco delante del cuerpo desde el reposo hasta la pose
 *    del gesto, según su peso (0–1), y resuelve hombro-codo-muñeca con el codo hacia su polo;
 * 3. empuja fuera de los volúmenes lo que haya quedado dentro y vuelve a resolver;
 * 4. orienta la mano (con límite de muñeca) y mezcla el resultado con la pose del mixer.
 *
 * Sin gesto y con los brazos fuera de los volúmenes, no toca nada. No crea objetos por fotograma.
 */

type Lado = 'L' | 'R';

/**
 * Superficie de un hueso vista desde su +Z local (el pecho y el vientre por delante, los muslos
 * por arriba): la mayor Z de sus vértices en cada celda de una cuadrícula sobre X e Y.
 */
interface Relieve {
  hueso: Bone;
  min: Vector3;
  max: Vector3;
  /** `CELDAS × CELDAS` alturas; -Infinity donde no hay cuerpo. */
  celdas: Float32Array;
  /**
   * Ancho (X local) en que el relieve cuenta para las colisiones. En el pecho y el vientre, solo
   * el frente: en los costados el codo se apoya en el cuerpo, como cualquiera sentado.
   */
  colisionX: readonly [number, number];
}

/** Fracción del ancho del torso que se trata como costado en las colisiones. */
const COSTADO = 0.3;

/** Elipsoide en el espacio local de su hueso (la cabeza). */
interface Elipsoide {
  hueso: Bone;
  centro: Vector3;
  semiejes: Vector3;
}

interface Brazo {
  lado: Lado;
  superior: Bone;
  antebrazo: Bone;
  mano: Bone;
  /**
   * Pose que dejó el mixer en este fotograma (rotaciones locales y posición del hombro). Hay que
   * guardarla: el mixer solo reescribe un hueso cuando su pista cambia de valor, y las manos en
   * el regazo son pistas constantes.
   */
  mixerSuperior: Quaternion;
  mixerAntebrazo: Quaternion;
  mixerMano: Quaternion;
  mixerHombro: Vector3;
  /** Resultado de la cinemática inversa (rotaciones locales). */
  ikSuperior: Quaternion;
  ikAntebrazo: Quaternion;
  ikMano: Quaternion;
}

/** Estado de los brazos que decide `AnimadorPaciente` en cada fotograma. */
export interface EstadoBrazos {
  /** Gesto de brazos en curso (o `null`). */
  gesto: GestoProcedural | null;
  /** Peso del gesto (0–1, ya suavizado por su envolvente). */
  peso: number;
  /** Mano con la que gesticula: 1 la izquierda del personaje, -1 la derecha. */
  lado: 1 | -1;
  /** Escala de la amplitud (intensidad, movimiento reducido). */
  amplitud: number;
  /** Segundos desde que empezó el gesto (para el vaivén). */
  tiempo: number;
  /** 0–1: cuánto mandan los brazos procedurales frente a un clip que los anima (pensar, saludar). */
  disponibles: number;
}

/** Celdas por lado de cada relieve. */
const CELDAS = 12;
/** Semiejes del elipsoide de la cabeza respecto a la mitad de su caja (sin gorro ni peinado). */
const AJUSTE_CABEZA: Tripleta = [0.92, 0.9, 0.92];
/**
 * Muestras para las colisiones: en el brazo (del hombro al codo), el antebrazo (del codo a la
 * muñeca) y la mano (centro y punta). La raíz del brazo no se mira: el hombro está dentro del
 * pecho por construcción.
 */
const MUESTRAS: readonly (readonly ['brazo' | 'antebrazo' | 'mano', number])[] = [
  ['brazo', 0.75],
  ['antebrazo', 0],
  ['antebrazo', 0.3],
  ['antebrazo', 0.6],
  ['antebrazo', 0.9],
  ['mano', 0],
  ['mano', 1],
];
/** Margen (m) por debajo del cual no se corrige nada. */
const TOLERANCIA = 0.004;
const ITERACIONES_COLISION = 6;
/** Giro máximo de la muñeca respecto al antebrazo (rad). */
const MUNECA_MAXIMA = 1.15;
/** Flexión máxima del codo (rad): no más que tocarse el hombro. */
const CODO_MAXIMO = 2.55;
/** Arco (m) con el que la muñeca va del reposo al gesto, por delante y por encima del cuerpo. */
const ARCO = { frente: 0.06, arriba: 0.035 };
/** Tramo inicial del peso en que se mezcla la rotación del mixer con la de la IK. */
const MEZCLA_INICIAL = 0.25;
/** Ancho máximo de los codos respecto a los hombros (m): no chocan con los apoyabrazos. */
const CODO_FUERA = 0.07;

const FRENTE: Tripleta = [0, 0, 1];
const ARRIBA: Tripleta = [0, 1, 0];
/** Codo abajo y algo atrás, si la geometría no indica otro. */
const CODO_POR_DEFECTO: Tripleta = [0, -1, -0.3];
const MUSLOS: readonly ('thigh_L' | 'thigh_R')[] = ['thigh_L', 'thigh_R'];
const CON_RELIEVE: readonly HuesoReferencia[] = ['chest', 'spine', ...MUSLOS];

function suave(x: number): number {
  const t = MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

export class BrazosPaciente {
  private readonly rig: RigNpc;
  private readonly sentado: boolean;
  private readonly brazos: Record<Lado, Brazo>;
  private readonly listaBrazos: readonly Brazo[];
  private readonly pecho: Bone;
  private readonly cabeza: Bone;
  private readonly caderas: Bone;
  /** Relieve de cada hueso de referencia (pecho, vientre, muslos), en su espacio local. */
  private readonly relieves = new Map<HuesoReferencia, Relieve>();
  private readonly cabezaVolumen: Elipsoide | null = null;
  /** Punto medio entre los ojos en el espacio de la cabeza. */
  private readonly ojos = new Vector3();
  /**
   * Medidas de la mano y del antebrazo en su espacio local (cada personaje tiene las suyas: las
   * manos de Tomás casi doblan las de Rosa, y las mangas engrosan el antebrazo): largo y radio de
   * la mano, distancia de la muñeca a su centro y radio del antebrazo.
   */
  private readonly mano: { largo: number; radio: number; centro: number; radioAntebrazo: number };
  /** Poses reflejadas para un zurdo (calculadas una vez). */
  private readonly reflejadas = new Map<GestoProcedural, PoseBrazos>();

  // Temporales (sin objetos nuevos por fotograma).
  private readonly hombro = new Vector3();
  private readonly codo = new Vector3();
  private readonly muneca = new Vector3();
  private readonly codo0 = new Vector3();
  private readonly muneca0 = new Vector3();
  private readonly objetivo = new Vector3();
  private readonly destino = new Vector3();
  private readonly polo = new Vector3();
  private readonly polo0 = new Vector3();
  private readonly dedos = new Vector3();
  private readonly dedos0 = new Vector3();
  private readonly empuje = new Vector3();
  private readonly empujeTotal = new Vector3();
  private readonly empujeCodo = new Vector3();
  private readonly muestra = new Vector3();
  private readonly local = new Vector3();
  private readonly v1 = new Vector3();
  private readonly v2 = new Vector3();
  private readonly v3 = new Vector3();
  private readonly ejeX = new Vector3();
  private readonly ejeY = new Vector3();
  private readonly ejeZ = new Vector3();
  private readonly q1 = new Quaternion();
  private readonly q2 = new Quaternion();
  private readonly qPecho = new Quaternion();
  private readonly qModelo = new Quaternion();
  private readonly qSuperior = new Quaternion();
  private readonly qAntebrazo = new Quaternion();
  private readonly m1 = new Matrix4();
  private readonly inversaModelo = new Matrix4();
  private readonly inversas = new Map<Bone, Matrix4>();
  private escala = 1;
  private codoMinimoY = 0;

  constructor(rig: RigNpc, sentado: boolean) {
    this.rig = rig;
    this.sentado = sentado;
    const hueso = (nombre: string) => {
      const b = rig.hueso(nombre);
      if (!b) throw new Error(`El personaje no tiene el hueso "${nombre}".`);
      return b;
    };
    const brazo = (lado: Lado): Brazo => {
      const superior = hueso(`upperArm_${lado}`);
      const antebrazo = hueso(`foreArm_${lado}`);
      const mano = hueso(`hand_${lado}`);
      return {
        lado,
        superior,
        antebrazo,
        mano,
        mixerSuperior: superior.quaternion.clone(),
        mixerAntebrazo: antebrazo.quaternion.clone(),
        mixerMano: mano.quaternion.clone(),
        mixerHombro: superior.position.clone(),
        ikSuperior: new Quaternion(),
        ikAntebrazo: new Quaternion(),
        ikMano: new Quaternion(),
      };
    };
    this.brazos = { L: brazo('L'), R: brazo('R') };
    this.listaBrazos = [this.brazos.L, this.brazos.R];
    this.pecho = hueso('chest');
    this.cabeza = hueso('head');
    this.caderas = hueso('hips');

    const { mano, cabeza } = this.medirCuerpo();
    this.mano = mano;
    this.cabezaVolumen = cabeza;
    const ojoL = rig.hueso('eye_L');
    const ojoR = rig.hueso('eye_R');
    if (ojoL && ojoR) this.ojos.addVectors(ojoL.position, ojoR.position).multiplyScalar(0.5);
    for (const { hueso: h } of [...this.relieves.values(), ...(cabeza ? [cabeza] : [])]) {
      this.inversas.set(h, new Matrix4());
    }
    for (const [gesto, pose] of Object.entries(POSES_BRAZOS) as [GestoProcedural, PoseBrazos][]) {
      this.reflejadas.set(gesto, {
        ...pose,
        manos: {
          R: pose.manos.L && reflejarMano(pose.manos.L),
          L: pose.manos.R && reflejarMano(pose.manos.R),
        },
      });
    }
  }

  /**
   * Mide el cuerpo en la pose de enlace: los vértices de cada hueso, en su espacio local, arman
   * los relieves y el elipsoide de la cabeza. Devuelve también el largo de la mano.
   */
  private medirCuerpo(): { mano: BrazosPaciente['mano']; cabeza: Elipsoide | null } {
    const conRelieve = new Set<string>(this.sentado ? CON_RELIEVE : ['chest', 'spine']);
    const medidos = new Set<string>([...conRelieve, 'head', 'hand_L', 'foreArm_L']);
    // Dos pasadas: la primera mide las cajas; la segunda llena las cuadrículas.
    const cajas = new Map<string, { min: Vector3; max: Vector3 }>();
    const v = new Vector3();
    const recorrer = (alVertice: (nombre: string, local: Vector3) => void) => {
      for (const malla of this.rig.mallas) {
        if (!(malla instanceof SkinnedMesh)) continue;
        const { position, skinIndex, skinWeight } = malla.geometry.attributes;
        if (!position || !skinIndex || !skinWeight) continue;
        const { bones, boneInverses } = malla.skeleton;
        for (let i = 0; i < position.count; i++) {
          let mejor = 0;
          let indice = 0;
          for (let k = 0; k < 4; k++) {
            const peso = skinWeight.getComponent(i, k);
            if (peso > mejor) {
              mejor = peso;
              indice = skinIndex.getComponent(i, k);
            }
          }
          const nombre = bones[indice]?.name;
          if (!nombre || !medidos.has(nombre)) continue;
          v.fromBufferAttribute(position, i)
            .applyMatrix4(malla.bindMatrix)
            .applyMatrix4(boneInverses[indice]!);
          alVertice(nombre, v);
        }
      }
    };

    recorrer((nombre, local) => {
      const caja = cajas.get(nombre);
      if (!caja) cajas.set(nombre, { min: local.clone(), max: local.clone() });
      else {
        caja.min.min(local);
        caja.max.max(local);
      }
    });

    for (const nombre of conRelieve) {
      const caja = cajas.get(nombre);
      const hueso = this.rig.hueso(nombre);
      if (!caja || !hueso) continue;
      this.relieves.set(nombre as HuesoReferencia, {
        hueso,
        min: caja.min,
        max: caja.max,
        celdas: new Float32Array(CELDAS * CELDAS).fill(-Infinity),
        colisionX: MUSLOS.includes(nombre as 'thigh_L')
          ? [caja.min.x, caja.max.x]
          : [
              MathUtils.lerp(caja.min.x, caja.max.x, COSTADO),
              MathUtils.lerp(caja.max.x, caja.min.x, COSTADO),
            ],
      });
    }
    recorrer((nombre, local) => {
      const relieve = this.relieves.get(nombre as HuesoReferencia);
      if (!relieve) return;
      const i = this.celda(relieve, local.x, 'x');
      const j = this.celda(relieve, local.y, 'y');
      const k = j * CELDAS + i;
      if (local.z > relieve.celdas[k]!) relieve.celdas[k] = local.z;
    });

    const caja = cajas.get('head');
    const cabeza = caja
      ? {
          hueso: this.cabeza,
          centro: new Vector3().addVectors(caja.min, caja.max).multiplyScalar(0.5),
          semiejes: new Vector3()
            .subVectors(caja.max, caja.min)
            .multiplyScalar(0.5)
            .multiply(new Vector3(...AJUSTE_CABEZA)),
        }
      : null;
    // El hueso apunta por -Y: el largo va hacia -Y y el grosor en X y Z.
    const grosor = (caja: { min: Vector3; max: Vector3 }) =>
      (caja.max.x - caja.min.x + caja.max.z - caja.min.z) / 4;
    const mano = cajas.get('hand_L');
    const antebrazo = cajas.get('foreArm_L');
    return {
      mano: {
        largo: mano ? Math.max(0.04, -mano.min.y) : 0.08,
        radio: mano ? grosor(mano) : 0.04,
        centro: mano ? -(mano.min.y + mano.max.y) / 2 : 0.04,
        radioAntebrazo: antebrazo ? grosor(antebrazo) : 0.04,
      },
      cabeza,
    };
  }

  /** Columna (`x`) o fila (`y`) de la cuadrícula del relieve para una coordenada local. */
  private celda(relieve: Relieve, valor: number, eje: 'x' | 'y'): number {
    const f = (valor - relieve.min[eje]) / Math.max(1e-6, relieve.max[eje] - relieve.min[eje]);
    return MathUtils.clamp(Math.floor(f * CELDAS), 0, CELDAS - 1);
  }

  /**
   * Altura del relieve bajo un círculo de radio `r` centrado en (x, y), en el espacio local de su
   * hueso: la mayor de las celdas que toca. -Infinity si ahí no hay cuerpo.
   */
  private superficie(relieve: Relieve, x: number, y: number, r: number): number {
    const { min, max } = relieve;
    if (x < min.x - r || x > max.x + r || y < min.y - r || y > max.y + r) return -Infinity;
    const i0 = this.celda(relieve, x - r, 'x');
    const i1 = this.celda(relieve, x + r, 'x');
    const j0 = this.celda(relieve, y - r, 'y');
    const j1 = this.celda(relieve, y + r, 'y');
    let altura = -Infinity;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) altura = Math.max(altura, relieve.celdas[j * CELDAS + i]!);
    }
    return altura;
  }

  /**
   * Antes de `mixer.update`: devuelve los brazos a la pose que dejó el mixer en el fotograma
   * anterior, para que lo que se les sumó (gesto, ademanes) no se acumule.
   */
  antesDelMixer() {
    for (const brazo of this.listaBrazos) {
      brazo.superior.quaternion.copy(brazo.mixerSuperior);
      brazo.antebrazo.quaternion.copy(brazo.mixerAntebrazo);
      brazo.mano.quaternion.copy(brazo.mixerMano);
      brazo.superior.position.copy(brazo.mixerHombro);
    }
  }

  /** Mueve los brazos según el estado; si no hay gesto, solo evita que atraviesen el cuerpo. */
  aplicar(estado: EstadoBrazos) {
    const pose = estado.gesto ? this.pose(estado.gesto, estado.lado) : null;
    const peso = pose ? estado.peso * estado.disponibles : 0;
    for (const brazo of this.listaBrazos) {
      brazo.mixerSuperior.copy(brazo.superior.quaternion);
      brazo.mixerAntebrazo.copy(brazo.antebrazo.quaternion);
      brazo.mixerMano.copy(brazo.mano.quaternion);
      brazo.mixerHombro.copy(brazo.superior.position);
    }

    if (pose?.hombros && peso > 0) {
      const subida = (pose.hombros * estado.amplitud * peso) / this.pecho.getWorldScale(this.v1).y;
      this.brazos.L.superior.position.y += subida;
      this.brazos.R.superior.position.y += subida;
    }

    this.pecho.updateWorldMatrix(true, true);
    for (const muslo of MUSLOS) this.rig.hueso(muslo)?.updateWorldMatrix(false, false);
    this.escala = this.pecho.getWorldScale(this.v1).x;
    this.rig.raiz.getWorldQuaternion(this.qModelo);
    this.inversaModelo.copy(this.rig.raiz.matrixWorld).invert();
    for (const [hueso, inversa] of this.inversas) inversa.copy(hueso.matrixWorld).invert();
    // La silla: los codos no bajan del asiento.
    this.codoMinimoY = this.sentado
      ? this.caderas.getWorldPosition(this.v1).applyMatrix4(this.inversaModelo).y
      : -Infinity;

    for (const brazo of this.listaBrazos) {
      this.resolverBrazo(brazo, pose?.manos[brazo.lado] ?? null, pose, peso, estado);
    }
  }

  private pose(gesto: GestoProcedural, lado: 1 | -1): PoseBrazos | null {
    return (lado === -1 ? POSES_BRAZOS[gesto] : this.reflejadas.get(gesto)) ?? null;
  }

  private resolverBrazo(
    brazo: Brazo,
    mano: PoseMano | null,
    pose: PoseBrazos | null,
    peso: number,
    estado: EstadoBrazos
  ) {
    brazo.superior.getWorldPosition(this.hombro);
    brazo.antebrazo.getWorldPosition(this.codo0);
    brazo.mano.getWorldPosition(this.muneca0);
    this.direccionHueso(brazo.mano, this.dedos0);

    const largoSuperior = this.hombro.distanceTo(this.codo0);
    const largoAntebrazo = this.codo0.distanceTo(this.muneca0);
    const centroMano = this.mano.centro * this.escala;

    // Polo del reposo: hacia dónde queda el codo respecto a la línea hombro-muñeca.
    this.planoCodo(this.hombro, this.codo0, this.muneca0, this.polo0);

    const activo = mano !== null && peso > 0;
    if (activo) {
      this.puntoDeMano(mano, this.destino);
      this.direccionPersonaje(mano.dedos, this.dedos);
      if (pose?.oscilacion) this.sumarOscilacion(pose, brazo.lado, estado, this.destino);
      // El centro de la mano queda en el punto: la muñeca, un poco antes.
      this.destino.addScaledVector(this.dedos, -centroMano);
      this.direccionPersonaje(mano.codo, this.polo);

      // Arco del reposo al gesto, por delante del cuerpo.
      const s = peso;
      this.objetivo.lerpVectors(this.muneca0, this.destino, s);
      const arco = Math.sin(Math.PI * s) * this.escala;
      this.direccionPersonaje(FRENTE, this.v1);
      this.objetivo.addScaledVector(this.v1, ARCO.frente * arco);
      this.direccionPersonaje(ARRIBA, this.v1);
      this.objetivo.addScaledVector(this.v1, ARCO.arriba * arco);
      this.polo.lerp(this.polo0, 1 - s).normalize();
      this.dedos.lerp(this.dedos0, 1 - s).normalize();
    } else {
      // Sin gesto, el brazo es el del clip: no se corrige (las manos del clip ya rozan el regazo).
      return;
    }

    let corregido = false;
    for (let i = 0; i <= ITERACIONES_COLISION; i++) {
      this.resolverIk(this.hombro, this.objetivo, this.polo, largoSuperior, largoAntebrazo);
      if (i === ITERACIONES_COLISION) break;
      const profundidad = this.penetracion(this.empujeTotal, this.empujeCodo);
      if (profundidad < TOLERANCIA * this.escala) break;
      // La mano sale de la superficie; si lo que choca es el tramo cerca del codo, el codo se
      // abre hacia fuera (el polo gira hacia el empuje).
      // El codo solo gira en torno a la línea hombro-muñeca: para sacarlo hacia delante también
      // se adelanta un poco la mano.
      this.objetivo.add(this.empujeTotal).addScaledVector(this.empujeCodo, 0.6);
      // (El codo gira en torno a la línea hombro-muñeca: desplazarlo d metros es girar el polo
      // unos d / (largo del brazo) radianes.)
      if (this.empujeCodo.lengthSq() > 0) {
        this.polo.addScaledVector(this.empujeCodo, 1.5 / largoSuperior).normalize();
      }
      corregido = true;
    }

    this.orientar(brazo);
    // Mezcla con el mixer: suave al empezar (sin salto) y total cuando hay que corregir.
    const mezcla = activo ? Math.max(suave(peso / MEZCLA_INICIAL), corregido ? 1 : 0) : 1;
    brazo.superior.quaternion.copy(brazo.mixerSuperior).slerp(brazo.ikSuperior, mezcla);
    brazo.antebrazo.quaternion.copy(brazo.mixerAntebrazo).slerp(brazo.ikAntebrazo, mezcla);
    brazo.mano.quaternion.copy(brazo.mixerMano).slerp(brazo.ikMano, mezcla);
  }

  /** Punto (mundo) donde va la palma para una pose de mano. */
  private puntoDeMano(mano: PoseMano, destino: Vector3) {
    const [u, v, w] = mano.punto;
    let hueso: Bone;
    if (mano.referencia === 'ojos') {
      hueso = this.cabeza;
      // Metros a escala 1 = unidades locales de la cabeza.
      destino.set(this.ojos.x + u, this.ojos.y + v, this.ojos.z + w);
    } else {
      hueso = this.rig.hueso(mano.referencia)!;
      const relieve = this.relieves.get(mano.referencia);
      if (relieve) {
        const { min, max } = relieve;
        const x = MathUtils.lerp(min.x, max.x, (u + 1) / 2);
        const y = MathUtils.lerp(min.y, max.y, (v + 1) / 2);
        // Sobre la superficie real en ese punto (no la caja, que incluye broches y solapas).
        const superficie = this.superficie(relieve, x, y, this.mano.radio);
        const z = Number.isFinite(superficie)
          ? superficie
          : MathUtils.lerp(min.z, max.z, (w + 1) / 2);
        destino.set(x, y, z);
      } else {
        destino.set(0, 0, 0);
      }
    }
    hueso.localToWorld(destino);
    // Fuera de la superficie: el grosor de la mano más la separación de la pose.
    hueso.getWorldQuaternion(this.q1);
    this.v2
      .set(...mano.normal)
      .normalize()
      .applyQuaternion(this.q1);
    destino.addScaledVector(
      this.v2,
      this.mano.radio * this.escala + (mano.separacion ?? 0) * this.escala
    );
  }

  private sumarOscilacion(pose: PoseBrazos, lado: Lado, estado: EstadoBrazos, destino: Vector3) {
    const { eje, amplitud, frecuencia, opuesta } = pose.oscilacion!;
    const signo = opuesta && lado === 'L' ? -1 : 1;
    const onda = Math.sin(2 * Math.PI * frecuencia * estado.tiempo);
    this.direccionPersonaje(eje, this.v1);
    destino.addScaledVector(this.v1, signo * onda * amplitud * estado.amplitud * this.escala);
  }

  /** Dirección del espacio del personaje en el mundo (normalizada). */
  private direccionPersonaje([x, y, z]: Tripleta, destino: Vector3) {
    return destino.set(x, y, z).normalize().applyQuaternion(this.qModelo);
  }

  /** Hacia dónde apunta un hueso en el mundo (todos apuntan por su -Y local). */
  private direccionHueso(hueso: Bone, destino: Vector3) {
    hueso.getWorldQuaternion(this.q1);
    return destino.set(0, -1, 0).applyQuaternion(this.q1);
  }

  /** Componente de `codo - hombro` perpendicular a la línea hombro-muñeca (normalizada). */
  private planoCodo(hombro: Vector3, codo: Vector3, muneca: Vector3, destino: Vector3) {
    this.v1.subVectors(muneca, hombro).normalize();
    destino.subVectors(codo, hombro);
    destino.addScaledVector(this.v1, -destino.dot(this.v1));
    if (destino.lengthSq() < 1e-10) this.direccionPersonaje(CODO_POR_DEFECTO, destino);
    return destino.normalize();
  }

  /** Resuelve hombro-codo-muñeca: deja el codo en `this.codo` y la muñeca en `this.muneca`. */
  private resolverIk(hombro: Vector3, objetivo: Vector3, polo: Vector3, l1: number, l2: number) {
    const d = this.v1.subVectors(objetivo, hombro);
    const minimo = Math.sqrt(l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(Math.PI - CODO_MAXIMO));
    const distancia = MathUtils.clamp(d.length(), Math.max(1e-4, minimo), (l1 + l2) * 0.9995);
    d.normalize();
    // Ley del coseno: cuánto avanza el codo sobre la línea y cuánto se aparta hacia el polo.
    const a = (l1 * l1 - l2 * l2 + distancia * distancia) / (2 * distancia);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    this.v2.copy(polo).addScaledVector(d, -polo.dot(d));
    if (this.v2.lengthSq() < 1e-10) this.direccionPersonaje(CODO_POR_DEFECTO, this.v2);
    this.v2.normalize();
    this.codo.copy(hombro).addScaledVector(d, a).addScaledVector(this.v2, h);
    // La silla y los apoyabrazos: el codo no baja del asiento ni se abre de más.
    this.limitarCodo(hombro, l1);
    this.muneca.copy(hombro).addScaledVector(d, distancia);
    // La muñeca, a `l2` del codo en dirección al objetivo.
    this.v3.subVectors(this.muneca, this.codo).normalize();
    this.muneca.copy(this.codo).addScaledVector(this.v3, l2);
  }

  private limitarCodo(hombro: Vector3, l1: number) {
    const local = this.local.copy(this.codo).applyMatrix4(this.inversaModelo);
    const hombroLocal = this.v3.copy(hombro).applyMatrix4(this.inversaModelo);
    const lado = Math.sign(hombroLocal.x) || 1;
    const limiteX = hombroLocal.x + lado * CODO_FUERA;
    let cambio = false;
    if (lado * local.x > lado * limiteX) {
      local.x = limiteX;
      cambio = true;
    }
    if (local.y < this.codoMinimoY + 0.06) {
      local.y = this.codoMinimoY + 0.06;
      cambio = true;
    }
    if (!cambio) return;
    this.codo.copy(local.applyMatrix4(this.rig.raiz.matrixWorld));
    // Mantiene el largo del brazo superior.
    this.v3.subVectors(this.codo, hombro).setLength(l1);
    this.codo.copy(hombro).add(this.v3);
  }

  /**
   * Cuánto se meten el brazo, el antebrazo y la mano en el cuerpo. Devuelve la mayor profundidad
   * y reparte la salida: lo que choca cerca de la mano lo corrige la muñeca (`empuje`) y lo que
   * choca cerca del codo, el codo (`empujeCodo`); a mitad del antebrazo, los dos.
   */
  private penetracion(empuje: Vector3, empujeCodo: Vector3): number {
    empuje.set(0, 0, 0);
    empujeCodo.set(0, 0, 0);
    let maxima = 0;
    let maximaMuneca = 0;
    let maximaCodo = 0;
    const { largo, radio: radioMano, centro, radioAntebrazo } = this.mano;
    for (let i = 0; i < MUESTRAS.length; i++) {
      const [tramo, f] = MUESTRAS[i]!;
      if (tramo === 'brazo') this.muestra.copy(this.hombro).lerp(this.codo, f);
      else if (tramo === 'antebrazo') this.muestra.copy(this.codo).lerp(this.muneca, f);
      else {
        const distancia = f === 0 ? centro : Math.max(centro, largo - radioMano);
        this.muestra.copy(this.muneca).addScaledVector(this.dedos, distancia * this.escala);
      }
      const radio = (tramo === 'mano' ? radioMano : radioAntebrazo) * this.escala;
      // El volumen en que más se mete esta muestra.
      let p = 0;
      for (const relieve of this.relieves.values()) {
        const q = this.dentroDeRelieve(relieve, this.muestra, radio, this.v3);
        if (q > p) {
          p = q;
          this.empuje.copy(this.v3);
        }
      }
      if (this.cabezaVolumen) {
        const q = this.dentroDeElipsoide(this.cabezaVolumen, this.muestra, radio, this.v3);
        if (q > p) {
          p = q;
          this.empuje.copy(this.v3);
        }
      }
      if (p <= 0) continue;
      maxima = Math.max(maxima, p);
      // Cuánto le toca a la muñeca: nada en el brazo, todo en la mano, en proporción entre medias.
      const aMuneca = tramo === 'brazo' ? 0 : tramo === 'mano' ? 1 : f;
      if (p * aMuneca > maximaMuneca) {
        maximaMuneca = p * aMuneca;
        empuje.copy(this.empuje).multiplyScalar(aMuneca);
      }
      if (p * (1 - aMuneca) > maximaCodo) {
        maximaCodo = p * (1 - aMuneca);
        empujeCodo.copy(this.empuje).multiplyScalar(1 - aMuneca);
      }
    }
    return maxima;
  }

  /**
   * Profundidad de una esfera (`punto`, `radio`) bajo la superficie de un relieve y su empuje de
   * salida (hacia el +Z local: adelante del pecho, arriba del muslo). Solo cuenta la mitad de
   * delante: lo que está detrás del cuerpo no se empuja a través de él.
   */
  private dentroDeRelieve(relieve: Relieve, punto: Vector3, radio: number, empuje: Vector3) {
    const local = this.local.copy(punto).applyMatrix4(this.inversas.get(relieve.hueso)!);
    const r = radio / this.escala;
    if (local.x < relieve.colisionX[0] || local.x > relieve.colisionX[1]) return 0;
    // Bajo toda la esfera: conservador (en reposo no se corrige, así que no da falsos choques).
    const superficie = this.superficie(relieve, local.x, local.y, r);
    if (!Number.isFinite(superficie)) return 0;
    const mitad = (relieve.min.z + relieve.max.z) / 2;
    const p = superficie + r - local.z;
    if (p <= 0 || local.z < mitad) return 0;
    relieve.hueso.getWorldQuaternion(this.q2);
    empuje.set(0, 0, p * this.escala).applyQuaternion(this.q2);
    return p * this.escala;
  }

  /** Profundidad de una esfera dentro del elipsoide (ampliado por su radio) y su empuje. */
  private dentroDeElipsoide(elipsoide: Elipsoide, punto: Vector3, radio: number, empuje: Vector3) {
    const local = this.local.copy(punto).applyMatrix4(this.inversas.get(elipsoide.hueso)!);
    const r = radio / this.escala;
    const s = elipsoide.semiejes;
    const q = this.v2.subVectors(local, elipsoide.centro);
    const nx = q.x / (s.x + r);
    const ny = q.y / (s.y + r);
    const nz = q.z / (s.z + r);
    const k = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (k >= 1) return 0;
    // Al borde del elipsoide, en la misma dirección desde su centro (o hacia delante).
    if (k < 1e-3) empuje.set(0, 0, s.z + r);
    else empuje.copy(q).multiplyScalar(1 / k - 1);
    elipsoide.hueso.getWorldQuaternion(this.q2);
    empuje.applyQuaternion(this.q2).multiplyScalar(this.escala);
    return empuje.length();
  }

  /** Rotaciones locales de hombro, codo y muñeca para el codo y la muñeca resueltos. */
  private orientar(brazo: Brazo) {
    const dirSuperior = this.v1.subVectors(this.codo, this.hombro).normalize();
    const dirAntebrazo = this.v2.subVectors(this.muneca, this.codo).normalize();
    // Base del brazo superior: -Y a lo largo del hueso y +Z hacia donde se dobla el antebrazo.
    this.ejeY.copy(dirSuperior).negate();
    this.ejeZ.copy(dirAntebrazo).addScaledVector(dirSuperior, -dirAntebrazo.dot(dirSuperior));
    if (this.ejeZ.lengthSq() < 1e-8) {
      // Brazo estirado: conserva el giro del mixer.
      brazo.superior.parent!.getWorldQuaternion(this.q1);
      this.ejeZ.set(0, 0, 1).applyQuaternion(this.q1.multiply(brazo.mixerSuperior));
      this.ejeZ.addScaledVector(dirSuperior, -this.ejeZ.dot(dirSuperior));
    }
    this.ejeZ.normalize();
    this.ejeX.crossVectors(this.ejeY, this.ejeZ);
    this.m1.makeBasis(this.ejeX, this.ejeY, this.ejeZ);
    this.qSuperior.setFromRotationMatrix(this.m1);

    brazo.superior.parent!.getWorldQuaternion(this.qPecho);
    brazo.ikSuperior.copy(this.qPecho).invert().multiply(this.qSuperior);
    const codo = Math.min(CODO_MAXIMO, dirSuperior.angleTo(dirAntebrazo));
    brazo.ikAntebrazo.setFromAxisAngle(this.ejeX.set(1, 0, 0), -codo);
    this.qAntebrazo.copy(this.qSuperior).multiply(brazo.ikAntebrazo);

    // Mano: de la dirección del antebrazo a la de los dedos, sin pasar del límite de la muñeca.
    this.q1.setFromUnitVectors(dirAntebrazo, this.dedos);
    const giro = 2 * Math.acos(MathUtils.clamp(Math.abs(this.q1.w), 0, 1));
    if (giro > MUNECA_MAXIMA) this.q1.slerp(this.q2.identity(), 1 - MUNECA_MAXIMA / giro);
    // ikMano = qAntebrazo⁻¹ · giro · qAntebrazo
    brazo.ikMano.copy(this.qAntebrazo).invert().multiply(this.q1).multiply(this.qAntebrazo);
  }
}
