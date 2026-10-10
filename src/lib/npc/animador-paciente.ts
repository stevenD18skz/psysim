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

import { type Silaba } from '@/lib/audio/voz';
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
import { BOCA_CERRADA, type FormaHabla, formaHabla, RostroNpc } from './rostro';

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
/** Cuánto se desplazan los ojos dentro de la cara al mirar (m, en el espacio de la cabeza). */
const RECORRIDO_OJOS = { x: 0.0065, y: 0.0045 };
/** Duración de un levantamiento breve de cejas (señal de atención, al tomar la palabra) (s). */
const DURACION_CEJAS_S = 0.55;
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
  private readonly reposo: {
    hueso: Bone;
    rotacion: Quaternion;
    escala: Vector3;
    posicion: Vector3;
  }[];
  /** Cejas, párpados, boca y brillo de los ojos (si el personaje tiene la cara esperada). */
  private readonly rostro: RostroNpc | null = null;

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
  private estado: EstadoNpc = 'inactivo';
  private readonly mirada = { giro: 0, cabeceo: 0 };
  /** Mirada de los ojos dentro de la cara (-1–1) y la microsacada en curso. */
  private readonly miradaOjos = { x: 0, y: 0 };
  private readonly sacada = { x: 0, y: 0, proxima: 0.8 };
  private inicioCejas = -Infinity;
  private proximasCejas = 6;
  /** Sílabas de la respuesta en curso (`planVoz`), para mover la boca al ritmo de la voz. */
  private silabas: readonly Silaba[] = [];
  private inicioHabla = 0;
  /** Cuánto cubren los párpados los ojos en este fotograma (0–1). */
  private cierre = 0;
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
      .map(b => ({
        hueso: b,
        rotacion: b.quaternion.clone(),
        escala: b.scale.clone(),
        posicion: b.position.clone(),
      }));

    try {
      this.rostro = new RostroNpc(this.rig);
    } catch {
      // Un personaje con otra cara conserva el parpadeo y la mirada de la cabeza.
      this.rostro = null;
    }

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
    const desmontarRostro = this.rostro?.montar();
    return () => {
      this.mixer.removeEventListener('finished', this.alTerminarClip);
      this.mixer.stopAllAction();
      this.activa = null;
      desmontarRostro?.();
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
    if (estado !== 'respondiendo') this.silabas = [];
    this.estado = estado;

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

  /**
   * Mueve la boca con el plan de sílabas de la voz inventada (el mismo que suena), desde ahora.
   * Sin plan, mientras responde, la boca se mueve con un balbuceo genérico.
   */
  hablar = (silabas: readonly Silaba[]) => {
    this.silabas = silabas;
    this.inicioHabla = this.tiempo;
    // Al tomar la palabra levanta un poco las cejas.
    this.inicioCejas = this.tiempo;
  };

  /** Cuánto cubren los párpados los ojos (0–1), para pruebas y depuración. */
  get cierreParpados(): number {
    return this.cierre;
  }

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

    for (const { hueso, rotacion, escala, posicion } of this.reposo) {
      hueso.quaternion.copy(rotacion);
      hueso.scale.copy(escala);
      hueso.position.copy(posicion);
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
    this.aplicarRostro();
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

    this.moverOjos(dt, objetivoGiro * peso, objetivoCabeceo * peso, contacto);
  }

  /**
   * Los ojos se adelantan a la cabeza (llegan primero al objetivo y la cabeza los alcanza) y nunca
   * están quietos: hacen microsacadas, más pequeñas mientras sostiene el contacto visual.
   */
  private moverOjos(dt: number, giro: number, cabeceo: number, contacto: number) {
    const { eye_L, eye_R } = this.huesos;
    if (!eye_L || !eye_R) return;
    const s = this.sacada;
    if (this.tiempo >= s.proxima) {
      const amplitud = 0.12 + 0.35 * (1 - contacto);
      s.x = (Math.random() * 2 - 1) * amplitud;
      s.y = (Math.random() * 2 - 1) * amplitud * 0.6;
      s.proxima = this.tiempo + 0.5 + Math.random() * (contacto > 0.6 ? 1.6 : 1);
    }
    // Lo que la cabeza aún no giró lo hacen los ojos.
    const x = MathUtils.clamp(giro * 0.5 + (giro - this.mirada.giro) * 1.4 + s.x, -1, 1);
    const y = MathUtils.clamp(cabeceo * 0.6 + (cabeceo - this.mirada.cabeceo) * 1.4 + s.y, -1, 1);
    // Las sacadas son rápidas: casi un salto.
    const t = 1 - Math.exp(-22 * dt);
    this.miradaOjos.x = aproximar(this.miradaOjos.x, x, t);
    this.miradaOjos.y = aproximar(this.miradaOjos.y, y, t);
    for (const ojo of [eye_L, eye_R]) {
      ojo.position.x += this.miradaOjos.x * RECORRIDO_OJOS.x;
      ojo.position.y += this.miradaOjos.y * RECORRIDO_OJOS.y;
    }
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
    const apertura = this.expresion.apertura;
    if (!this.rostro) {
      const parpadeo = p >= 0 && p < 1 ? 1 - 0.9 * Math.sin(Math.PI * p) : 1;
      eye_L.scale.y *= apertura * parpadeo;
      eye_R.scale.y *= apertura * parpadeo;
      return;
    }
    // Con rostro, los párpados cubren el ojo; la escala solo lo agranda (miedo) y acompaña el
    // parpadeo para que las pestañas también se cierren.
    const parpadeo = p >= 0 && p < 1 ? 1 - Math.sin(Math.PI * p) : 1;
    this.cierre = 1 - MathUtils.clamp(apertura, 0, 1) * parpadeo;
    const escala = Math.max(1, apertura) * (0.55 + 0.45 * parpadeo);
    eye_L.scale.y *= escala;
    eye_R.scale.y *= escala;
  }

  /** Cejas, párpados y boca según la expresión; la boca sigue la voz mientras responde. */
  private aplicarRostro() {
    if (!this.rostro) return;
    const tiempo = this.tiempo;

    // Mientras escucha, de vez en cuando levanta las cejas (señal de atención), salvo si está
    // enojado.
    if (this.estado === 'esperando_input' && tiempo >= this.proximasCejas) {
      if (this.objetivo.cejaInclinacion > -0.3) this.inicioCejas = tiempo;
      this.proximasCejas = tiempo + 5 + Math.random() * 5;
    }
    const c = (tiempo - this.inicioCejas) / DURACION_CEJAS_S;
    const pulsoCejas = c >= 0 && c < 1 ? Math.sin(Math.PI * c) * 0.45 : 0;

    let habla: FormaHabla = BOCA_CERRADA;
    if (this.estado === 'respondiendo') {
      if (this.silabas.length > 0) {
        habla = formaHabla(this.silabas, tiempo - this.inicioHabla);
      } else {
        // Sin plan (vista previa sin conversación): balbuceo genérico.
        const abre = Math.max(0, Math.sin(tiempo * 12.5)) ** 1.5;
        habla = {
          apertura: abre * (0.45 + 0.25 * Math.sin(tiempo * 3.1)),
          ancho: 1,
          redondez: Math.max(0, Math.sin(tiempo * 1.7)) * 0.6,
        };
      }
    }

    const e = this.expresion;
    this.rostro.aplicar(
      pulsoCejas > 0 ? { ...e, cejaAltura: e.cejaAltura + pulsoCejas } : e,
      this.cierre,
      habla
    );
  }

  /** Rota un hueso sobre uno de sus ejes locales (después de lo que dejó el mixer). */
  private rotar(hueso: Bone, eje: Vector3, angulo: number) {
    if (angulo !== 0) hueso.quaternion.multiply(this.q.setFromAxisAngle(eje, angulo));
  }
}
