import { type Expresion } from './comportamiento';
import { type GestoProcedural } from './repertorio-gestos';

/**
 * Poses de los gestos procedurales del paciente (datos puros; `BrazosPaciente` las resuelve con
 * cinemática inversa y `AnimadorPaciente` aplica el ajuste del torso, la mirada y el rostro).
 *
 * Las manos no se colocan con ángulos sino con puntos del propio cuerpo del personaje (el pecho,
 * la cara, los muslos), medidos en su GLB: así la mano llega al pecho de cada personaje, sea
 * ancho o delgado, sin atravesarlo.
 *
 * Espacio del personaje: +X es su izquierda, +Y arriba y +Z al frente. Las poses de una sola
 * mano se escriben para la derecha (la dominante de un diestro) y se reflejan para la izquierda.
 */

export type Tripleta = readonly [number, number, number];

/** Huesos cuya caja (medida en el GLB) sirve de referencia para colocar la mano. */
export type HuesoReferencia = 'chest' | 'spine' | 'thigh_L' | 'thigh_R';

export interface PoseMano {
  /**
   * Dónde va la palma. Con un hueso de referencia, `punto` está en coordenadas de su caja
   * (-1…1 por eje: ±1 es la superficie). Con `ojos`, es un desplazamiento en metros desde el
   * punto medio entre los ojos, en los ejes de la cabeza (la caja de la cabeza incluye gorros y
   * peinados, que no sirven para ubicar la boca o la sien).
   */
  referencia: HuesoReferencia | 'ojos';
  punto: Tripleta;
  /** Hacia dónde se separa la palma de la superficie (ejes del hueso de referencia). */
  normal: Tripleta;
  /** Separación extra (m) además del grosor de la mano. */
  separacion?: number;
  /** Hacia dónde apuntan los dedos (espacio del personaje). */
  dedos: Tripleta;
  /** Hacia dónde apunta el codo (espacio del personaje). */
  codo: Tripleta;
}

export interface Oscilacion {
  /** Dirección del vaivén (espacio del personaje). */
  eje: Tripleta;
  /** Amplitud (m) y frecuencia (Hz). */
  amplitud: number;
  frecuencia: number;
  /** Las dos manos en sentidos opuestos (frotarse). */
  opuesta?: boolean;
}

export interface PoseBrazos {
  /** `R`: la mano que gesticula (o la derecha, si son las dos); `L`: la otra. */
  manos: { R?: PoseMano; L?: PoseMano };
  oscilacion?: Oscilacion;
  /** Cuánto suben los hombros (m). */
  hombros?: number;
}

/** Ajuste del torso, la cabeza, la mirada y el rostro que acompaña a un gesto. */
export interface AjusteCuerpo {
  /** Inclinación hacia delante de la columna y el pecho (rad). */
  inclinacion?: number;
  /** Inclinación lateral del torso (rad; hacia el lado del gesto). */
  ladeo?: number;
  /** Giro del pecho (rad; hacia el lado del gesto). */
  giro?: number;
  /** Cabeza hacia abajo (rad; negativo = mentón arriba). */
  cabeceo?: number;
  /** Ladeo de la cabeza hacia el lado del gesto (rad). */
  ladeoCabeza?: number;
  /** Cuánto conserva el contacto visual (1 = todo; 0 = mira a otra parte). */
  mirada?: number;
  /** Hacia dónde mira entonces (rad; giro hacia su lado de costumbre y cabeceo, + = arriba). */
  miradaGiro?: number;
  miradaCabeceo?: number;
  /** Cambios del rostro (se suman a la expresión de la emoción). */
  rostro?: Partial<
    Pick<Expresion, 'cejaAltura' | 'cejaInclinacion' | 'cejaAsimetria' | 'sonrisa' | 'apertura'>
  >;
}

/** Hacia los muslos (manos en el regazo o en las rodillas): codo atrás y abajo. */
const CODO_ATRAS: Tripleta = [-0.7, -0.3, -1];

export const POSES_BRAZOS: Readonly<Partial<Record<GestoProcedural, PoseBrazos>>> = {
  // Las manos se juntan delante del vientre y se frotan.
  frotar_manos: {
    manos: {
      R: {
        referencia: 'spine',
        punto: [-0.12, -0.35, 1],
        normal: [0, 0, 1],
        separacion: 0.05,
        dedos: [1, 0.15, 0.35],
        codo: [-1, -1, -0.2],
      },
      L: {
        referencia: 'spine',
        punto: [0.12, -0.35, 1],
        normal: [0, 0, 1],
        separacion: 0.05,
        dedos: [-1, 0.15, 0.35],
        codo: [1, -1, -0.2],
      },
    },
    oscilacion: { eje: [0.8, 0.35, 0.2], amplitud: 0.016, frecuencia: 3, opuesta: true },
  },
  // Manos juntas sobre el regazo, apretándose de vez en cuando.
  entrelazar_manos: {
    manos: {
      R: {
        referencia: 'spine',
        punto: [-0.08, -0.85, 1],
        normal: [0, 0, 1],
        separacion: 0.075,
        dedos: [1, -0.35, 0.4],
        codo: [-1, -1, -0.3],
      },
      L: {
        referencia: 'spine',
        punto: [0.08, -0.85, 1],
        normal: [0, 0, 1],
        separacion: 0.075,
        dedos: [-1, -0.35, 0.4],
        codo: [1, -1, -0.3],
      },
    },
    oscilacion: { eje: [1, 0, 0], amplitud: 0.004, frecuencia: 0.6, opuesta: true },
  },
  // La mano derecha sobre el lado izquierdo del pecho (el corazón).
  mano_al_pecho: {
    manos: {
      R: {
        referencia: 'chest',
        punto: [0.15, 0.05, 1],
        normal: [0, 0, 1],
        dedos: [0.55, 0.75, 0.1],
        codo: [-1, -1, 0.1],
      },
    },
    oscilacion: { eje: [0, 0, 1], amplitud: 0.004, frecuencia: 0.35 },
  },
  // Antebrazos cruzados delante del pecho: el derecho pegado al cuerpo, el izquierdo por encima.
  brazos_cruzados: {
    manos: {
      R: {
        referencia: 'chest',
        punto: [0.75, -0.55, 1],
        normal: [0, 0, 1],
        separacion: 0.02,
        dedos: [1, 0.2, -0.25],
        codo: [-1, -0.9, 0.6],
      },
      L: {
        referencia: 'chest',
        punto: [-0.75, -0.8, 1],
        normal: [0, 0, 1],
        separacion: 0.075,
        dedos: [-1, 0.2, -0.25],
        codo: [1, -0.9, 0.6],
      },
    },
  },
  // La mano tapa la boca y la mejilla.
  mano_a_la_cara: {
    manos: {
      R: {
        referencia: 'ojos',
        punto: [-0.025, -0.085, 0.03],
        normal: [0, 0, 1],
        dedos: [0.35, 1, 0.1],
        codo: [-0.6, -0.8, 0.9],
      },
    },
  },
  // Sostiene la cabeza por la sien, como quien ya no puede más.
  mano_a_la_frente: {
    manos: {
      R: {
        referencia: 'ojos',
        punto: [-0.14, 0.045, -0.04],
        normal: [-1, 0, 0.35],
        dedos: [0.25, 1, 0.15],
        codo: [-0.4, -1, 0.8],
      },
    },
  },
  // Hombros arriba, antebrazos hacia delante y hacia fuera, las palmas a la vista.
  encogerse: {
    manos: {
      R: {
        referencia: 'chest',
        punto: [-1.1, -0.95, 1],
        normal: [0, 0, 1],
        separacion: 0.12,
        dedos: [-0.45, 0.1, 1],
        codo: [-0.5, -1, -0.5],
      },
      L: {
        referencia: 'chest',
        punto: [1.1, -0.95, 1],
        normal: [0, 0, 1],
        separacion: 0.12,
        dedos: [0.45, 0.1, 1],
        codo: [0.5, -1, -0.5],
      },
    },
    hombros: 0.022,
  },
  // Inclinado hacia delante, con los antebrazos sobre los muslos y las manos cerca de las rodillas.
  inclinarse: {
    manos: {
      R: {
        referencia: 'thigh_R',
        punto: [0.35, -0.75, 1],
        normal: [0, 0, 1],
        dedos: [0.55, -0.35, 0.75],
        codo: CODO_ATRAS,
      },
      L: {
        referencia: 'thigh_L',
        punto: [-0.35, -0.75, 1],
        normal: [0, 0, 1],
        dedos: [-0.55, -0.35, 0.75],
        codo: [0.7, -0.3, -1],
      },
    },
  },
  // Se alisa el pantalón o la falda sobre el muslo.
  tocar_ropa: {
    manos: {
      R: {
        referencia: 'thigh_R',
        punto: [-0.2, -0.8, 1],
        normal: [0, 0, 1],
        dedos: [0.15, -0.25, 1],
        codo: [-1, -0.3, -0.6],
      },
    },
    oscilacion: { eje: [0, 0, 1], amplitud: 0.02, frecuencia: 0.9 },
  },
  // Se toca el pelo por encima de la oreja (o se rasca la cabeza).
  tocar_pelo: {
    manos: {
      R: {
        referencia: 'ojos',
        punto: [-0.17, 0, -0.05],
        normal: [-1, 0, 0],
        dedos: [0, 1, -0.3],
        codo: [-0.7, -0.6, 0.6],
      },
    },
    oscilacion: { eje: [0, 1, 0.3], amplitud: 0.008, frecuencia: 3.2 },
  },
};

export const AJUSTES_CUERPO: Readonly<Record<GestoProcedural, AjusteCuerpo>> = {
  frotar_manos: { inclinacion: 0.05, cabeceo: 0.05, mirada: 0.8 },
  entrelazar_manos: { inclinacion: 0.03 },
  mano_al_pecho: { cabeceo: 0.06, mirada: 0.85, rostro: { cejaInclinacion: 0.15 } },
  brazos_cruzados: {
    inclinacion: -0.05,
    cabeceo: -0.05,
    rostro: { sonrisa: -0.1, cejaAltura: -0.1 },
  },
  mano_a_la_cara: {
    inclinacion: 0.08,
    cabeceo: 0.16,
    ladeoCabeza: 0.06,
    mirada: 0.35,
    rostro: { apertura: -0.15 },
  },
  mano_a_la_frente: {
    inclinacion: 0.1,
    cabeceo: 0.2,
    ladeoCabeza: 0.15,
    mirada: 0.2,
    rostro: { apertura: -0.25, cejaInclinacion: 0.2 },
  },
  encogerse: {
    cabeceo: -0.03,
    ladeoCabeza: 0.09,
    rostro: { cejaAltura: 0.55, cejaAsimetria: 0.3, sonrisa: -0.35 },
  },
  inclinarse: { inclinacion: 0.36, cabeceo: -0.32, rostro: { cejaAltura: 0.1 } },
  tocar_ropa: { inclinacion: 0.06, cabeceo: 0.12, mirada: 0.4 },
  tocar_pelo: { ladeoCabeza: 0.07, mirada: 0.6 },
  cambiar_peso: { ladeo: 0.07, giro: 0.05, ladeoCabeza: -0.05 },
  mirar_ventana: { mirada: 0, miradaGiro: 0.85, miradaCabeceo: 0.06 },
  mirar_suelo: { mirada: 0, miradaGiro: 0.15, miradaCabeceo: -0.4 },
};

/** Refleja una pose de mano (derecha ↔ izquierda): invierte X y cambia el muslo de lado. */
export function reflejarMano(pose: PoseMano): PoseMano {
  const x = ([a, b, c]: Tripleta): Tripleta => [-a, b, c];
  const referencia =
    pose.referencia === 'thigh_L'
      ? 'thigh_R'
      : pose.referencia === 'thigh_R'
        ? 'thigh_L'
        : pose.referencia;
  return {
    ...pose,
    referencia,
    punto: x(pose.punto),
    normal: x(pose.normal),
    dedos: x(pose.dedos),
    codo: x(pose.codo),
  };
}
