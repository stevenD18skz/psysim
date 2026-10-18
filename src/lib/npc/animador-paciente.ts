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
import {
  type EmocionNpc,
  INTENSIDAD_POR_DEFECTO,
  type IntensidadEmocion,
} from '@/lib/conversacion/emociones';
import { type EstadoNpc } from '@/lib/conversacion/estados-npc';
import {
  RETRASO_RELLENO_MS,
  SILENCIO_ACOMODARSE_S,
  SILENCIO_SUSPIRAR_S,
} from '@/lib/conversacion/relleno';

import { type AccionNpc, metaAccion } from './acciones';
import { BrazosPaciente, type EstadoBrazos } from './brazos-paciente';
import { type GlbCargado } from './cargar-glb';
import {
  clipEnBucle,
  EMOCIONES_CON_SUSPIRO,
  type Expresion,
  EXPRESION_NEUTRA,
  expresionEscuchando,
  expresionPara,
  type GestoPaciente,
} from './comportamiento';
import { type Ademan, ademanesDeHabla, type MomentoClave, momentosClave } from './gestos-habla';
import { AJUSTES_CUERPO } from './poses-gestos';
import { adaptarClipSentado, clipSentado, type Piernas, type Postura } from './postura';
import {
  amplitudGestos,
  type ContextoGesto,
  cortarGesto,
  duracionSostenida,
  elegirGesto,
  esGestoProcedural,
  type GestoEnCurso,
  gestoDeEmocion,
  gestoDeLaEmocion,
  gestoPermitido,
  type GestoProcedural,
  gestoTerminado,
  gestoVacio,
  METADATOS_GESTOS,
  pausaEntreGestos,
  pesoDeGesto,
} from './repertorio-gestos';
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
/** Asentimiento breve de escucha (dos cabeceos pequeños) y su amplitud (rad). */
const DURACION_ASENTIR_S = 0.8;
const AMPLITUD_ASENTIR = 0.075;
/** Acomodarse en la silla tras un silencio largo (s). */
const DURACION_ACOMODO_S = 1.8;
/** Emociones con las que el relleno de la espera es un suspiro (en las demás, alza las cejas). */
const RELLENO_CON_SUSPIRO: ReadonlySet<EmocionNpc> = new Set(['triste', 'abrumado', 'ansioso']);
/** Espera (s) antes del primer gesto espontáneo, y tras una emoción nueva hasta que se le note. */
const PRIMER_GESTO_S: readonly [number, number] = [4, 10];
const GESTO_DE_EMOCION_S: readonly [number, number] = [0.6, 2];
/** Clips que no usan los brazos: con ellos, los brazos quedan para la capa procedural. */
const CLIPS_SIN_BRAZOS: ReadonlySet<AccionNpc> = new Set(['idle', 'yes']);
/** Ademán: subida (s), caída (s) y giro del antebrazo (rad) en el más marcado. */
const ADEMAN = { subida: 0.12, caida: 0.3, duracion: 1, antebrazo: 0.55 };
/** Cuánto se marcan los ademanes con cada emoción (la tristeza apenas mueve las manos). */
const ADEMANES_POR_EMOCION: Readonly<Record<EmocionNpc, number>> = {
  neutral: 1,
  tranquilo: 0.8,
  aliviado: 1,
  triste: 0.55,
  ansioso: 1.1,
  molesto: 1.2,
  abrumado: 0.8,
};
/** Negación leve con la cabeza al decir «nunca», «tampoco»…: duración (s) y giro (rad). */
const NEGAR_LEVE = { duracion: 0.8, giro: 0.085 };
/**
 * Cuánto pueden bajar la cabeza la emoción y los gestos juntos (rad), y cuánto puede bajar
 * además la mirada: abrumado, con la mano en la frente y mirando al suelo, la cara dejaría de
 * verse, y leerla es lo que practica el estudiante.
 */
const CABEZA_ABAJO_MAX = 0.32;
const MIRADA_ABAJO_MAX = 0.42;

export interface OpcionesAnimador {
  postura: Postura;
  /** Altura (m) del asiento sobre el suelo, si está sentado. */
  alturaAsiento: number;
  piernas?: Piernas;
  /** `prefers-reduced-motion`: gestos más pequeños y sin los amplios. */
  movimientoReducido?: boolean;
  /** Fuente de azar (0–1), para pruebas reproducibles. */
  azar?: () => number;
}

/** Ajuste del cuerpo que suman los gestos en curso en este fotograma. */
interface AjusteGestos {
  inclinacion: number;
  ladeo: number;
  giro: number;
  cabeceo: number;
  ladeoCabeza: number;
  /** Multiplica el contacto visual. */
  contacto: number;
  /** Mirada a otra parte (ventana, suelo) y cuánto manda (0–1). */
  miradaGiro: number;
  miradaCabeceo: number;
  pesoMirada: number;
  cejaAltura: number;
  cejaInclinacion: number;
  cejaAsimetria: number;
  sonrisa: number;
  apertura: number;
}

interface HuesosExpresivos {
  spine?: Bone;
  chest?: Bone;
  neck?: Bone;
  head?: Bone;
  eye_L?: Bone;
  eye_R?: Bone;
  upperArm_L?: Bone;
  upperArm_R?: Bone;
  foreArm_L?: Bone;
  foreArm_R?: Bone;
  hand_L?: Bone;
  hand_R?: Bone;
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
  private intensidad: IntensidadEmocion = INTENSIDAD_POR_DEFECTO;
  /** El estudiante está escribiendo: el paciente lo escucha. */
  private escuchando = false;
  private objetivo: Expresion = { ...EXPRESION_NEUTRA };
  private inicioAsentir = -Infinity;
  private inicioAcomodo = -Infinity;
  /** Última señal del estudiante (o cambio de estado), para medir sus silencios. */
  private ultimaSenal = 0;
  /** 0 = sin reaccionar al silencio, 1 = ya se acomodó, 2 = ya suspiró. */
  private faseSilencio = 0;
  private inicioProcesando = 0;
  private rellenoHecho = false;
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
  private readonly ladoDesviado: 1 | -1;

  // ---------- Gestos procedurales (`repertorio-gestos.ts`) ----------
  private readonly azar: () => number;
  private readonly sentado: boolean;
  private readonly reducido: boolean;
  /** La mayoría gesticula con la derecha. */
  private readonly diestro: boolean;
  /** Brazos con cinemática inversa (si el personaje tiene el esqueleto esperado). */
  private readonly brazos: BrazosPaciente | null = null;
  private readonly gestoBrazos: GestoEnCurso = gestoVacio();
  private readonly gestoPostura: GestoEnCurso = gestoVacio();
  /** Las dos capas, para recorrerlas sin crear un arreglo en cada fotograma. */
  private readonly capas: readonly GestoEnCurso[] = [this.gestoBrazos, this.gestoPostura];
  /** Gesto pedido mientras otro ocupaba los brazos: empieza cuando vuelvan al reposo. */
  private pendiente: GestoProcedural | null = null;
  private ultimoGesto: GestoProcedural | null = null;
  private proximoGesto: number;
  /** El próximo gesto espontáneo debe ser de la emoción (acaba de cambiar). */
  private gestoEmocional = false;
  /** Gesticula por su cuenta (en el laboratorio se apaga para ver un gesto a la vez). */
  private espontaneos = true;
  private readonly estadoBrazos: EstadoBrazos = {
    gesto: null,
    peso: 0,
    lado: -1,
    amplitud: 1,
    tiempo: 0,
    disponibles: 1,
  };
  private readonly ajuste: AjusteGestos = {
    inclinacion: 0,
    ladeo: 0,
    giro: 0,
    cabeceo: 0,
    ladeoCabeza: 0,
    contacto: 1,
    miradaGiro: 0,
    miradaCabeceo: 0,
    pesoMirada: 0,
    cejaAltura: 0,
    cejaInclinacion: 0,
    cejaAsimetria: 0,
    sonrisa: 0,
    apertura: 0,
  };
  /** Expresión que recibe el rostro (la de la emoción más la de los gestos), sin copias. */
  private readonly expresionRostro: Expresion = { ...EXPRESION_NEUTRA };
  /** Ademanes y frases clave de la respuesta en curso. */
  private ademanes: readonly Ademan[] = [];
  private momentos: readonly MomentoClave[] = [];
  private siguienteMomento = 0;
  private inicioNegar = -Infinity;

  private readonly q = new Quaternion();
  private readonly ejeX = new Vector3(1, 0, 0);
  private readonly ejeY = new Vector3(0, 1, 0);
  private readonly ejeZ = new Vector3(0, 0, 1);
  private readonly camaraLocal = new Vector3();
  private readonly ojos = new Vector3();

  constructor(
    glb: GlbCargado,
    {
      postura,
      alturaAsiento,
      piernas,
      movimientoReducido = false,
      azar = Math.random,
    }: OpcionesAnimador
  ) {
    this.azar = azar;
    this.reducido = movimientoReducido;
    this.ladoDesviado = azar() < 0.5 ? -1 : 1;
    this.diestro = azar() < 0.88;
    this.proximoGesto = PRIMER_GESTO_S[0] + azar() * (PRIMER_GESTO_S[1] - PRIMER_GESTO_S[0]);
    this.rig = new RigNpc(glb, 'paciente');
    this.modelo = this.rig.raiz;
    this.mixer = new AnimationMixer(this.rig.copia);

    // La mira apunta a una caja invisible (ver `PacientePersonaje`): lanzar rayos contra mallas
    // con esqueleto obliga a deformar miles de vértices en cada consulta.
    for (const malla of this.rig.mallas) malla.raycast = () => {};

    const sentado = postura === 'sentado';
    this.sentado = sentado;
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
      upperArm_L: hueso('upperArm_L'),
      upperArm_R: hueso('upperArm_R'),
      foreArm_L: hueso('foreArm_L'),
      foreArm_R: hueso('foreArm_R'),
      hand_L: hueso('hand_L'),
      hand_R: hueso('hand_R'),
    };
    // Los brazos no: los devuelve a la pose del mixer `BrazosPaciente.antesDelMixer`.
    const { spine, chest, neck, head, eye_L, eye_R } = this.huesos;
    this.reposo = [spine, chest, neck, head, eye_L, eye_R]
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
    try {
      this.brazos = new BrazosPaciente(this.rig, sentado);
    } catch {
      // Sin los huesos esperados, el paciente conserva los clips y la capa del torso.
      this.brazos = null;
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
  actualizarConducta = (
    estado: EstadoNpc,
    emocion: EmocionNpc,
    intensidad: IntensidadEmocion = INTENSIDAD_POR_DEFECTO
  ) => {
    if (emocion !== this.emocion && EMOCIONES_CON_SUSPIRO.has(emocion)) {
      this.inicioSuspiro = this.tiempo;
    }
    const nuevaEmocion = emocion !== this.emocion;
    if (estado !== this.estado) {
      this.ultimaSenal = this.tiempo;
      this.faseSilencio = 0;
      if (estado === 'procesando') {
        this.inicioProcesando = this.tiempo;
        this.rellenoHecho = false;
      }
    }
    this.emocion = emocion;
    this.intensidad = intensidad;
    if (estado !== 'respondiendo') {
      this.silabas = [];
      this.ademanes = [];
      this.momentos = [];
    }
    this.estado = estado;
    this.recalcularObjetivo();

    // Los gestos que ya no caben terminan; con una emoción nueva, pronto se le nota.
    this.descartarGestos(nuevaEmocion);
    if (nuevaEmocion) {
      this.gestoEmocional = true;
      this.adelantarGesto(GESTO_DE_EMOCION_S);
    }

    const bucle = clipEnBucle(estado);
    if (bucle === this.bucle) return;
    this.bucle = bucle;
    // Si hay un gesto en curso, al terminar vuelve al bucle nuevo.
    if (!this.gesto) this.reproducir(bucle);
  };

  private recalcularObjetivo() {
    const base = expresionPara(this.estado, this.emocion, this.intensidad);
    this.objetivo =
      this.escuchando && this.estado === 'esperando_input' ? expresionEscuchando(base) : base;
  }

  /** El estudiante empieza o deja de escribir: el paciente lo escucha con atención. */
  escuchar = (escribiendo: boolean) => {
    this.ultimaSenal = this.tiempo;
    this.faseSilencio = 0;
    if (escribiendo === this.escuchando) return;
    this.escuchando = escribiendo;
    this.recalcularObjetivo();
    if (escribiendo) {
      // Mirar por la ventana mientras le hablan se lee como desinterés: lo deja. Con suerte se
      // inclina hacia delante o junta las manos, atento.
      this.descartarGestos(false);
      this.adelantarGesto([0.8, 2.5]);
    }
  };

  /**
   * Asentimiento breve de escucha (cuando el estudiante hace una pausa tras escribir): una señal
   * de «te sigo», mucho más pequeña que el gesto de asentir al responder.
   */
  asentirLeve = () => {
    this.ultimaSenal = this.tiempo;
    if (this.estado !== 'esperando_input' || this.gesto) return;
    if (this.tiempo - this.inicioAsentir < DURACION_ASENTIR_S * 2) return;
    this.inicioAsentir = this.tiempo;
  };

  /** El estudiante volvió a un momento anterior: el paciente parpadea, respira y se recompone. */
  reiniciarMomento = () => {
    this.ultimaSenal = this.tiempo;
    this.faseSilencio = 0;
    this.inicioSuspiro = this.tiempo;
    this.proximoParpadeo = this.tiempo;
  };

  /**
   * Gesto puntual: un clip (saludar, asentir, negar…), que al terminar vuelve al bucle del
   * estado, o uno procedural (encogerse, mano al pecho…), que vuelve solo al reposo. Si los
   * brazos están en otro gesto, primero lo deshace.
   */
  hacerGesto = (id: GestoPaciente) => {
    if (esGestoProcedural(id)) {
      this.pedirGesto(id);
      return;
    }
    if (!this.acciones.has(id) || metaAccion(id).bucle) return;
    // El clip usa los brazos: el gesto procedural se deshace mientras tanto.
    if (!CLIPS_SIN_BRAZOS.has(id)) cortarGesto(this.gestoBrazos, this.tiempo);
    this.gesto = id;
    this.reproducir(id);
  };

  /** Activa o apaga los gestos espontáneos (los pedidos con `hacerGesto` siguen funcionando). */
  permitirGestosEspontaneos = (permitir: boolean) => {
    this.espontaneos = permitir;
  };

  /** Gesto procedural en curso en cada capa (para pruebas, depuración y el laboratorio). */
  get gestosEnCurso(): { brazos: GestoProcedural | null; postura: GestoProcedural | null } {
    return { brazos: this.gestoBrazos.gesto, postura: this.gestoPostura.gesto };
  }

  /**
   * Mueve la boca con el plan de sílabas de la voz inventada (el mismo que suena), desde ahora.
   * Sin plan, mientras responde, la boca se mueve con un balbuceo genérico.
   */
  hablar = (silabas: readonly Silaba[], texto = '') => {
    this.silabas = silabas;
    this.inicioHabla = this.tiempo;
    // Al tomar la palabra levanta un poco las cejas.
    this.inicioCejas = this.tiempo;
    // Ademanes al ritmo de las sílabas y reacciones a las frases clave, en su momento.
    this.ademanes = ademanesDeHabla(silabas, this.intensidad, this.emocion, this.diestro);
    const ultima = silabas.at(-1);
    const duracion = ultima ? ultima.inicio + ultima.duracion : texto.length * 0.04;
    this.momentos = texto ? momentosClave(texto, duracion) : [];
    this.siguienteMomento = 0;
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
    this.brazos?.antesDelMixer();
    this.mixer.update(dt);

    const t = 1 - Math.exp(-RAPIDEZ_EXPRESION * dt);
    const e = this.expresion;
    for (const clave of Object.keys(e) as (keyof Expresion)[]) {
      e[clave] = aproximar(e[clave], this.objetivo[clave], t);
    }

    this.reaccionarAlTiempo();
    this.reaccionarAlHabla();
    this.programarGestos();
    this.calcularAjuste(dt);
    this.aplicarCuerpo(dt);
    this.aplicarMirada(dt, camara);
    this.brazos?.aplicar(this.estadoBrazos);
    this.aplicarAdemanes();
    this.aplicarOjos();
    this.aplicarRostro();
  };

  /**
   * Conductas que dependen de cuánto dura algo: el relleno mientras la IA tarda (suspira o alza
   * las cejas, como quien busca las palabras) y la reacción al silencio del estudiante (primero se
   * acomoda y lo mira esperando; luego suspira).
   */
  private reaccionarAlTiempo() {
    const tiempo = this.tiempo;
    if (
      this.estado === 'procesando' &&
      !this.rellenoHecho &&
      tiempo - this.inicioProcesando > RETRASO_RELLENO_MS / 1000
    ) {
      this.rellenoHecho = true;
      if (RELLENO_CON_SUSPIRO.has(this.emocion)) this.inicioSuspiro = tiempo;
      else this.inicioCejas = tiempo;
    }

    if (this.estado !== 'esperando_input' || this.escuchando) return;
    const silencio = tiempo - this.ultimaSenal;
    if (this.faseSilencio === 0 && silencio > SILENCIO_ACOMODARSE_S) {
      this.faseSilencio = 1;
      this.inicioAcomodo = tiempo;
      this.inicioCejas = tiempo + DURACION_ACOMODO_S * 0.6;
    } else if (this.faseSilencio === 1 && silencio > SILENCIO_SUSPIRAR_S) {
      this.faseSilencio = 2;
      this.inicioSuspiro = tiempo;
    }
  }

  // ---------- Gestos procedurales ----------
  private contextoGesto(): ContextoGesto {
    return {
      estado: this.estado,
      emocion: this.emocion,
      intensidad: this.intensidad,
      escuchando: this.escuchando,
      sentado: this.sentado,
      reducido: this.reducido,
      ultimo: this.ultimoGesto,
      brazosOcupados: this.gestoBrazos.gesto !== null || this.gesto !== null || !this.brazos,
      posturaOcupada: this.gestoPostura.gesto !== null,
    };
  }

  /** Adelanta el próximo gesto espontáneo a dentro de [min, max] segundos (si tocaba después). */
  private adelantarGesto([minimo, maximo]: readonly [number, number]) {
    this.proximoGesto = Math.min(
      this.proximoGesto,
      this.tiempo + minimo + this.azar() * (maximo - minimo)
    );
  }

  /** Pide un gesto concreto (una frase clave, el laboratorio): ahora o al terminar el que hay. */
  private pedirGesto(gesto: GestoProcedural) {
    const meta = METADATOS_GESTOS[gesto];
    if (meta.amplio && this.reducido) return;
    if (meta.soloSentado && !this.sentado) return;
    if (meta.capa === 'brazos' && !this.brazos) return;
    const capa = meta.capa === 'brazos' ? this.gestoBrazos : this.gestoPostura;
    if (capa.gesto === gesto && capa.corte === null) return;
    if (capa.gesto) {
      // Primero vuelve al reposo: los gestos nunca se encadenan sin pasar por él.
      cortarGesto(capa, this.tiempo);
      if (meta.capa === 'brazos') this.pendiente = gesto;
      return;
    }
    this.iniciarGesto(gesto);
  }

  private iniciarGesto(gesto: GestoProcedural) {
    const meta = METADATOS_GESTOS[gesto];
    const capa = meta.capa === 'brazos' ? this.gestoBrazos : this.gestoPostura;
    capa.gesto = gesto;
    capa.inicio = this.tiempo;
    capa.sostener = duracionSostenida(gesto, this.intensidad, this.azar());
    capa.corte = null;
    capa.pesoCorte = 0;
    // Con una mano: la dominante (a veces la otra). La mirada y el peso, hacia su lado de
    // costumbre (la ventana siempre está en el mismo sitio).
    const dominante: 1 | -1 = this.diestro ? -1 : 1;
    const otra = -dominante as 1 | -1;
    if (meta.capa === 'brazos') capa.lado = this.azar() < 0.8 ? dominante : otra;
    else if (gesto === 'cambiar_peso') capa.lado = this.azar() < 0.5 ? 1 : -1;
    else capa.lado = this.ladoDesviado;
    this.ultimoGesto = gesto;
  }

  /** Deshace los gestos que ya no caben (estado, escucha) o que eran de otra emoción. */
  private descartarGestos(nuevaEmocion: boolean) {
    const contexto = this.contextoGesto();
    contexto.brazosOcupados = false;
    contexto.posturaOcupada = false;
    for (const capa of this.capas) {
      if (!capa.gesto || capa.corte !== null) continue;
      const ajeno = nuevaEmocion && !gestoDeLaEmocion(capa.gesto, this.emocion);
      if (ajeno || !gestoPermitido(capa.gesto, contexto)) cortarGesto(capa, this.tiempo);
    }
    if (this.pendiente && !gestoPermitido(this.pendiente, contexto)) this.pendiente = null;
  }

  /** Termina los gestos que ya volvieron al reposo y, si toca, empieza otro. */
  private programarGestos() {
    const tiempo = this.tiempo;
    for (const capa of this.capas) {
      if (capa.gesto && gestoTerminado(capa, tiempo)) capa.gesto = null;
    }
    if (this.pendiente && !this.gestoBrazos.gesto) {
      const pendiente = this.pendiente;
      this.pendiente = null;
      this.iniciarGesto(pendiente);
    }
    if (!this.espontaneos || tiempo < this.proximoGesto) return;

    const contexto = this.contextoGesto();
    const gesto = this.gestoEmocional
      ? (gestoDeEmocion(contexto, this.azar()) ?? elegirGesto(contexto, this.azar()))
      : elegirGesto(contexto, this.azar());
    this.gestoEmocional = false;
    if (!gesto) {
      // Nada cabe ahora (pensando, los brazos ocupados…): vuelve a mirar en un rato.
      this.proximoGesto = tiempo + 1.5 + this.azar() * 2;
      return;
    }
    this.iniciarGesto(gesto);
    const meta = METADATOS_GESTOS[gesto];
    const capa = meta.capa === 'brazos' ? this.gestoBrazos : this.gestoPostura;
    this.proximoGesto =
      tiempo +
      meta.entrada +
      capa.sostener +
      meta.salida +
      pausaEntreGestos(this.estado, this.intensidad, this.reducido, this.azar());
  }

  /** Mientras responde: las frases clave en su momento (encogerse, mano al pecho, cejas…). */
  private reaccionarAlHabla() {
    if (this.estado !== 'respondiendo') return;
    const t = this.tiempo - this.inicioHabla;
    while (this.siguienteMomento < this.momentos.length) {
      const momento = this.momentos[this.siguienteMomento]!;
      if (momento.t > t) break;
      this.siguienteMomento++;
      switch (momento.reaccion) {
        case 'alzar_cejas':
          this.inicioCejas = this.tiempo;
          break;
        case 'negar_leve':
          // Si ya está negando con el clip, no hace falta.
          if (this.gesto !== 'no') this.inicioNegar = this.tiempo;
          break;
        default:
          if (this.reducido && METADATOS_GESTOS[momento.reaccion].amplio) {
            // Sin gestos amplios, la duda se dice con las cejas.
            this.inicioCejas = this.tiempo;
          } else if (!this.gesto || CLIPS_SIN_BRAZOS.has(this.gesto)) {
            this.pedirGesto(momento.reaccion);
          }
      }
    }
  }

  /**
   * Suma el ajuste de los gestos en curso (torso, cabeza, mirada, rostro) y prepara el estado de
   * los brazos para este fotograma.
   */
  private calcularAjuste(dt: number) {
    const a = this.ajuste;
    a.inclinacion = a.ladeo = a.giro = a.cabeceo = a.ladeoCabeza = 0;
    a.miradaGiro = a.miradaCabeceo = a.pesoMirada = 0;
    a.cejaAltura = a.cejaInclinacion = a.cejaAsimetria = a.sonrisa = a.apertura = 0;
    a.contacto = 1;
    const amplitud = amplitudGestos(this.intensidad, this.reducido);

    for (const capa of this.capas) {
      if (!capa.gesto) continue;
      const w = pesoDeGesto(capa, this.tiempo);
      if (w <= 0) continue;
      const ajuste = AJUSTES_CUERPO[capa.gesto];
      const lado = capa.lado;
      const k = w * amplitud;
      a.inclinacion += (ajuste.inclinacion ?? 0) * k;
      a.ladeo += (ajuste.ladeo ?? 0) * k * lado;
      a.giro += (ajuste.giro ?? 0) * k * lado;
      a.cabeceo += (ajuste.cabeceo ?? 0) * k;
      a.ladeoCabeza += (ajuste.ladeoCabeza ?? 0) * k * lado;
      a.contacto *= 1 - w * (1 - (ajuste.mirada ?? 1));
      if (ajuste.miradaGiro !== undefined && w > a.pesoMirada) {
        const alcance = Math.min(1, amplitud);
        a.pesoMirada = w;
        a.miradaGiro = ajuste.miradaGiro * alcance * lado;
        a.miradaCabeceo = (ajuste.miradaCabeceo ?? 0) * alcance;
      }
      const rostro = ajuste.rostro;
      if (rostro) {
        a.cejaAltura += (rostro.cejaAltura ?? 0) * w;
        a.cejaInclinacion += (rostro.cejaInclinacion ?? 0) * w;
        a.cejaAsimetria += (rostro.cejaAsimetria ?? 0) * w;
        a.sonrisa += (rostro.sonrisa ?? 0) * w;
        a.apertura += (rostro.apertura ?? 0) * w;
      }
    }

    // Topes: la cara siempre a la vista.
    a.cabeceo = Math.min(a.cabeceo, Math.max(0, CABEZA_ABAJO_MAX - this.objetivo.cabeceo));
    a.miradaCabeceo = Math.max(
      a.miradaCabeceo,
      -Math.max(0.12, MIRADA_ABAJO_MAX - this.objetivo.cabeceo - a.cabeceo)
    );

    // Los brazos procedurales ceden ante los clips que los animan (pensar, saludar…).
    const clip = this.gesto ?? this.bucle;
    const libres = CLIPS_SIN_BRAZOS.has(clip) ? 1 : 0;
    const b = this.estadoBrazos;
    b.disponibles = aproximar(b.disponibles, libres, 1 - Math.exp(-dt / (MEZCLA_S * 0.6)));
    b.gesto = this.gestoBrazos.gesto;
    b.peso = pesoDeGesto(this.gestoBrazos, this.tiempo);
    b.lado = this.gestoBrazos.lado;
    b.amplitud = amplitud;
    b.tiempo = this.tiempo - this.gestoBrazos.inicio;
  }

  /**
   * Ademanes al hablar: la mano se levanta un poco del regazo en las sílabas marcadas (y se
   * abre al empezar una idea). Se suman a la pose de los brazos y ceden ante un gesto en curso.
   */
  private aplicarAdemanes() {
    // Sin `BrazosPaciente`, nada devolvería los brazos a su pose: los ademanes se acumularían.
    if (!this.brazos || this.estado !== 'respondiendo' || this.ademanes.length === 0) return;
    const b = this.estadoBrazos;
    const libre = b.disponibles * (1 - b.peso);
    if (libre <= 0.01) return;
    const t = this.tiempo - this.inicioHabla;
    const amplitud =
      amplitudGestos(this.intensidad, this.reducido) * ADEMANES_POR_EMOCION[this.emocion] * libre;
    for (const ademan of this.ademanes) {
      const d = t - ademan.t;
      if (d < 0) break;
      if (d > ADEMAN.duracion) continue;
      const pulso =
        d < ADEMAN.subida
          ? Math.sin((Math.PI / 2) * (d / ADEMAN.subida))
          : Math.exp(-(d - ADEMAN.subida) / ADEMAN.caida);
      const k = pulso * ademan.fuerza * amplitud;
      const izquierdo = ademan.lado === 1;
      const superior = izquierdo ? this.huesos.upperArm_L : this.huesos.upperArm_R;
      const antebrazo = izquierdo ? this.huesos.foreArm_L : this.huesos.foreArm_R;
      const mano = izquierdo ? this.huesos.hand_L : this.huesos.hand_R;
      if (!superior || !antebrazo || !mano) continue;
      // Flexionar levanta la mano; el abierto, además, la lleva hacia fuera con la palma arriba.
      this.rotar(superior, this.ejeX, -0.1 * k);
      this.rotar(antebrazo, this.ejeX, -ADEMAN.antebrazo * k);
      this.rotar(mano, this.ejeX, (ademan.abierto ? 0.35 : -0.15) * k);
      if (ademan.abierto) {
        this.rotar(superior, this.ejeZ, 0.12 * k * ademan.lado);
        this.rotar(antebrazo, this.ejeZ, 0.3 * k * ademan.lado);
      }
    }
  }

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

    // Asentimiento de escucha: dos cabeceos pequeños.
    const a = (tiempo - this.inicioAsentir) / DURACION_ASENTIR_S;
    const asentir = a >= 0 && a < 1 ? AMPLITUD_ASENTIR * Math.sin(2 * Math.PI * a) ** 2 : 0;
    // Acomodarse en la silla: se endereza, gira un poco el torso y vuelve.
    const c = (tiempo - this.inicioAcomodo) / DURACION_ACOMODO_S;
    const acomodo = c >= 0 && c < 1 ? Math.sin(Math.PI * c) : 0;

    // Negación leve con la cabeza (frases clave): dos giros cortos que se apagan.
    const n = (tiempo - this.inicioNegar) / NEGAR_LEVE.duracion;
    const negar =
      n >= 0 && n < 1
        ? NEGAR_LEVE.giro *
          amplitudGestos(this.intensidad, this.reducido) *
          Math.sin(4 * Math.PI * n) *
          (1 - n)
        : 0;

    // Gestos: inclinarse, cambiar el peso (el torso se ladea; la cabeza compensa).
    const g = this.ajuste;
    if (spine) {
      this.rotar(spine, this.ejeX, e.encorvado * 0.55 - acomodo * 0.06 + g.inclinacion * 0.55);
      this.rotar(spine, this.ejeZ, -g.ladeo);
    }
    if (chest) {
      this.rotar(chest, this.ejeX, e.encorvado * 0.45 - respiracion + g.inclinacion * 0.45);
      this.rotar(
        chest,
        this.ejeY,
        inquietud * 0.6 + e.habla * 0.025 * Math.sin(tiempo * 2.3) + acomodo * 0.07 + g.giro
      );
      this.rotar(chest, this.ejeZ, e.inquietud * 0.012 * Math.sin(tiempo * 3.7));
    }
    if (head) {
      this.rotar(head, this.ejeX, e.cabeceo + habla + respiracion * 0.3 + asentir + g.cabeceo);
      this.rotar(head, this.ejeZ, e.ladeo - g.ladeoCabeza);
      this.rotar(head, this.ejeY, inquietud + negar);
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
    const g = this.ajuste;
    const contacto = visible ? this.expresion.contactoVisual * cercania * g.contacto : 0;

    // Sin contacto mira a un lado; un gesto puede llevar la mirada a la ventana o al suelo.
    const desviadaGiro = MathUtils.lerp(
      MIRADA_DESVIADA.giro * this.ladoDesviado,
      g.miradaGiro,
      g.pesoMirada
    );
    const desviadaCabeceo = MathUtils.lerp(MIRADA_DESVIADA.cabeceo, g.miradaCabeceo, g.pesoMirada);
    const objetivoGiro = MathUtils.lerp(
      desviadaGiro,
      MathUtils.clamp(giro, -GIRO_MAXIMO, GIRO_MAXIMO),
      contacto
    );
    const objetivoCabeceo = MathUtils.lerp(
      desviadaCabeceo,
      MathUtils.clamp(Math.atan2(dy, horizontal), -CABECEO_MAXIMO, CABECEO_MAXIMO),
      contacto
    );
    // Sin nadie a quien mirar, la mirada desviada se suaviza hacia el frente.
    const peso = visible || g.pesoMirada > 0 ? 1 : 0.4;
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

    // La expresión de la emoción más la de los gestos en curso (encogerse alza las cejas…).
    const e = Object.assign(this.expresionRostro, this.expresion);
    const g = this.ajuste;
    e.cejaAltura += pulsoCejas + g.cejaAltura;
    e.cejaInclinacion += g.cejaInclinacion;
    e.cejaAsimetria += g.cejaAsimetria;
    e.sonrisa += g.sonrisa;
    this.rostro.aplicar(e, this.cierre, habla);
  }

  /** Rota un hueso sobre uno de sus ejes locales (después de lo que dejó el mixer). */
  private rotar(hueso: Bone, eje: Vector3, angulo: number) {
    if (angulo !== 0) hueso.quaternion.multiply(this.q.setFromAxisAngle(eje, angulo));
  }
}
