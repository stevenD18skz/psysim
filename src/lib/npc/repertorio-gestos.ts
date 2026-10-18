import { type EmocionNpc, type IntensidadEmocion } from '@/lib/conversacion/emociones';
import { type EstadoNpc } from '@/lib/conversacion/estados-npc';

/**
 * Repertorio de gestos procedurales del paciente (lógica pura, sin Three.js): qué gestos hay,
 * cuál hacer y cuándo, y cuánto se notan. `BrazosPaciente` los ejecuta y `AnimadorPaciente`
 * decide el momento.
 *
 *   emoción + intensidad ─┐
 *   estado + escucha ─────┼─▶ siguiente gesto (sin repetir el último) a intervalos irregulares
 *   movimiento reducido ──┘   + amplitud y duración según la intensidad
 *
 * Hay dos capas que pueden coincidir: la de los brazos (un solo gesto a la vez: cruzarlos, mano
 * al pecho…) y la de la postura (cambiar el peso, mirar por la ventana o al suelo).
 */

export const GESTOS_PROCEDURALES = [
  'frotar_manos',
  'entrelazar_manos',
  'mano_al_pecho',
  'brazos_cruzados',
  'mano_a_la_cara',
  'mano_a_la_frente',
  'encogerse',
  'inclinarse',
  'tocar_ropa',
  'tocar_pelo',
  'cambiar_peso',
  'mirar_ventana',
  'mirar_suelo',
] as const;

export type GestoProcedural = (typeof GESTOS_PROCEDURALES)[number];

export function esGestoProcedural(valor: string): valor is GestoProcedural {
  return (GESTOS_PROCEDURALES as readonly string[]).includes(valor);
}

export interface MetaGesto {
  etiqueta: string;
  /** Los gestos de brazos no se superponen entre sí; los de postura sí con ellos. */
  capa: 'brazos' | 'postura';
  /** Fundido de entrada y de salida (s). */
  entrada: number;
  salida: number;
  /** Cuánto se sostiene (s): un valor entre el mínimo y el máximo. */
  sostener: readonly [number, number];
  /** Gesto amplio (llevar la mano a la cara, cruzar los brazos…): se omite con movimiento reducido. */
  amplio: boolean;
  /** Necesita el regazo o las rodillas: solo sentado. */
  soloSentado: boolean;
  /**
   * Cabe mientras el estudiante escribe. Mirar por la ventana o rascarse la cabeza mientras te
   * hablan se lee como desinterés; inclinarse o entrelazar las manos, como atención.
   */
  duranteEscucha: boolean;
  /** Cabe mientras el paciente habla (además de los ademanes, que van aparte). */
  alHablar: boolean;
}

export const METADATOS_GESTOS: Readonly<Record<GestoProcedural, MetaGesto>> = {
  frotar_manos: {
    etiqueta: 'Frotarse las manos',
    capa: 'brazos',
    entrada: 0.7,
    salida: 0.8,
    sostener: [2.2, 4],
    amplio: false,
    soloSentado: false,
    duranteEscucha: true,
    alHablar: true,
  },
  entrelazar_manos: {
    etiqueta: 'Entrelazar las manos',
    capa: 'brazos',
    entrada: 0.8,
    salida: 0.9,
    sostener: [3.5, 7],
    amplio: false,
    soloSentado: false,
    duranteEscucha: true,
    alHablar: true,
  },
  mano_al_pecho: {
    etiqueta: 'Mano al pecho',
    capa: 'brazos',
    entrada: 0.8,
    salida: 0.9,
    sostener: [2, 3.5],
    amplio: false,
    soloSentado: false,
    duranteEscucha: true,
    alHablar: true,
  },
  brazos_cruzados: {
    etiqueta: 'Cruzar los brazos',
    capa: 'brazos',
    entrada: 0.9,
    salida: 1,
    sostener: [6, 12],
    amplio: true,
    soloSentado: false,
    duranteEscucha: true,
    alHablar: true,
  },
  mano_a_la_cara: {
    etiqueta: 'Mano a la cara',
    capa: 'brazos',
    entrada: 0.9,
    salida: 1,
    sostener: [2.2, 4],
    amplio: true,
    soloSentado: false,
    duranteEscucha: true,
    alHablar: false,
  },
  mano_a_la_frente: {
    etiqueta: 'Mano a la frente',
    capa: 'brazos',
    entrada: 1,
    salida: 1.1,
    sostener: [2.5, 4.5],
    amplio: true,
    soloSentado: false,
    duranteEscucha: true,
    alHablar: false,
  },
  encogerse: {
    etiqueta: 'Encogerse de hombros',
    capa: 'brazos',
    entrada: 0.35,
    salida: 0.6,
    sostener: [0.35, 0.6],
    amplio: true,
    soloSentado: false,
    duranteEscucha: false,
    alHablar: true,
  },
  inclinarse: {
    etiqueta: 'Inclinarse hacia delante',
    capa: 'brazos',
    entrada: 1.2,
    salida: 1.2,
    sostener: [4, 8],
    amplio: true,
    soloSentado: true,
    duranteEscucha: true,
    alHablar: true,
  },
  tocar_ropa: {
    etiqueta: 'Alisarse la ropa',
    capa: 'brazos',
    entrada: 0.7,
    salida: 0.7,
    sostener: [1.6, 2.6],
    amplio: false,
    soloSentado: true,
    duranteEscucha: false,
    alHablar: false,
  },
  tocar_pelo: {
    etiqueta: 'Tocarse el pelo',
    capa: 'brazos',
    entrada: 0.8,
    salida: 0.8,
    sostener: [1.2, 2.2],
    amplio: true,
    soloSentado: false,
    duranteEscucha: false,
    alHablar: false,
  },
  cambiar_peso: {
    etiqueta: 'Cambiar el peso',
    capa: 'postura',
    entrada: 1.4,
    salida: 1.6,
    sostener: [3, 7],
    amplio: false,
    soloSentado: false,
    duranteEscucha: true,
    alHablar: true,
  },
  mirar_ventana: {
    etiqueta: 'Mirar por la ventana',
    capa: 'postura',
    entrada: 0.7,
    salida: 0.9,
    sostener: [1.8, 3.5],
    amplio: true,
    soloSentado: false,
    duranteEscucha: false,
    alHablar: false,
  },
  mirar_suelo: {
    etiqueta: 'Mirar al suelo',
    capa: 'postura',
    entrada: 0.6,
    salida: 0.8,
    sostener: [1.4, 3],
    amplio: false,
    soloSentado: false,
    duranteEscucha: false,
    alHablar: false,
  },
};

export interface Opcion {
  gesto: GestoProcedural;
  peso: number;
}

/**
 * Gestos que delatan cada emoción (los adaptadores y emblemas de Ekman y Friesen, 1969): la
 * ansiedad se descarga en las manos, la tristeza va al pecho, el enojo se cierra con los brazos
 * cruzados y quien se siente desbordado se sostiene la cabeza.
 */
export const GESTOS_POR_EMOCION: Readonly<Record<EmocionNpc, readonly Opcion[]>> = {
  neutral: [
    { gesto: 'entrelazar_manos', peso: 1 },
    { gesto: 'inclinarse', peso: 0.5 },
  ],
  tranquilo: [
    { gesto: 'inclinarse', peso: 1 },
    { gesto: 'entrelazar_manos', peso: 0.7 },
  ],
  triste: [
    { gesto: 'mano_al_pecho', peso: 1 },
    { gesto: 'mirar_suelo', peso: 0.8 },
    { gesto: 'entrelazar_manos', peso: 0.4 },
  ],
  ansioso: [
    { gesto: 'frotar_manos', peso: 1 },
    { gesto: 'entrelazar_manos', peso: 0.7 },
    { gesto: 'tocar_pelo', peso: 0.4 },
    { gesto: 'cambiar_peso', peso: 0.5 },
  ],
  abrumado: [
    { gesto: 'mano_a_la_frente', peso: 1 },
    { gesto: 'mano_a_la_cara', peso: 0.8 },
    { gesto: 'mirar_suelo', peso: 0.5 },
  ],
  molesto: [
    { gesto: 'brazos_cruzados', peso: 1 },
    { gesto: 'cambiar_peso', peso: 0.4 },
  ],
  aliviado: [
    { gesto: 'inclinarse', peso: 1 },
    { gesto: 'mano_al_pecho', peso: 0.8 },
  ],
};

/** Variaciones del reposo, para que la espera no se repita en bucle. */
export const VARIACIONES_REPOSO: readonly Opcion[] = [
  { gesto: 'cambiar_peso', peso: 1 },
  { gesto: 'mirar_ventana', peso: 0.8 },
  { gesto: 'mirar_suelo', peso: 0.6 },
  { gesto: 'tocar_ropa', peso: 0.7 },
  { gesto: 'tocar_pelo', peso: 0.5 },
];

/** Cuánto pesan los gestos de la emoción frente a las variaciones del reposo, por intensidad. */
const PESO_EMOCION: Readonly<Record<IntensidadEmocion, number>> = { 1: 0.6, 2: 1, 3: 1.7 };
/** Emociones sin carga: el reposo varía tanto como en ausencia de emoción. */
const EMOCIONES_SERENAS: ReadonlySet<EmocionNpc> = new Set(['neutral', 'tranquilo']);

/** Amplitud de los gestos según la intensidad (1–3); a la mitad con movimiento reducido. */
const AMPLITUD: Readonly<Record<IntensidadEmocion, number>> = { 1: 0.65, 2: 1, 3: 1.25 };
/** Frecuencia de los gestos según la intensidad: con más intensidad, más seguidos. */
const FRECUENCIA: Readonly<Record<IntensidadEmocion, number>> = { 1: 0.7, 2: 1, 3: 1.45 };
const FACTOR_REDUCIDO = 0.5;

export function amplitudGestos(intensidad: IntensidadEmocion, reducido = false): number {
  return AMPLITUD[intensidad] * (reducido ? FACTOR_REDUCIDO : 1);
}

export function frecuenciaGestos(intensidad: IntensidadEmocion, reducido = false): number {
  return FRECUENCIA[intensidad] * (reducido ? FACTOR_REDUCIDO : 1);
}

export interface ContextoGesto {
  estado: EstadoNpc;
  emocion: EmocionNpc;
  intensidad: IntensidadEmocion;
  /** El estudiante está escribiendo. */
  escuchando: boolean;
  sentado: boolean;
  reducido: boolean;
  /** Último gesto que hizo (no lo repite enseguida). */
  ultimo: GestoProcedural | null;
  /** Capas ocupadas por un gesto en curso. */
  brazosOcupados?: boolean;
  posturaOcupada?: boolean;
}

/** Estados en los que el paciente gesticula por su cuenta (pensando, el clip mueve los brazos). */
const ESTADOS_CON_GESTOS: ReadonlySet<EstadoNpc> = new Set([
  'inactivo',
  'esperando_input',
  'respondiendo',
  'sesion_finalizada',
]);

/** ¿Cabe este gesto ahora? */
export function gestoPermitido(gesto: GestoProcedural, contexto: ContextoGesto): boolean {
  const meta = METADATOS_GESTOS[gesto];
  if (!ESTADOS_CON_GESTOS.has(contexto.estado)) return false;
  if (meta.soloSentado && !contexto.sentado) return false;
  if (meta.amplio && contexto.reducido) return false;
  if (contexto.escuchando && !meta.duranteEscucha) return false;
  if (contexto.estado === 'respondiendo' && !meta.alHablar) return false;
  if (meta.capa === 'brazos' && contexto.brazosOcupados) return false;
  if (meta.capa === 'postura' && contexto.posturaOcupada) return false;
  return true;
}

/**
 * Elige al azar (según el peso) una opción distinta de `ultimo`. `azar` es un número en [0, 1).
 * Si la única opción es la última, no elige ninguna: mejor quedarse quieto que repetirse.
 */
export function elegirSinRepetir<T>(
  opciones: readonly { valor: T; peso: number }[],
  ultimo: T | null,
  azar: number
): T | null {
  const validas = opciones.filter(o => o.valor !== ultimo && o.peso > 0);
  const total = validas.reduce((suma, o) => suma + o.peso, 0);
  if (total <= 0) return null;
  let resto = azar * total;
  for (const opcion of validas) {
    resto -= opcion.peso;
    if (resto < 0) return opcion.valor;
  }
  return validas.at(-1)!.valor;
}

/**
 * Candidatos con su peso para el contexto: los de la emoción (más pesados cuanto más intensa) y
 * las variaciones del reposo (más presentes cuanto más serena), sin los que no caben ahora.
 */
export function candidatosGesto(
  contexto: ContextoGesto
): { valor: GestoProcedural; peso: number }[] {
  const pesos = new Map<GestoProcedural, number>();
  const emocional = PESO_EMOCION[contexto.intensidad];
  for (const { gesto, peso } of GESTOS_POR_EMOCION[contexto.emocion]) {
    pesos.set(gesto, (pesos.get(gesto) ?? 0) + peso * emocional);
  }
  const reposo = EMOCIONES_SERENAS.has(contexto.emocion) ? 1 : 0.6 / emocional;
  for (const { gesto, peso } of VARIACIONES_REPOSO) {
    pesos.set(gesto, (pesos.get(gesto) ?? 0) + peso * reposo);
  }
  return [...pesos]
    .filter(([gesto]) => gestoPermitido(gesto, contexto))
    .map(([valor, peso]) => ({ valor, peso }));
}

/** Siguiente gesto espontáneo (o `null` si ninguno cabe ahora). */
export function elegirGesto(contexto: ContextoGesto, azar: number): GestoProcedural | null {
  return elegirSinRepetir(candidatosGesto(contexto), contexto.ultimo, azar);
}

/**
 * Gesto con el que se nota una emoción recién llegada (o `null`): uno de los suyos, no una
 * variación del reposo.
 */
export function gestoDeEmocion(contexto: ContextoGesto, azar: number): GestoProcedural | null {
  const propios = GESTOS_POR_EMOCION[contexto.emocion]
    .filter(o => gestoPermitido(o.gesto, contexto))
    .map(o => ({ valor: o.gesto, peso: o.peso }));
  return elegirSinRepetir(propios, contexto.ultimo, azar);
}

/** ¿El gesto es propio de la emoción? (si la emoción cambia, los ajenos terminan). */
export function gestoDeLaEmocion(gesto: GestoProcedural, emocion: EmocionNpc): boolean {
  return GESTOS_POR_EMOCION[emocion].some(o => o.gesto === gesto);
}

/** Pausa media entre gestos espontáneos (s): más corta mientras habla. */
const PAUSA_MEDIA_S = { escuchando: 8, hablando: 4.5 };
const PAUSA_MINIMA_S = 2.5;

/**
 * Pausa hasta el siguiente gesto (s), irregular: entre 0,55 y 1,6 veces la media, con más
 * pausas cortas que largas (como las personas, que gesticulan en rachas). `azar` en [0, 1).
 */
export function pausaEntreGestos(
  estado: EstadoNpc,
  intensidad: IntensidadEmocion,
  reducido: boolean,
  azar: number
): number {
  const media = estado === 'respondiendo' ? PAUSA_MEDIA_S.hablando : PAUSA_MEDIA_S.escuchando;
  const irregular = 0.55 + 1.05 * azar * azar;
  return Math.max(PAUSA_MINIMA_S, (media * irregular) / frecuenciaGestos(intensidad, reducido));
}

/** Cuánto sostiene el gesto (s): más con más intensidad. */
export function duracionSostenida(
  gesto: GestoProcedural,
  intensidad: IntensidadEmocion,
  azar: number
): number {
  const [minimo, maximo] = METADATOS_GESTOS[gesto].sostener;
  const factor = intensidad === 3 ? 1.2 : intensidad === 1 ? 0.8 : 1;
  return (minimo + (maximo - minimo) * azar) * factor;
}

function suave(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/**
 * Peso del gesto (0–1) a los `t` segundos de empezar: entra suave, se sostiene y vuelve al
 * reposo, también suave. Pasada la salida vale 0.
 */
export function envolvente(t: number, entrada: number, sostener: number, salida: number): number {
  if (t <= 0) return 0;
  if (t < entrada) return suave(t / entrada);
  if (t < entrada + sostener) return 1;
  return 1 - suave((t - entrada - sostener) / salida);
}

/** Un gesto en curso en una de las capas. */
export interface GestoEnCurso {
  gesto: GestoProcedural | null;
  inicio: number;
  sostener: number;
  /** Lado del gesto: 1 la izquierda del personaje, -1 la derecha. */
  lado: 1 | -1;
  /** Si se interrumpió: cuándo y con qué peso (desde ahí vuelve al reposo). */
  corte: number | null;
  pesoCorte: number;
}

export function gestoVacio(): GestoEnCurso {
  return { gesto: null, inicio: 0, sostener: 0, lado: -1, corte: null, pesoCorte: 0 };
}

/** Peso del gesto en curso en el instante `tiempo` (0 si no hay o ya terminó). */
export function pesoDeGesto(g: GestoEnCurso, tiempo: number): number {
  if (!g.gesto) return 0;
  const { entrada, salida } = METADATOS_GESTOS[g.gesto];
  if (g.corte !== null) {
    return g.pesoCorte * (1 - suave((tiempo - g.corte) / salida));
  }
  return envolvente(tiempo - g.inicio, entrada, g.sostener, salida);
}

/** ¿Ya volvió al reposo? */
export function gestoTerminado(g: GestoEnCurso, tiempo: number): boolean {
  if (!g.gesto) return true;
  const { entrada, salida } = METADATOS_GESTOS[g.gesto];
  if (g.corte !== null) return tiempo - g.corte >= salida;
  return tiempo - g.inicio >= entrada + g.sostener + salida;
}

/** Interrumpe el gesto: desde su peso actual vuelve al reposo con su salida. */
export function cortarGesto(g: GestoEnCurso, tiempo: number) {
  if (!g.gesto || g.corte !== null) return;
  g.pesoCorte = pesoDeGesto(g, tiempo);
  g.corte = tiempo;
}
