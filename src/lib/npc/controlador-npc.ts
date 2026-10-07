import {
  type AnimationAction,
  AnimationMixer,
  type Bone,
  Box3,
  type Camera,
  Color,
  type DirectionalLight,
  Group,
  LoopOnce,
  LoopRepeat,
  type Material,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  type PerspectiveCamera,
  type Skeleton,
  SkeletonHelper,
  Sphere,
  Vector3,
} from 'three';

import { type AccionNpc, type MetaAccion, metaAccion, METADATOS_ACCIONES } from './acciones';
import { type GlbCargado } from './cargar-glb';
import { RigNpc } from './rig';

export type InterruptorNpc = 'esqueleto' | 'malla' | 'pasear' | 'autogirar';
export type EjeRotacion = 'x' | 'y' | 'z';

/** Estado que muestra la interfaz (inmutable: cada cambio crea un objeto nuevo). */
export interface EstadoNpc {
  accion: AccionNpc | null;
  pausado: boolean;
  velocidad: number;
  mezcla: number;
  modoPose: boolean;
  interruptores: Readonly<Record<InterruptorNpc, boolean>>;
  huesoPose: string;
  rotacion: Readonly<Record<EjeRotacion, number>>;
  globo: { texto: string; visible: boolean };
  /** Aumenta al pulsar "Centrar" para que el visor vuelva a encuadrar la cámara. */
  versionEncuadre: number;
}

export interface ProgresoClip {
  etiqueta: string;
  bucle: boolean;
  tiempo: number;
  duracion: number;
}

/** Lo que el encuadre necesita de los OrbitControls. */
export interface ControlesOrbita {
  target: Vector3;
  update: () => void;
}

/** Elementos del HUD que se actualizan en cada fotograma. */
export interface ElementosOverlay {
  globo: HTMLElement | null;
  barra: HTMLElement | null;
  meta: HTMLElement | null;
}

/** Duración (ms) que el globo de diálogo permanece visible. */
const DURACION_GLOBO_MS = 2600;
/** Radio (m) del paseo en círculo. */
const RADIO_PASEO = 0.9;
const GRADOS = Math.PI / 180;
const COLOR_ACENTO = 0x416180;
const COLOR_SELECCION = 0xc0714f;
/** Dirección desde la que se encuadra al personaje (diagonal, ligeramente desde arriba). */
const DIRECCION_CAMARA = new Vector3(1, 0.55, 1.25).normalize();
/** Altura (m) del globo de diálogo sobre la cabeza. */
const ALTURA_GLOBO = 0.5;
const ATAJOS_INTERRUPTORES: Readonly<Record<string, InterruptorNpc>> = {
  S: 'esqueleto',
  M: 'malla',
  P: 'pasear',
  G: 'autogirar',
};

/**
 * Controlador imperativo de un NPC cargado desde un GLB con esqueleto y animaciones.
 *
 * Es dueño de su copia del modelo (`RigNpc`: clonada y con materiales propios, así el GLB
 * original queda intacto en caché), del mixer, de las ayudas visuales del esqueleto y del
 * estado que cambia en cada fotograma. Expone una pequeña tienda (`suscribir` / `obtenerEstado`)
 * para que React lea el estado de la interfaz con `useSyncExternalStore`. Los métodos son
 * propiedades flecha: se pueden pasar directamente como callbacks.
 */
export class ControladorNpc {
  /** Raíz que se añade a la escena. */
  readonly modelo: Group;
  readonly huesos: Bone[];
  /** Nombres de los huesos editables en modo pose (todos menos la raíz). */
  readonly nombresHuesos: string[];
  /** Acciones que trae el GLB (si le faltara alguna, su botón se deshabilita). */
  readonly accionesDisponibles: ReadonlySet<AccionNpc>;
  /** Ayudas visuales del esqueleto. */
  readonly esqueletoVisible: SkeletonHelper;
  readonly articulaciones: Group;

  private readonly rig: RigNpc;
  private readonly esqueleto: Skeleton;
  private readonly cabeza: Bone | undefined;
  private readonly posicionesReposo: Map<Bone, Vector3>;
  private readonly mixer: AnimationMixer;
  private readonly acciones = new Map<AccionNpc, AnimationAction>();
  private readonly mallasArticulacion: Mesh[];
  private readonly geometriaArticulacion = new OctahedronGeometry(0.018, 0);
  private readonly materialArticulacion = new MeshBasicMaterial({
    color: COLOR_ACENTO,
    depthTest: false,
    transparent: true,
  });
  private readonly materialSeleccion = new MeshBasicMaterial({
    color: COLOR_SELECCION,
    depthTest: false,
    transparent: true,
  });
  private readonly materialOculto = new MeshBasicMaterial({ visible: false });
  private readonly puntoCabeza = new Vector3();

  private actual: AnimationAction | null = null;
  private metaActual: MetaAccion | null = null;
  private anguloPaseo = 0;
  private temporizadorGlobo: ReturnType<typeof setTimeout> | undefined;
  private alTerminarAccion: ((accion: AccionNpc) => void) | undefined;

  private estado: EstadoNpc;
  private readonly oyentes = new Set<() => void>();

  constructor(glb: GlbCargado) {
    this.rig = new RigNpc(glb, 'laboratorio');
    this.modelo = this.rig.raiz;
    this.esqueleto = this.rig.esqueleto;
    this.huesos = this.rig.huesos;
    this.cabeza = this.rig.hueso('head');
    this.nombresHuesos = this.huesos.map(b => b.name).filter(n => n !== 'root');
    this.posicionesReposo = new Map(this.huesos.map(b => [b, b.position.clone()]));

    // Una acción por clip del GLB con nombre conocido.
    this.mixer = new AnimationMixer(this.rig.copia);
    for (const meta of METADATOS_ACCIONES) {
      const clip = this.rig.clips.get(meta.id);
      if (!clip) continue;
      const accion = this.mixer.clipAction(clip);
      if (meta.bucle) {
        accion.setLoop(LoopRepeat, Infinity);
      } else {
        accion.setLoop(LoopOnce, 1);
        accion.clampWhenFinished = true;
      }
      this.acciones.set(meta.id, accion);
    }
    this.accionesDisponibles = new Set(this.acciones.keys());

    // Ayudas del esqueleto.
    this.esqueletoVisible = new SkeletonHelper(this.rig.mallaConPiel);
    const lineas = this.esqueletoVisible.material as MeshBasicMaterial;
    lineas.vertexColors = false;
    lineas.color = new Color(COLOR_ACENTO);
    lineas.depthTest = false;
    lineas.transparent = true;
    lineas.needsUpdate = true;
    this.esqueletoVisible.renderOrder = 999;
    this.esqueletoVisible.visible = false;

    this.articulaciones = new Group();
    this.articulaciones.visible = false;
    this.mallasArticulacion = this.huesos.map(() => {
      const m = new Mesh(this.geometriaArticulacion, this.materialArticulacion);
      m.renderOrder = 1000;
      this.articulaciones.add(m);
      return m;
    });

    this.estado = {
      accion: null,
      pausado: false,
      velocidad: 1,
      mezcla: 0.3,
      modoPose: false,
      interruptores: { esqueleto: false, malla: true, pasear: false, autogirar: false },
      huesoPose: this.cabeza ? 'head' : (this.nombresHuesos[0] ?? ''),
      rotacion: { x: 0, y: 0, z: 0 },
      globo: { texto: '', visible: false },
      versionEncuadre: 0,
    };
  }

  // ---------- Tienda para React ----------
  suscribir = (oyente: () => void) => {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  };

  obtenerEstado = (): EstadoNpc => this.estado;

  private actualizar(cambios: Partial<EstadoNpc>) {
    this.estado = { ...this.estado, ...cambios };
    this.oyentes.forEach(oyente => oyente());
  }

  // ---------- Ciclo de vida ----------
  /**
   * Activa el controlador (empieza en reposo) y devuelve la función de limpieza: detiene las
   * animaciones y libera los materiales propios y las ayudas. Las geometrías pertenecen al GLB en
   * caché y no se liberan, para poder volver a mostrar el NPC sin descargarlo.
   */
  montar = (alTerminarAccion?: (accion: AccionNpc) => void) => {
    this.alTerminarAccion = alTerminarAccion;
    this.mixer.addEventListener('finished', this.alTerminarClip);
    if (this.acciones.has('idle')) this.play('idle');
    this.resaltarArticulacion(this.estado.huesoPose);
    return () => {
      this.mixer.removeEventListener('finished', this.alTerminarClip);
      clearTimeout(this.temporizadorGlobo);
      this.mixer.stopAllAction();
      this.actual = null;
      this.metaActual = null;
      this.esqueletoVisible.dispose();
      this.geometriaArticulacion.dispose();
      this.materialArticulacion.dispose();
      this.materialSeleccion.dispose();
      this.materialOculto.dispose();
      this.rig.liberar();
    };
  };

  private alTerminarClip = (evento: { action: AnimationAction }) => {
    if (evento.action !== this.actual || !this.metaActual) return;
    this.alTerminarAccion?.(this.metaActual.id);
    if (this.acciones.has('idle')) this.play('idle');
  };

  // ---------- Reproducción ----------
  play = (id: AccionNpc) => {
    const siguiente = this.acciones.get(id);
    if (!siguiente) return;
    if (this.estado.modoPose) this.salirDePose();
    const meta = metaAccion(id);
    const anterior = this.actual;
    siguiente.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (anterior && anterior !== siguiente && this.estado.mezcla > 0) {
      siguiente.crossFadeFrom(anterior, this.estado.mezcla, false);
    } else if (anterior && anterior !== siguiente) {
      anterior.stop();
    }
    this.actual = siguiente;
    this.metaActual = meta;
    this.actualizar({ accion: id });
    if (meta.frase) this.say(meta.frase);
  };

  say = (texto: string) => {
    this.actualizar({ globo: { texto, visible: true } });
    clearTimeout(this.temporizadorGlobo);
    this.temporizadorGlobo = setTimeout(
      () => this.actualizar({ globo: { ...this.estado.globo, visible: false } }),
      DURACION_GLOBO_MS
    );
  };

  setPaused = (pausado: boolean) => this.actualizar({ pausado });

  setSpeed = (velocidad: number) =>
    this.actualizar({ velocidad: Math.min(2, Math.max(0.25, velocidad)) });

  setFade = (mezcla: number) => this.actualizar({ mezcla: Math.min(1, Math.max(0, mezcla)) });

  repetir = () => {
    if (this.metaActual) this.play(this.metaActual.id);
  };

  // ---------- Vista ----------
  setToggle = (clave: InterruptorNpc, valor: boolean) => {
    this.actualizar({ interruptores: { ...this.estado.interruptores, [clave]: valor } });
    if (clave === 'esqueleto') {
      this.esqueletoVisible.visible = valor;
      this.articulaciones.visible = valor;
      for (const m of this.rig.materiales) {
        m.transparent = valor;
        m.opacity = valor ? 0.35 : 1;
        m.depthWrite = !valor;
        m.needsUpdate = true;
      }
    }
    if (clave === 'malla') {
      for (const malla of this.rig.mallas) {
        const propios = this.rig.materialesPorMalla.get(malla)!;
        const visibles = valor ? propios : propios.map((): Material => this.materialOculto);
        malla.material = Array.isArray(malla.material) ? visibles : visibles[0]!;
      }
    }
  };

  centrar = () => {
    this.anguloPaseo = 0;
    this.modelo.position.set(0, 0, 0);
    this.modelo.rotation.set(0, 0, 0);
    this.actualizar({ versionEncuadre: this.estado.versionEncuadre + 1 });
  };

  // ---------- Pose manual ----------
  private leerRotacion(nombre: string): Record<EjeRotacion, number> {
    const r = this.rig.hueso(nombre)?.rotation;
    if (!r) return { x: 0, y: 0, z: 0 };
    return {
      x: Math.round(r.x / GRADOS),
      y: Math.round(r.y / GRADOS),
      z: Math.round(r.z / GRADOS),
    };
  }

  private resaltarArticulacion(nombre: string) {
    this.huesos.forEach((b, i) => {
      this.mallasArticulacion[i]!.material =
        b.name === nombre ? this.materialSeleccion : this.materialArticulacion;
    });
  }

  private entrarEnPose() {
    if (this.estado.modoPose) return;
    this.mixer.stopAllAction();
    this.actual = null;
    this.metaActual = null;
    this.actualizar({ modoPose: true, accion: null });
    if (!this.estado.interruptores.esqueleto) this.setToggle('esqueleto', true);
  }

  private salirDePose() {
    this.esqueleto.pose();
    this.actualizar({ modoPose: false });
  }

  seleccionarHueso = (nombre: string) => {
    this.resaltarArticulacion(nombre);
    this.actualizar({ huesoPose: nombre, rotacion: this.leerRotacion(nombre) });
  };

  rotarHueso = (eje: EjeRotacion, grados: number) => {
    const yaEnPose = this.estado.modoPose;
    this.entrarEnPose();
    const { huesoPose } = this.estado;
    const hueso = this.rig.hueso(huesoPose);
    if (!hueso) return;
    // Al entrar en pose, los demás ejes parten de la pose en que quedó la animación.
    const base = yaEnPose ? this.estado.rotacion : this.leerRotacion(huesoPose);
    hueso.rotation[eje] = grados * GRADOS;
    this.actualizar({ rotacion: { ...base, [eje]: grados } });
  };

  reiniciarHueso = () => {
    this.entrarEnPose();
    this.rig.hueso(this.estado.huesoPose)?.rotation.set(0, 0, 0);
    this.actualizar({ rotacion: { x: 0, y: 0, z: 0 } });
  };

  reiniciarPose = () => {
    this.entrarEnPose();
    for (const b of this.huesos) {
      b.rotation.set(0, 0, 0);
      b.position.copy(this.posicionesReposo.get(b)!);
    }
    this.actualizar({ rotacion: { x: 0, y: 0, z: 0 } });
  };

  // ---------- Bucle de render ----------
  /** Avanza la animación `dt` segundos (se llama desde `useFrame`). */
  avanzar = (dt: number) => {
    const { pausado, velocidad, modoPose, interruptores } = this.estado;
    const paso = pausado ? 0 : dt * velocidad;
    if (!modoPose) this.mixer.update(paso);

    const avance = this.metaActual?.avance;
    if (interruptores.pasear && avance && !modoPose) {
      this.anguloPaseo += (avance / RADIO_PASEO) * paso;
      const a = this.anguloPaseo;
      this.modelo.position.set(
        Math.sin(a) * RADIO_PASEO,
        0,
        Math.cos(a) * RADIO_PASEO - RADIO_PASEO
      );
      this.modelo.rotation.y = a + Math.PI / 2;
    }
    if (this.articulaciones.visible) {
      this.huesos.forEach((b, i) => b.getWorldPosition(this.mallasArticulacion[i]!.position));
    }
  };

  /** Progreso del clip actual para el HUD (o `null` en pose manual). */
  progreso = (): ProgresoClip | null => {
    if (!this.actual || !this.metaActual) return null;
    return {
      etiqueta: this.metaActual.etiqueta,
      bucle: this.metaActual.bucle,
      tiempo: this.actual.time,
      duracion: this.actual.getClip().duration,
    };
  };

  // ---------- Cámara y HUD ----------
  /**
   * Encuadra la cámara al modelo (como `three-d-stage.setObject` del prototipo): calcula la
   * esfera envolvente, coloca la cámara en diagonal a 1,35 veces la distancia que llena el campo
   * de visión y ajusta la cámara de sombras. Devuelve la altura del suelo (base del modelo).
   */
  encuadrar = (
    camara: PerspectiveCamera,
    controles: ControlesOrbita,
    luz: DirectionalLight | null
  ): number | null => {
    const caja = new Box3().setFromObject(this.modelo);
    if (caja.isEmpty()) return null;
    const esfera = caja.getBoundingSphere(new Sphere());
    const distancia = (esfera.radius / Math.tan((camara.fov * Math.PI) / 360)) * 1.35;
    camara.position.copy(esfera.center).add(DIRECCION_CAMARA.clone().multiplyScalar(distancia));
    camara.near = Math.max(distancia / 100, 0.01);
    camara.far = distancia * 100;
    camara.updateProjectionMatrix();
    controles.target.copy(esfera.center);
    controles.update();
    if (luz) {
      const sombra = luz.shadow.camera;
      const alcance = esfera.radius * 3;
      sombra.left = -alcance;
      sombra.right = alcance;
      sombra.top = alcance;
      sombra.bottom = -alcance;
      sombra.updateProjectionMatrix();
    }
    return caja.min.y;
  };

  /** Actualiza la barra de progreso, el texto del HUD y la posición del globo (sigue la cabeza). */
  pintarOverlay = (
    { globo, barra, meta }: ElementosOverlay,
    camara: Camera,
    ancho: number,
    alto: number
  ) => {
    const progreso = this.progreso();
    if (barra && meta) {
      if (progreso) {
        barra.style.width = `${(progreso.tiempo / progreso.duracion) * 100}%`;
        meta.textContent = `${progreso.bucle ? 'bucle' : 'una vez'} · ${progreso.tiempo.toFixed(2)} / ${progreso.duracion.toFixed(2)} s`;
      } else {
        barra.style.width = '0%';
        meta.textContent = `${this.nombresHuesos.length} huesos editables`;
      }
    }
    if (globo) {
      // Proyección 3D → 2D en píxeles del canvas (sobre la cabeza, o la parte alta del modelo).
      if (this.cabeza) this.cabeza.getWorldPosition(this.puntoCabeza);
      else this.modelo.getWorldPosition(this.puntoCabeza).setY(1.2);
      this.puntoCabeza.y += ALTURA_GLOBO;
      this.puntoCabeza.project(camara);
      globo.style.left = `${((this.puntoCabeza.x + 1) / 2) * ancho}px`;
      globo.style.top = `${((1 - this.puntoCabeza.y) / 2) * alto}px`;
    }
  };

  // ---------- Teclado ----------
  /** Atajos del laboratorio. Devuelve la función que quita el listener. */
  escucharTeclado = () => {
    const alPulsar = (evento: KeyboardEvent) => {
      const objetivo = evento.target;
      if (objetivo instanceof HTMLElement && objetivo.closest('input, select, textarea')) return;
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const tecla = evento.key.toUpperCase();
      const meta = METADATOS_ACCIONES.find(a => a.tecla === tecla);
      if (meta) {
        this.play(meta.id);
        return;
      }
      if (evento.code === 'Space') {
        evento.preventDefault();
        this.setPaused(!this.estado.pausado);
        return;
      }
      const interruptor = ATAJOS_INTERRUPTORES[tecla];
      if (interruptor) this.setToggle(interruptor, !this.estado.interruptores[interruptor]);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  };
}
