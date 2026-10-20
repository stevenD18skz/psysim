import { type Silaba } from '@/lib/audio/voz';
import { type EmocionNpc, type IntensidadEmocion } from '@/lib/conversacion/emociones';

/**
 * Gestos que acompañan al habla del paciente (lógica pura): los ademanes que marcan el ritmo de
 * la frase (los «beats» de McNeill, 1992) y las reacciones a frases clave, como encogerse de
 * hombros al decir «no sé» o llevarse la mano al pecho al hablar de dolor.
 */

export type ReaccionHabla = 'encogerse' | 'mano_al_pecho' | 'alzar_cejas' | 'negar_leve';

/** Un ademán: la mano se levanta un poco del regazo y vuelve, marcando una sílaba. */
export interface Ademan {
  /** Segundos desde el inicio de la frase. */
  t: number;
  /** Fuerza relativa (0–1): los de inicio de frase son más marcados. */
  fuerza: number;
  /** Mano que lo hace: 1 la izquierda del personaje, -1 la derecha. */
  lado: 1 | -1;
  /** Ademán abierto (la palma se gira hacia arriba y hacia fuera), al empezar una idea. */
  abierto: boolean;
}

/** Separación mínima entre ademanes (s) según la intensidad: con más, más seguidos. */
const SEPARACION_ADEMANES_S: Readonly<Record<IntensidadEmocion, number>> = {
  1: 1.2,
  2: 0.75,
  3: 0.5,
};
/** Cómo cambia la frecuencia de los ademanes con la emoción (más de 1 = más espaciados). */
const RITMO_POR_EMOCION: Readonly<Record<EmocionNpc, number>> = {
  neutral: 1,
  tranquilo: 1.3,
  aliviado: 1.1,
  triste: 1.7,
  ansioso: 0.8,
  molesto: 0.9,
  abrumado: 1.2,
};
/** Pausa (s) a partir de la cual la siguiente sílaba empieza una frase nueva. */
const PAUSA_DE_FRASE_S = 0.2;

/** Variación determinista entre 0 y 1 (misma frase, mismos ademanes; útil para probarla). */
function variacion(i: number): number {
  const x = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Ademanes de una frase a partir de su plan de sílabas (`planVoz`): uno al empezar cada frase y
 * otros en las sílabas más acentuadas (las de más tono y volumen respecto a sus vecinas),
 * respetando una separación mínima. Alternan de mano, con preferencia por la dominante.
 */
export function ademanesDeHabla(
  silabas: readonly Silaba[],
  intensidad: IntensidadEmocion,
  emocion: EmocionNpc,
  diestro = true
): Ademan[] {
  if (silabas.length < 3) return [];
  const separacion = SEPARACION_ADEMANES_S[intensidad] * RITMO_POR_EMOCION[emocion];
  const acento = (s: Silaba) => s.tono * s.volumen;
  const dominante: 1 | -1 = diestro ? -1 : 1;

  const ademanes: Ademan[] = [];
  let ultimo = -Infinity;
  for (let i = 0; i < silabas.length; i++) {
    const silaba = silabas[i]!;
    const anterior = silabas[i - 1];
    const siguiente = silabas[i + 1];
    const inicioFrase =
      !anterior || silaba.inicio - (anterior.inicio + anterior.duracion) > PAUSA_DE_FRASE_S;
    const acentuada =
      (!anterior || acento(silaba) > acento(anterior)) &&
      (!siguiente || acento(silaba) >= acento(siguiente));
    if (!inicioFrase && !acentuada) continue;
    if (silaba.inicio - ultimo < separacion * (inicioFrase ? 0.6 : 1)) continue;

    // La mano dominante hace dos de cada tres; la otra, el resto.
    const lado = variacion(ademanes.length) < 0.66 ? dominante : (-dominante as 1 | -1);
    ademanes.push({
      t: silaba.inicio,
      fuerza: inicioFrase ? 1 : 0.6,
      lado,
      abierto: inicioFrase && intensidad >= 2,
    });
    ultimo = silaba.inicio;
  }
  return ademanes;
}

/** Texto en minúsculas sin tildes (salvo la de «sé», que distingue «no sé» de «no se puede»). */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/sé/g, 's\u0000')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/s\u0000/g, 'sé');
}

const L = '\\p{L}';
const PALABRA = (cuerpo: string) => new RegExp(`(?<!${L})(?:${cuerpo})(?!${L})`, 'gu');

/**
 * «No sé» (con tilde, o sin ella si sigue una pausa o «qué/cómo/si…»; así «no se puede» no
 * cuenta), «ni idea», «quién sabe»…
 */
const DUDA = PALABRA(
  'no (?:lo )?sé|no (?:lo )?se(?=\\s*(?:[,.;:…!?]|$|que |como |si |cuando |donde |bien |por que ))|ni idea|no tengo (?:ni )?idea|quien sabe|yo que sé|no sabria'
);
/** Dolor físico o emocional. */
const DOLOR = PALABRA(
  'me duele|duele|dolor|me dolia|me dolio|me parte el alma|me destroza|me rompe|no aguanto|no puedo mas|es muy duro|me pesa|me angustia|el pecho|sufro|ay'
);
/** Negaciones rotundas (un «no» suelto o enfático; no el de «no me acuerdo»). */
const NEGACION = PALABRA(
  'nunca|jamas|tampoco|para nada|ni hablar|de ninguna manera|no(?=\\s*[,.;…!])|que no'
);

export interface MomentoClave {
  /** Segundos desde el inicio de la frase. */
  t: number;
  reaccion: ReaccionHabla;
}

/** Separación mínima entre reacciones a frases clave (s). */
const SEPARACION_REACCIONES_S = 1.4;
const MAXIMO_REACCIONES = 4;

/**
 * Reacciones a frases clave de la respuesta, en el momento aproximado en que se dicen (el texto
 * avanza a ritmo constante durante `duracion` segundos): «no sé» → encogerse; dolor → mano al
 * pecho; preguntas → alzar las cejas al final; negaciones rotundas → negar levemente con la
 * cabeza. Con prioridad para las más expresivas si se amontonan.
 */
export function momentosClave(texto: string, duracion: number): MomentoClave[] {
  const normal = normalizar(texto);
  const largo = Math.max(1, normal.length);
  const momento = (indice: number) => (indice / largo) * duracion;

  const encontrados: (MomentoClave & { prioridad: number })[] = [];
  for (const m of normal.matchAll(DUDA)) {
    encontrados.push({ t: momento(m.index), reaccion: 'encogerse', prioridad: 3 });
  }
  for (const m of normal.matchAll(DOLOR)) {
    encontrados.push({ t: momento(m.index), reaccion: 'mano_al_pecho', prioridad: 3 });
  }
  for (const m of normal.matchAll(NEGACION)) {
    encontrados.push({ t: momento(m.index), reaccion: 'negar_leve', prioridad: 1 });
  }
  // Las cejas suben al final de la pregunta.
  for (const m of normal.matchAll(/\?+/g)) {
    encontrados.push({
      t: Math.max(0, momento(m.index) - 0.3),
      reaccion: 'alzar_cejas',
      prioridad: 2,
    });
  }

  // Las más expresivas primero; luego descarta las que quedan muy cerca de otra ya elegida.
  encontrados.sort((a, b) => b.prioridad - a.prioridad || a.t - b.t);
  const elegidos: MomentoClave[] = [];
  for (const { t, reaccion } of encontrados) {
    if (elegidos.length >= MAXIMO_REACCIONES) break;
    if (elegidos.some(e => Math.abs(e.t - t) < SEPARACION_REACCIONES_S)) continue;
    elegidos.push({ t, reaccion });
  }
  return elegidos.sort((a, b) => a.t - b.t);
}

/**
 * Reacción con la que empieza la respuesta, si arranca con una frase clave («No sé…», «Me
 * duele…»): la hace a la vez que el gesto de la cabeza.
 */
export function reaccionAlInicio(texto: string): 'encogerse' | 'mano_al_pecho' | null {
  const inicio = normalizar(texto).replace(/^[\s¿¡"'«“(.…-]+/u, '');
  // Al inicio o en las primeras palabras («Pues… no sé»).
  const cerca = (patron: RegExp) => {
    const indice = inicio.search(patron);
    return indice >= 0 && indice <= 12;
  };
  if (cerca(DUDA)) return 'encogerse';
  if (cerca(DOLOR)) return 'mano_al_pecho';
  return null;
}
