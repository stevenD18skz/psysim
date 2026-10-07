import {
  type AnimationAction,
  AnimationMixer,
  type Bone,
  Box3,
  type Group,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Quaternion,
  Vector3,
} from 'three';

import { type EmocionNpc } from '@/lib/conversacion/emociones';
import { type EstadoNpc } from '@/lib/conversacion/estados-npc';

import { type AccionNpc, metaAccion } from './acciones';
import { type GlbCargado } from './cargar-glb';
import {
  clipEnBucle,
  EMOCIONES_CON_SUSPIRO,
  type Expresion,
  EXPRESION_NEUTRA,
  expresionPara,
} from './comportamiento';
import { adaptarClipSentado, clipSentado, type Piernas, type Postura } from './postura';
import { RigNpc } from './rig';

/** Clips que usa el paciente: dos bucles (reposo, pensar) y los gestos puntuales. */
const ACCIONES_PACIENTE: readonly AccionNpc[] = ['idle', 'think', 'wave', 'yes', 'no', 'bow'];

/** Duración del fundido entre clips (s). */
const MEZCLA_S = 0.4;
/** Rapidez con que la expresión alcanza su objetivo (1/s): ~1 s para un cambio de emoción. */
const RAPIDEZ_EXPRESION = 3;
/** Rapidez con que la mirada sigue a su objetivo (1/s). */
const RAPIDEZ_MIRADA = 5;
/** Giro y cabeceo máximos de la mirada (rad): más allá, solo mueve los ojos… que no tiene. */
const GIRO_MAXIMO = 0.75;
const CABECEO_MAXIMO = 0.35;
/** Si el estudiante queda detrás de este ángulo, el paciente deja de seguirlo con la mirada. */
const ANGULO_FUERA_DE_VISTA = 1.9;
/** Distancia (m) a partir de la cual pierde interés en el estudiante que recorre la sala. */
const DISTANCIA_ATENCION = 4.5;
/** Hacia dónde mira cuando evita el contacto visual: a un lado y un poco hacia abajo. */
const MIRADA_DESVIADA = { giro: 0.5, cabeceo: -0.15 };
const DURACION_PARPADEO_S = 0.16;
const DURACION_SUSPIRO_S = 2.4;

export interface OpcionesAnimador {
  postura: Postura;
  /** Altura (m) del asiento sobre el suelo, si está sentado. */
  alturaAsiento: number;
  piernas?: Piernas;
}

interface HuesosExpresivos {
  spine?: Bone;
  chest?: Bone;
  neck?: Bone;
  head?: Bone;
  eye_L?: Bone;
  eye_R?: Bone;
}

function aproximar(actual: number, objetivo: number, t: number) {
  return actual + (objetivo - actual) * t;
}

/**
 * Animador del paciente virtual en la simulación: un personaje del catálogo (`RigNpc`) con su
 * lenguaje no verbal.
 *
 * Combina tres capas:
 * 1. Postura: sentado, un clip fijo controla caderas y piernas (`postura.ts`).
 * 2. Clips del GLB con crossfade: un bucle por estado (reposo, pensar) y gestos puntuales
 *    (saludar, asentir, negar) que vuelven solos al bucle.
 * 3. Capa procedural, aplicada después del mixer en cada fotograma: mirada que sigue al
 *    estudiante, postura y párpados según la emoción, respiración, inquietud, habla, parpadeo y
 *    suspiros. Los huesos que toca vuelven a su reposo antes de cada `mixer.update`, así los
 *    ajustes nunca se acumulan aunque ningún clip anime ese hueso.
 *
 * No depende de React: `PacientePersonaje` le pasa el estado del store y la cámara.
 */
export class AnimadorPaciente {
  /** Raíz que se añade a la escena (origen en el suelo, mirando hacia +Z). */
  readonly modelo: Group;
  /** Altura (m) de los ojos sobre el suelo en la postura base, para encuadrar la conversación. */
  readonly alturaOjos: number;
  /** Caja de la postura base, para la colisión y para apuntarle con la mira. */
  readonly caja: Box3;

  private readonly rig: RigNpc;
  private readonly mixer: AnimationMixer;
  private readonly acciones = new Map<AccionNpc, AnimationAction>();
  private readonly postura: AnimationAction | null = null;
  private readonly huesos: HuesosExpresivos;
  private readonly reposo: { hueso: Bone; rotacion: Quaternion; escala: Vector3 }[];

  private activa: AnimationAction | null = null;
  private bucle: AccionNpc = 'idle';
  private gesto: AccionNpc | null = null;
  private emocion: EmocionNpc = 'neutral';
  private objetivo: Expresion = { ...EXPRESION_NEUTRA };
  private readonly expresion: Expresion = { ...EXPRESION_NEUTRA };

  private tiempo = 0;
  private faseRespiracion = 0;
  private proximoParpadeo = 1.5;
  private inicioParpadeo = -1;
  private inicioSuspiro = -Infinity;
  private readonly mirada = { giro: 0, cabeceo: 0 };
  /** Lado hacia el que desvía la mirada (cada paciente tiene su costumbre). */
  private readonly ladoDesviado = Math.random() < 0.5 ? -1 : 1;

  private readonly q = new Quaternion();
  private readonly ejeX = new Vector3(1, 0, 0);
  private readonly ejeY = new Vector3(0, 1, 0);
  private readonly ejeZ = new Vector3(0, 0, 1);
  private readonly camaraLocal = new Vector3();
  private readonly ojos = new Vector3();

  constructor(glb: GlbCargado, { postura, alturaAsiento, piernas }: OpcionesAnimador) {
    this.rig = new RigNpc(glb, 'paciente');
    this.modelo = this.rig.raiz;
    this.mixer = new AnimationMixer(this.rig.copia);

    // La mira apunta a una caja invisible (ver `PacientePersonaje`): lanzar rayos contra mallas
    // con esqueleto obliga a deformar miles de vértices en cada consulta.
    for (const malla of this.rig.mallas) malla.raycast = () => {};

    const sentado = postura === 'sentado';
    if (sentado) {
      this.postura = this.mixer.clipAction(clipSentado(this.rig, alturaAsiento, piernas));
      this.postura.setLoop(LoopRepeat, Infinity);
    }
    for (const id of ACCIONES_PACIENTE) {
      const original = this.rig.clips.get(id);
      if (!original) continue;
      const accion = this.mixer.clipAction(sentado ? adaptarClipSentado(original, id) : original);
      if (metaAccion(id).bucle) {
        accion.setLoop(LoopRepeat, Infinity);
      } else {
        accion.setLoop(LoopOnce, 1);
        accion.clampWhenFinished = true;
      }
      this.acciones.set(id, accion);
    }

    const hueso = (nombre: string) => this.rig.hueso(nombre);
    this.huesos = {
      spine: hueso('spine'),
      chest: hueso('chest'),
      neck: hueso('neck'),
      head: hueso('head'),
      eye_L: hueso('eye_L'),
      eye_R: hueso('eye_R'),
    };
    this.reposo = Object.values(this.huesos)
      .filter((b): b is Bone => b !== undefined)
      .map(b => ({ hueso: b, rotacion: b.quaternion.clone(), escala: b.scale.clone() }));

    // Mide la postura base (con el primer fotograma de los clips) y vuelve a empezar.
    this.postura?.play();
    this.acciones.get('idle')?.play();
    this.mixer.update(0);
    this.modelo.updateMatrixWorld(true);
    this.alturaOjos = this.huesos.eye_L
      ? this.huesos.eye_L.getWorldPosition(this.ojos).y
      : new Box3().setFromObject(this.modelo, true).max.y * 0.85;
    this.caja = new Box3().setFromObject(this.modelo, true);
    this.mixer.stopAllAction();
  }

  // ---------- Ciclo de vida ----------
  /** Empieza en reposo y devuelve la limpieza (detiene el mixer y libera los materiales). */
  montar = () => {
    this.mixer.addEventListener('finished', this.alTerminarClip);
    this.postura?.reset().play();
    this.activa = null;
    this.gesto = null;
    this.reproducir(this.bucle);
    return () => {
      this.mixer.removeEventListener('finished', this.alTerminarClip);
      this.mixer.stopAllAction();
      this.activa = null;
      this.rig.liberar();
    };
  };

  private alTerminarClip = (evento: { action: AnimationAction }) => {
    if (evento.action !== this.activa || !this.gesto) return;
    this.gesto = null;
    this.reproducir(this.bucle);
  };

  // ---------- Conducta ----------
  /** Ajusta el bucle y la expresión al estado de la conversación y a la emoción vigente. */
  actualizarConducta = (estado: EstadoNpc, emocion: EmocionNpc) => {
    if (emocion !== this.emocion && EMOCIONES_CON_SUSPIRO.has(emocion)) {
      this.inicioSuspiro = this.tiempo;
    }
    this.emocion = emocion;
    this.objetivo = expresionPara(estado, emocion);

    const bucle = clipEnBucle(estado);
    if (bucle === this.bucle) return;
    this.bucle = bucle;
    // Si hay un gesto en curso, al terminar vuelve al bucle nuevo.
    if (!this.gesto) this.reproducir(bucle);
  };

  /** Gesto puntual (saludar, asentir, negar…); al terminar vuelve al bucle del estado. */
  hacerGesto = (id: AccionNpc) => {
    if (!this.acciones.has(id) || metaAccion(id).bucle) return;
    this.gesto = id;
    this.reproducir(id);
  };

  /** Acción del mixer que se está mostrando (para pruebas y depuración). */
  get accionActual(): AccionNpc | null {
    for (const [id, accion] of this.acciones) if (accion === this.activa) return id;
    return null;
  }

  private reproducir(id: AccionNpc) {
    const siguiente = this.acciones.get(id);
    if (!siguiente) return;
    const anterior = this.activa;
    if (siguiente === anterior && metaAccion(id).bucle) return;
    siguiente.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (anterior && anterior !== siguiente) siguiente.crossFadeFrom(anterior, MEZCLA_S, false);
    this.activa = siguiente;
  }

  // ---------- Fotograma ----------
  /**
   * Avanza `dt` segundos. `camara` es la posición de la cámara (los ojos del estudiante) en
   * coordenadas del mundo.
   */
  avanzar = (dt: number, camara: Vector3) => {
    this.tiempo += dt;

    for (const { hueso, rotacion, escala } of this.reposo) {
      hueso.quaternion.copy(rotacion);
      hueso.scale.copy(escala);
    }
    this.mixer.update(dt);

    const t = 1 - Math.exp(-RAPIDEZ_EXPRESION * dt);
    const e = this.expresion;
    for (const clave of Object.keys(e) as (keyof Expresion)[]) {
      e[clave] = aproximar(e[clave], this.objetivo[clave], t);
    }

    this.aplicarCuerpo(dt);
    this.aplicarMirada(dt, camara);
    this.aplicarOjos();
  };

  /** Respiración, encorvamiento, inquietud y habla sobre la columna y la cabeza. */
  private aplicarCuerpo(dt: number) {
    const { spine, chest, head } = this.huesos;
    const e = this.expresion;
    const tiempo = this.tiempo;

    // Suspiro: una inhalación lenta y profunda que se desvanece.
    const s = (tiempo - this.inicioSuspiro) / DURACION_SUSPIRO_S;
    const suspiro = s >= 0 && s < 1 ? Math.sin(Math.PI * s) : 0;
    this.faseRespiracion += (dt * 2 * Math.PI) / (e.periodoRespiracion * (1 + suspiro));
    const respiracion = Math.sin(this.faseRespiracion) * e.amplitudRespiracion + suspiro * 0.06;

    const inquietud =
      e.inquietud * (0.025 * Math.sin(tiempo * 5.3) + 0.015 * Math.sin(tiempo * 8.9 + 1.3));
    const habla = e.habla * (0.035 * Math.sin(tiempo * 9.1) + 0.02 * Math.sin(tiempo * 4.3 + 0.7));

    if (spine) this.rotar(spine, this.ejeX, e.encorvado * 0.55);
    if (chest) {
      this.rotar(chest, this.ejeX, e.encorvado * 0.45 - respiracion);
      this.rotar(chest, this.ejeY, inquietud * 0.6 + e.habla * 0.025 * Math.sin(tiempo * 2.3));
      this.rotar(chest, this.ejeZ, e.inquietud * 0.012 * Math.sin(tiempo * 3.7));
    }
    if (head) {
      this.rotar(head, this.ejeX, e.cabeceo + habla + respiracion * 0.3);
      this.rotar(head, this.ejeZ, e.ladeo);
      this.rotar(head, this.ejeY, inquietud);
    }
  }

  /** Gira cuello y cabeza hacia el estudiante (o hacia un lado cuando evita mirarlo). */
  private aplicarMirada(dt: number, camara: Vector3) {
    const { neck, head } = this.huesos;
    if (!head) return;

    // Posición de la cámara respecto a los ojos, en el espacio del personaje (+Z al frente).
    this.modelo.worldToLocal(this.camaraLocal.copy(camara));
    const dx = this.camaraLocal.x;
    const dy = this.camaraLocal.y - this.alturaOjos;
    const dz = this.camaraLocal.z;
    const horizontal = Math.hypot(dx, dz);
    const giro = Math.atan2(dx, dz);

    // Deja de seguir al estudiante si queda detrás o lejos.
    const visible = Math.abs(giro) < ANGULO_FUERA_DE_VISTA;
    const cercania = MathUtils.clamp((DISTANCIA_ATENCION - horizontal) / 1.5, 0, 1);
    const contacto = visible ? this.expresion.contactoVisual * cercania : 0;

    const objetivoGiro = MathUtils.lerp(
      MIRADA_DESVIADA.giro * this.ladoDesviado,
      MathUtils.clamp(giro, -GIRO_MAXIMO, GIRO_MAXIMO),
      contacto
    );
    const objetivoCabeceo = MathUtils.lerp(
      MIRADA_DESVIADA.cabeceo,
      MathUtils.clamp(Math.atan2(dy, horizontal), -CABECEO_MAXIMO, CABECEO_MAXIMO),
      contacto
    );
    // Sin nadie a quien mirar, la mirada desviada se suaviza hacia el frente.
    const peso = visible ? 1 : 0.4;
    const t = 1 - Math.exp(-RAPIDEZ_MIRADA * dt);
    this.mirada.giro = aproximar(this.mirada.giro, objetivoGiro * peso, t);
    this.mirada.cabeceo = aproximar(this.mirada.cabeceo, objetivoCabeceo * peso, t);

    // El cuello hace un tercio del giro y la cabeza el resto. Cabeceo positivo = mirar arriba.
    if (neck) {
      this.rotar(neck, this.ejeY, this.mirada.giro * 0.35);
      this.rotar(neck, this.ejeX, -this.mirada.cabeceo * 0.3);
    }
    this.rotar(head, this.ejeY, this.mirada.giro * 0.65);
    this.rotar(head, this.ejeX, -this.mirada.cabeceo * 0.7);
  }

  /** Párpados según la emoción y parpadeo natural (más frecuente con ansiedad). */
  private aplicarOjos() {
    const { eye_L, eye_R } = this.huesos;
    if (!eye_L || !eye_R) return;

    if (this.tiempo >= this.proximoParpadeo) {
      this.inicioParpadeo = this.tiempo;
      const ansioso = this.expresion.inquietud > 0.5;
      this.proximoParpadeo =
        this.tiempo + (ansioso ? 1 : 2.5) + Math.random() * (ansioso ? 1.5 : 3.5);
    }
    const p = (this.tiempo - this.inicioParpadeo) / DURACION_PARPADEO_S;
    const parpadeo = p >= 0 && p < 1 ? 1 - 0.9 * Math.sin(Math.PI * p) : 1;
    const apertura = this.expresion.apertura * parpadeo;
    eye_L.scale.y *= apertura;
    eye_R.scale.y *= apertura;
  }

  /** Rota un hueso sobre uno de sus ejes locales (después de lo que dejó el mixer). */
  private rotar(hueso: Bone, eje: Vector3, angulo: number) {
    if (angulo !== 0) hueso.quaternion.multiply(this.q.setFromAxisAngle(eje, angulo));
  }
}
