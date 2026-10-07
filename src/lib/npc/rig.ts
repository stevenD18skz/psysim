import {
  type AnimationClip,
  type Bone,
  Group,
  type Material,
  Mesh,
  type Skeleton,
  SkinnedMesh,
} from 'three';
import { clone as clonarConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { type AccionNpc, ACCIONES_NPC } from './acciones';
import { type GlbCargado } from './cargar-glb';

/** Los materiales de una malla, siempre como arreglo. */
export function listaMateriales(malla: Mesh): Material[] {
  return Array.isArray(malla.material) ? malla.material : [malla.material];
}

/**
 * Copia propia de un personaje GLB: modelo clonado con `SkeletonUtils` (el GLB original queda
 * intacto en la caché de `cargarGlb`), materiales propios, esqueleto y clips por acción.
 *
 * Es la base común del controlador del laboratorio y del animador de los pacientes de la
 * simulación: así ambos entienden el mismo formato de personaje.
 */
export class RigNpc {
  /** Raíz que se añade a la escena. */
  readonly raiz: Group;
  /** Copia del GLB (hija de `raiz`); es la raíz de las animaciones. */
  readonly copia: Group;
  readonly mallas: Mesh[] = [];
  readonly materialesPorMalla = new Map<Mesh, Material[]>();
  readonly materiales: Material[];
  readonly mallaConPiel: SkinnedMesh;
  readonly esqueleto: Skeleton;
  readonly huesos: Bone[];
  /** Clip de cada acción que trae el GLB (si le faltara alguna, no aparece). */
  readonly clips: ReadonlyMap<AccionNpc, AnimationClip>;

  private readonly porNombre: Map<string, Bone>;

  constructor({ escena, animaciones }: GlbCargado, sufijo: string) {
    const copia = clonarConEsqueleto(escena) as Group;
    this.copia = copia;
    this.raiz = new Group();
    this.raiz.name = `${escena.name || 'npc'}_${sufijo}`;
    this.raiz.add(copia);

    copia.traverse(objeto => {
      if (!(objeto instanceof Mesh)) return;
      objeto.castShadow = true;
      objeto.receiveShadow = true;
      // La caja de la pose de reposo no coincide con la animada: sin esto desaparecería al
      // sentarse o inclinarse cerca del borde de la pantalla.
      objeto.frustumCulled = false;
      const propios = listaMateriales(objeto).map(m => m.clone());
      objeto.material = Array.isArray(objeto.material) ? propios : propios[0]!;
      this.mallas.push(objeto);
      this.materialesPorMalla.set(objeto, propios);
    });
    this.materiales = [...this.materialesPorMalla.values()].flat();

    const conPiel = this.mallas.find((m): m is SkinnedMesh => m instanceof SkinnedMesh);
    if (!conPiel) throw new Error('El GLB no tiene una malla con esqueleto (SkinnedMesh).');
    this.mallaConPiel = conPiel;
    this.esqueleto = conPiel.skeleton;
    this.huesos = this.esqueleto.bones;
    this.porNombre = new Map(this.huesos.map(b => [b.name, b]));

    const clips = new Map<AccionNpc, AnimationClip>();
    for (const id of ACCIONES_NPC) {
      const clip = animaciones.find(c => c.name === id);
      if (clip) clips.set(id, clip);
    }
    this.clips = clips;
  }

  hueso(nombre: string): Bone | undefined {
    return this.porNombre.get(nombre);
  }

  /**
   * Libera los materiales propios y el esqueleto. Las geometrías pertenecen al GLB en caché y no
   * se liberan, para poder volver a mostrar el personaje sin descargarlo.
   */
  liberar() {
    this.materiales.forEach(m => m.dispose());
    this.esqueleto.dispose();
  }
}
