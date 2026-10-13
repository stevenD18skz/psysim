import {
  type Bone,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  type Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Raycaster,
  SkinnedMesh,
  SphereGeometry,
  Vector3,
} from 'three';

import { type Silaba } from '@/lib/audio/voz';

import { type Expresion } from './comportamiento';
import { listaMateriales, type RigNpc } from './rig';

/*
 * Rostro animado del paciente. Los personajes de Claude Design traen ojos (dos óvalos negros con
 * su hueso, que ya parpadean) y una boca fija sin hueso, y no traen cejas. Para que la cara
 * exprese emociones —lo primero que lee un terapeuta— se construye encima, sin modificar el GLB:
 *
 * - cejas: suben, bajan, se inclinan y se juntan;
 * - párpados: casquetes del color de la piel que bajan sobre los ojos y se inclinan;
 * - boca: una cinta que se curva (sonrisa / comisuras abajo), se abre y se redondea con las
 *   vocales de la voz inventada; reemplaza a la boca del modelo, que se esconde;
 * - brillo de los ojos (más húmedos con la tristeza) y rubor de las mejillas.
 *
 * Todo cuelga del hueso de la cabeza (o del de cada ojo), así sigue cualquier clip. Las piezas se
 * colocan en el espacio de la pose de reposo del modelo y se convierten al espacio del hueso con
 * su matriz inversa de enlace: quedan exactamente donde estaría un vértice de la malla.
 */

/** Medidas de un ojo en la pose de reposo (espacio de la geometría). */
interface Ojo {
  hueso: Bone;
  centro: Vector3;
  radio: Vector3;
  /** 1 para el ojo izquierdo del personaje (+X), -1 para el derecho. */
  lado: 1 | -1;
}

interface Ceja {
  pivote: Group;
  malla: Mesh;
  base: Vector3;
  /** Giro en Y para seguir la curva de la frente. */
  giro: number;
  /** Profundidad (z) que la deja a la vista a cada una de las `ALTURAS_CEJA`. */
  profundidades: number[];
}

/** Desplazamientos verticales (m) en los que se mide qué tapa cada ceja. */
const ALTURAS_CEJA = [-0.018, -0.012, -0.006, 0, 0.006, 0.012, 0.018];

/** Interpola linealmente una tabla muestreada en `ALTURAS_CEJA`. */
function profundidadCeja(profundidades: readonly number[], dy: number): number {
  const paso = ALTURAS_CEJA[1]! - ALTURAS_CEJA[0]!;
  const f = MathUtils.clamp((dy - ALTURAS_CEJA[0]!) / paso, 0, ALTURAS_CEJA.length - 1.0001);
  const i = Math.floor(f);
  return MathUtils.lerp(profundidades[i]!, profundidades[i + 1]!, f - i);
}

interface Parpado {
  malla: Mesh;
  lado: 1 | -1;
}

/** Forma de la boca para cada vocal: apertura (0–1), ancho y redondez (labios en "o"). */
const VOCALES: readonly { formante: number; apertura: number; ancho: number; redondez: number }[] =
  [
    { formante: 900, apertura: 1, ancho: 1.05, redondez: 0 }, // a
    { formante: 1700, apertura: 0.55, ancho: 1.12, redondez: 0 }, // e
    { formante: 2400, apertura: 0.32, ancho: 1.18, redondez: 0 }, // i
    { formante: 650, apertura: 0.75, ancho: 0.78, redondez: 1 }, // o
    { formante: 450, apertura: 0.4, ancho: 0.62, redondez: 1 }, // u
  ];

/** Forma de la boca en un instante del habla. */
export interface FormaHabla {
  apertura: number;
  ancho: number;
  redondez: number;
}

export const BOCA_CERRADA: Readonly<FormaHabla> = { apertura: 0, ancho: 1, redondez: 0 };

/**
 * Forma de la boca `t` segundos después de empezar una frase planificada con `planVoz`: cada
 * sílaba abre la boca con la forma de su vocal y la cierra al terminar.
 */
export function formaHabla(silabas: readonly Silaba[], t: number): FormaHabla {
  const silaba = silabas.find(s => t >= s.inicio && t < s.inicio + s.duracion);
  if (!silaba) return BOCA_CERRADA;
  const vocal = VOCALES.reduce((mejor, v) =>
    Math.abs(v.formante - silaba.formante) < Math.abs(mejor.formante - silaba.formante) ? v : mejor
  );
  const envolvente = Math.sin((Math.PI * (t - silaba.inicio)) / silaba.duracion) ** 0.6;
  const k = envolvente * silaba.volumen;
  return {
    apertura: vocal.apertura * k,
    ancho: 1 + (vocal.ancho - 1) * k,
    redondez: vocal.redondez * k,
  };
}

/** Segmentos de la cinta de la boca (más = curva más suave). */
const SEGMENTOS_BOCA = 14;
/** Separación de las piezas respecto de la superficie de la cara (m). */
const SEPARACION = 0.003;

/**
 * Rostro expresivo montado sobre un `RigNpc`. `aplicar` se llama en cada fotograma, después del
 * mixer y de la capa procedural del cuerpo.
 */
export class RostroNpc {
  private readonly grupo = new Group();
  private readonly geometriaCuerpo: BufferGeometry;
  private readonly geometriaOriginal: BufferGeometry;
  private readonly malla: SkinnedMesh;
  private readonly ojos: Ojo[] = [];
  private readonly cejas: Ceja[] = [];
  private readonly parpados: Parpado[] = [];
  private readonly brillos: { principal: Mesh; humedo: Mesh }[] = [];
  private readonly gruposOjos: { grupo: Group; hueso: Bone }[] = [];
  private readonly cabeza: Bone;
  private readonly boca: Mesh;
  private readonly geometriaBoca: BufferGeometry;
  private readonly centroBoca = new Vector3();
  private readonly anchoBoca: number;
  private readonly profundidadBoca: (x: number, y: number) => number;
  private readonly rubor: { material: MeshStandardMaterial; base: Color } | null;
  private readonly piel = new Color();
  private readonly desechables: { dispose(): void }[] = [];
  private readonly color = new Color();

  constructor(rig: RigNpc) {
    // GLTFLoader crea una malla por material (todas comparten los atributos de vértices).
    const mallaDe = (sufijo: string) =>
      rig.mallas.find(m => listaMateriales(m).some(mat => mat.name.endsWith(`_${sufijo}`)));
    const mallaTinta = mallaDe('ink');
    if (!(mallaTinta instanceof SkinnedMesh))
      throw new Error('El personaje no tiene ojos de tinta.');
    const mallaPiel = mallaDe('skin');
    const mallaPelo = mallaDe('hair');
    const material = (malla?: Mesh) => (malla ? listaMateriales(malla)[0] : undefined);
    const tinta = material(mallaTinta);
    const piel = material(mallaPiel);
    const pelo = material(mallaPelo);
    if (piel && 'color' in piel) this.piel.copy(piel.color as Color);

    const malla = mallaTinta;
    this.malla = malla;
    this.geometriaOriginal = malla.geometry;
    // Copia propia: se esconde la boca original sin tocar el GLB en caché (el laboratorio la usa).
    this.geometriaCuerpo = malla.geometry.clone();

    const cabeza = rig.hueso('head');
    if (!cabeza) throw new Error('El personaje no tiene hueso "head".');
    const huesoOjo = { 1: rig.hueso('eye_L'), [-1]: rig.hueso('eye_R') } as const;

    // ---- Medidas a partir de la geometría (pose de reposo) ----
    const verticesTinta = this.verticesUsados();
    const posicion = this.geometriaCuerpo.attributes.position as BufferAttribute;
    const indiceHueso = this.geometriaCuerpo.attributes.skinIndex as BufferAttribute;
    const pesoHueso = this.geometriaCuerpo.attributes.skinWeight as BufferAttribute;
    const huesoDe = (v: number) => {
      let mejor = 0;
      for (let k = 1; k < 4; k++)
        if (pesoHueso.getComponent(v, k) > pesoHueso.getComponent(v, mejor)) mejor = k;
      return malla.skeleton.bones[indiceHueso.getComponent(v, mejor)];
    };

    const punto = new Vector3();
    for (const lado of [1, -1] as const) {
      const hueso = huesoOjo[lado];
      if (!hueso) continue;
      const min = new Vector3(Infinity, Infinity, Infinity);
      const max = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const v of verticesTinta) {
        if (huesoDe(v) !== hueso) continue;
        punto.fromBufferAttribute(posicion, v);
        min.min(punto);
        max.max(punto);
      }
      if (!Number.isFinite(min.x)) continue;
      const centro = this.posicionDeReposo(hueso);
      // Las pestañas (en algunos personajes) sobresalen hacia fuera: el radio se mide hacia dentro.
      const radioX = lado === 1 ? centro.x - min.x : max.x - centro.x;
      centro.y = (min.y + max.y) / 2;
      this.ojos.push({
        hueso,
        centro,
        radio: new Vector3(radioX, (max.y - min.y) / 2, max.z - centro.z),
        lado,
      });
    }
    if (this.ojos.length !== 2) throw new Error('No se encontraron los dos ojos del personaje.');

    // Boca original: los vértices de tinta que cuelgan de la cabeza. Se esconden dentro de ella.
    const minBoca = new Vector3(Infinity, Infinity, Infinity);
    const maxBoca = new Vector3(-Infinity, -Infinity, -Infinity);
    const verticesBoca = verticesTinta.filter(v => huesoDe(v) === cabeza);
    for (const v of verticesBoca) {
      punto.fromBufferAttribute(posicion, v);
      minBoca.min(punto);
      maxBoca.max(punto);
    }
    const ojoDerecho = this.ojos.find(o => o.lado === -1)!;
    if (verticesBoca.length > 0) {
      this.centroBoca.addVectors(minBoca, maxBoca).multiplyScalar(0.5);
      this.anchoBoca = maxBoca.x - minBoca.x;
      for (const v of verticesBoca)
        posicion.setXYZ(v, this.centroBoca.x, this.centroBoca.y, minBoca.z - 0.03);
      posicion.needsUpdate = true;
    } else {
      const ojo = ojoDerecho;
      this.centroBoca.set(0, ojo.centro.y - ojo.radio.y * 3.2, ojo.centro.z);
      this.anchoBoca = ojo.radio.x * 2;
    }

    // Superficie de la cara (piel) y todo lo que hay delante de la frente (flequillo, gafas,
    // gorro), para apoyar las piezas.
    const superficie = this.crearSondaSuperficie([mallaPiel]);
    const mallaRubor = mallaDe('blush');
    const frente = this.crearSondaSuperficie(
      rig.mallas.filter(m => m !== mallaTinta && m !== mallaRubor)
    );
    this.profundidadBoca = this.muestrearCara(superficie, this.centroBoca, this.anchoBoca);

    // ---- Piezas ----
    const enlace = new Matrix4().copy(this.inversaDe(cabeza)).multiply(malla.bindMatrix);
    this.grupo.name = 'rostro';
    this.grupo.matrixAutoUpdate = false;
    this.grupo.matrix.copy(enlace);
    this.cabeza = cabeza;

    const colorTinta = tinta && 'color' in tinta ? (tinta.color as Color) : new Color('#1d1f20');
    const colorCeja =
      pelo && 'color' in pelo ? (pelo.color as Color).clone().lerp(colorTinta, 0.5) : colorTinta;
    const materialCeja = this.desechable(
      new MeshStandardMaterial({ color: colorCeja, roughness: 0.9 })
    );
    const materialTinta = this.desechable(
      new MeshBasicMaterial({
        color: colorTinta,
        side: DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    const materialParpado = this.desechable(
      piel instanceof MeshStandardMaterial
        ? piel.clone()
        : new MeshStandardMaterial({ color: this.piel, roughness: 0.8 })
    );
    const materialBrillo = this.desechable(
      new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false })
    );

    // Cejas: una barra redondeada sobre cada ojo, apoyada en la frente.
    const largoCeja = ojoDerecho.radio.x * 2.1;
    const geometriaCeja = this.desechable(new CapsuleGeometry(0.0055, largoCeja, 4, 10));
    geometriaCeja.rotateZ(Math.PI / 2);
    geometriaCeja.scale(1, 1, 0.55);
    // Nunca más adelante que esto (la visera de una gorra no debe arrastrar las cejas).
    const limiteFrente = ojoDerecho.centro.z + ojoDerecho.radio.z + 0.03;
    for (const ojo of this.ojos) {
      const x = ojo.centro.x - ojo.lado * ojo.radio.x * 0.08;
      const y = ojo.centro.y + ojo.radio.y + 0.013;
      const zDentro = superficie(x - ojo.lado * largoCeja * 0.45, y) ?? ojo.centro.z;
      const zFuera = superficie(x + ojo.lado * largoCeja * 0.45, y) ?? ojo.centro.z;
      // A cada altura, la ceja queda delante de lo que la taparía (flequillo, montura, gorro).
      const profundidades = ALTURAS_CEJA.map(dy => {
        let z = (zDentro + zFuera) / 2;
        for (const fx of [-0.45, 0, 0.45]) {
          for (const fy of [-0.006, 0, 0.006]) {
            z = Math.max(z, frente(x + ojo.lado * largoCeja * fx, y + dy + fy) ?? z);
          }
        }
        return Math.min(z, limiteFrente) + 0.005;
      });
      const pivote = new Group();
      const base = new Vector3(x, y, profundidades[ALTURAS_CEJA.indexOf(0)]!);
      pivote.position.copy(base);
      const giro = Math.atan2(zDentro - zFuera, largoCeja * 0.9) * ojo.lado;
      const ceja = new Mesh(geometriaCeja, materialCeja);
      ceja.castShadow = false;
      pivote.add(ceja);
      this.grupo.add(pivote);
      this.cejas.push({ pivote, malla: ceja, base, giro, profundidades });
    }

    // Párpados: media cáscara de elipsoide, un poco más grande que el ojo.
    const geometriaParpado = this.desechable(
      new SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)
    );
    for (const ojo of this.ojos) {
      const parpado = new Mesh(geometriaParpado, materialParpado);
      parpado.position.copy(ojo.centro);
      parpado.scale.set(ojo.radio.x * 1.18, ojo.radio.y * 1.1, ojo.radio.z * 1.45);
      parpado.rotation.order = 'ZXY';
      parpado.visible = false;
      parpado.receiveShadow = true;
      this.grupo.add(parpado);
      this.parpados.push({ malla: parpado, lado: ojo.lado });
    }

    // Brillo de los ojos: cuelga del hueso de cada ojo (se mueve y parpadea con él).
    const geometriaBrillo = this.desechable(new CircleGeometry(1, 12));
    for (const ojo of this.ojos) {
      const enlaceOjo = new Matrix4().copy(this.inversaDe(ojo.hueso)).multiply(malla.bindMatrix);
      const grupoOjo = new Group();
      grupoOjo.matrixAutoUpdate = false;
      grupoOjo.matrix.copy(enlaceOjo);
      this.gruposOjos.push({ grupo: grupoOjo, hueso: ojo.hueso });
      const sobreOjo = (dx: number, dy: number) =>
        new Vector3(
          ojo.centro.x + dx * ojo.radio.x,
          ojo.centro.y + dy * ojo.radio.y,
          ojo.centro.z + ojo.radio.z * Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)) + 0.0008
        );
      const principal = new Mesh(geometriaBrillo, materialBrillo);
      // La luz llega del mismo lado en ambos ojos.
      principal.position.copy(sobreOjo(0.3, 0.38));
      principal.scale.setScalar(ojo.radio.x * 0.24);
      const humedo = new Mesh(geometriaBrillo, materialBrillo.clone());
      this.desechable(humedo.material as Material);
      humedo.position.copy(sobreOjo(-0.22, -0.42));
      humedo.scale.setScalar(ojo.radio.x * 0.13);
      grupoOjo.add(principal, humedo);
      this.brillos.push({ principal, humedo });
    }

    // Boca: cinta de 2 × (segmentos + 1) vértices que se recalcula en cada fotograma.
    this.geometriaBoca = this.desechable(new BufferGeometry());
    const columnas = SEGMENTOS_BOCA + 1;
    this.geometriaBoca.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(columnas * 2 * 3), 3)
    );
    const indices: number[] = [];
    for (let i = 0; i < SEGMENTOS_BOCA; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    this.geometriaBoca.setIndex(indices);
    this.boca = new Mesh(this.geometriaBoca, materialTinta);
    this.boca.frustumCulled = false;
    this.grupo.add(this.boca);

    const rubor = material(mallaDe('blush'));
    this.rubor =
      rubor instanceof MeshStandardMaterial ? { material: rubor, base: rubor.color.clone() } : null;
  }

  // ---------- Fotograma ----------
  /**
   * Aplica la expresión al rostro. `cierre` es cuánto cubren los párpados el ojo (0–1, incluye el
   * parpadeo) y `habla`, la forma de la boca de la sílaba en curso.
   */
  aplicar(e: Expresion, cierre: number, habla: FormaHabla) {
    // Cejas: altura, inclinación (extremo interno arriba = preocupación), entrecejo y asimetría.
    for (const [i, ceja] of this.cejas.entries()) {
      const ojo = this.ojos[i]!;
      const asimetria = ojo.lado === 1 ? e.cejaAsimetria : -e.cejaAsimetria * 0.3;
      const alto =
        (e.cejaAltura + asimetria) * 0.011 +
        Math.max(0, e.cejaInclinacion) * 0.003 -
        Math.max(0, -e.cejaInclinacion) * 0.002;
      // El extremo más bajo (el interno con el ceño) decide qué tan adelante debe ir.
      const bajada = Math.abs(e.cejaInclinacion) * 0.008;
      ceja.pivote.position.set(
        ceja.base.x - ojo.lado * e.cejaJuntar * 0.006,
        ceja.base.y + alto,
        Math.max(
          profundidadCeja(ceja.profundidades, alto),
          profundidadCeja(ceja.profundidades, alto - bajada)
        )
      );
      // Inclinación positiva: el extremo interno (hacia el centro de la cara) sube.
      ceja.pivote.rotation.set(0, ceja.giro, -ojo.lado * e.cejaInclinacion * 0.42, 'YXZ');
    }

    // Párpados: la línea del párpado baja con el cierre y se inclina con la emoción.
    for (const parpado of this.parpados) {
      const c = MathUtils.clamp(cierre, 0, 1);
      parpado.malla.visible = c > 0.02;
      if (!parpado.malla.visible) continue;
      parpado.malla.rotation.x = Math.asin(2 * c - 1);
      // Inclinación positiva: el extremo externo baja (tristeza); negativa: el interno (enojo).
      parpado.malla.rotation.z = -parpado.lado * e.parpadoInclinacion * 0.32 * Math.min(1, c * 3);
    }

    for (const { principal, humedo } of this.brillos) {
      principal.scale.setScalar(this.ojos[0]!.radio.x * (0.22 + 0.08 * e.ojosHumedos));
      const material = humedo.material as MeshBasicMaterial;
      material.opacity = MathUtils.clamp(e.ojosHumedos, 0, 1) * 0.9;
      humedo.visible = material.opacity > 0.02;
    }

    this.actualizarBoca(e, habla);

    if (this.rubor) {
      const r = e.rubor;
      this.color.copy(this.rubor.base);
      if (r < 0) this.color.lerp(this.piel, Math.min(1, -r));
      else this.color.lerp(ROJO_RUBOR, r * 0.55);
      this.rubor.material.color.copy(this.color);
    }
  }

  private actualizarBoca(e: Expresion, habla: FormaHabla) {
    const posiciones = this.geometriaBoca.attributes.position as BufferAttribute;
    const apertura = MathUtils.clamp(e.bocaApertura + habla.apertura * (1 - e.bocaApertura), 0, 1);
    const redondez = habla.redondez;
    const ancho = this.anchoBoca * e.bocaAncho * habla.ancho * (1 + 0.12 * Math.max(0, e.sonrisa));
    const grosor = 0.0075 * (e.bocaAncho < 1 ? 0.6 + 0.4 * e.bocaAncho : 1);
    const { x: cx, y: cy } = this.centroBoca;
    const desplazamiento = e.bocaLado * ancho * 0.18;
    // Al abrirse, las comisuras se acercan (sobre todo con las vocales redondas).
    const curva = e.sonrisa * (1 - apertura * 0.5);

    for (let i = 0; i <= SEGMENTOS_BOCA; i++) {
      const t = (i / SEGMENTOS_BOCA) * 2 - 1;
      const x = cx + desplazamiento + t * (ancho / 2);
      // Línea media: sonrisa = comisuras arriba; boca torcida = una comisura más alta.
      const media = cy + curva * 0.016 * (t * t - 0.3) + e.bocaLado * 0.004 * t;
      const forma = redondez > 0 ? Math.sqrt(Math.max(0, 1 - t * t)) : (1 - t * t) ** 0.7;
      const arriba = apertura * 0.006 * forma;
      const abajo = apertura * (0.017 + 0.006 * redondez) * forma;
      const borde = grosor * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - t * t)));
      const ySup = media + arriba + borde / 2;
      const yInf = media - abajo - borde / 2;
      posiciones.setXYZ(i * 2, x, ySup, this.profundidadBoca(x, ySup) + SEPARACION);
      posiciones.setXYZ(i * 2 + 1, x, yInf, this.profundidadBoca(x, yInf) + SEPARACION);
    }
    posiciones.needsUpdate = true;
  }

  /**
   * Cuelga el rostro de los huesos y esconde la boca original. Devuelve la limpieza, que lo quita
   * y libera los recursos de la GPU (si se vuelve a montar, Three.js los sube de nuevo).
   */
  montar = () => {
    this.cabeza.add(this.grupo);
    for (const { grupo, hueso } of this.gruposOjos) hueso.add(grupo);
    this.malla.geometry = this.geometriaCuerpo;
    return () => {
      this.grupo.removeFromParent();
      for (const { grupo } of this.gruposOjos) grupo.removeFromParent();
      this.malla.geometry = this.geometriaOriginal;
      this.geometriaCuerpo.dispose();
      for (const d of this.desechables) d.dispose();
    };
  };

  // ---------- Medición ----------
  private desechable<T extends { dispose(): void }>(objeto: T): T {
    this.desechables.push(objeto);
    return objeto;
  }

  /** Vértices que usan los triángulos de la malla de tinta (ojos y boca). */
  private verticesUsados(): number[] {
    const geometria = this.geometriaCuerpo;
    const indices = geometria.index;
    if (!indices) return Array.from({ length: geometria.attributes.position!.count }, (_, i) => i);
    const vertices = new Set<number>();
    for (let i = 0; i < indices.count; i++) vertices.add(indices.getX(i));
    return [...vertices];
  }

  /** Matriz inversa de enlace de un hueso. */
  private inversaDe(hueso: Bone): Matrix4 {
    const { skeleton } = this.malla;
    return skeleton.boneInverses[skeleton.bones.indexOf(hueso)]!;
  }

  /** Posición de un hueso en la pose de reposo, en el espacio de la geometría. */
  private posicionDeReposo(hueso: Bone): Vector3 {
    return new Vector3()
      .setFromMatrixPosition(new Matrix4().copy(this.inversaDe(hueso)).invert())
      .applyMatrix4(new Matrix4().copy(this.malla.bindMatrix).invert());
  }

  /**
   * Sonda de la superficie frontal: dado (x, y) en la pose de reposo, devuelve la z más adelantada
   * de las mallas indicadas (o `null` si el rayo no las toca). Usa copias sin esqueleto.
   */
  private crearSondaSuperficie(mallas: (Mesh | undefined)[]) {
    const sondas = mallas
      .filter((m): m is Mesh => m !== undefined)
      .map(m => new Mesh(m.geometry, listaMateriales(m)[0]));
    for (const sonda of sondas) sonda.updateMatrixWorld(true);
    const rayo = new Raycaster();
    const origen = new Vector3();
    const atras = new Vector3(0, 0, -1);
    return (x: number, y: number): number | null => {
      rayo.set(origen.set(x, y, 2), atras);
      const impacto = rayo.intersectObjects(sondas, false)[0];
      return impacto ? impacto.point.z : null;
    };
  }

  /** Muestrea la cara alrededor de la boca y devuelve una interpolación bilineal de su relieve. */
  private muestrearCara(
    sonda: (x: number, y: number) => number | null,
    centro: Vector3,
    ancho: number
  ) {
    const columnas = 7;
    const filas = 7;
    const mitad = Math.max(0.03, ancho * 0.8);
    const xs = Array.from(
      { length: columnas },
      (_, i) => centro.x - mitad + (2 * mitad * i) / (columnas - 1)
    );
    const ys = Array.from({ length: filas }, (_, j) => centro.y - 0.035 + (0.05 * j) / (filas - 1));
    const z = ys.map(y => xs.map(x => sonda(x, y) ?? centro.z - 0.02));
    const ubicar = (valores: number[], v: number) => {
      const paso = valores[1]! - valores[0]!;
      const f = MathUtils.clamp((v - valores[0]!) / paso, 0, valores.length - 1.0001);
      return [Math.floor(f), f - Math.floor(f)] as const;
    };
    return (x: number, y: number) => {
      const [i, fx] = ubicar(xs, x);
      const [j, fy] = ubicar(ys, y);
      const a = MathUtils.lerp(z[j]![i]!, z[j]![i + 1]!, fx);
      const b = MathUtils.lerp(z[j + 1]![i]!, z[j + 1]![i + 1]!, fx);
      return MathUtils.lerp(a, b, fy);
    };
  }
}

const ROJO_RUBOR = new Color('#d8584a');
