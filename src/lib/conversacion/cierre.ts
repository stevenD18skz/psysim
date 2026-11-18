/**
 * Cierre automático de una práctica. El orquestador del paciente termina la conversación por su
 * cuenta en dos situaciones: el paciente llegó a una crisis que no se pudo contener (`crisis`) o
 * el estudiante lo trató de forma inapropiada varias veces (`inapropiada`).
 */
export const MOTIVOS_CIERRE = ['crisis', 'inapropiada'] as const;
export type MotivoCierre = (typeof MOTIVOS_CIERRE)[number];

export function esMotivoCierre(valor: unknown): valor is MotivoCierre {
  return (MOTIVOS_CIERRE as readonly unknown[]).includes(valor);
}

/**
 * Por qué una práctica termina sin que el estudiante pulse «Terminar práctica»: lo decidió el
 * paciente (`MotivoCierre`) o se cumplió el tiempo de la consulta y su margen (`tiempo`). Este
 * último es el fin normal de una consulta, no un cierre del paciente: no se guarda en
 * `sesion_ia.cierre_motivo`, sino en `sesion.fin_motivo`.
 */
export const FIN_POR_TIEMPO = 'tiempo';
export type FinDePractica = MotivoCierre | typeof FIN_POR_TIEMPO;

/**
 * Lo que lee el estudiante cuando la práctica se cierra sola. Es un momento delicado: se dice qué
 * pasó sin juzgar, se recuerda que es una simulación y se indica el siguiente paso. No se usa
 * «crisis» como etiqueta del estudiante ni se le atribuye un error: eso lo conversa con su docente.
 */
export const AVISO_CIERRE: Record<FinDePractica, { titulo: string; detalle: string }> = {
  crisis: {
    titulo: 'La conversación terminó aquí',
    detalle:
      'El paciente llegó a un punto de mucha angustia y la consulta se interrumpió. Es una situación simulada y forma parte de lo que se practica. Tu docente revisará la conversación contigo.',
  },
  inapropiada: {
    titulo: 'La conversación terminó aquí',
    detalle:
      'El paciente dio por terminada la consulta por la forma en que se desarrolló la conversación. Tu docente la revisará contigo.',
  },
  // El fin previsto de toda consulta: se dice sin dramatismo y sin valorar cómo le fue.
  tiempo: {
    titulo: 'Se cumplió el tiempo de la consulta',
    detalle:
      'La consulta llegó a su tiempo y la práctica termina aquí, como estaba previsto. Tu docente revisará la conversación contigo.',
  },
};

/** Lo que el docente ve del motor del paciente al revisar una práctica. */
export interface IaDeSesion {
  /** El paciente dio por terminada la consulta (crisis o trato inapropiado). */
  cierre: MotivoCierre | null;
  /** Severidad emocional del paciente (0 a 5) en cada respuesta, por id de mensaje. */
  severidades: Record<string, number>;
  /** La práctica terminó sola al cumplirse el tiempo de la consulta y su margen de cierre. */
  finPorTiempo: boolean;
}

/** Cómo lo ve el docente en la transcripción y en el listado de prácticas. */
export const ETIQUETA_CIERRE: Record<MotivoCierre, string> = {
  crisis: 'Cierre automático: el paciente entró en crisis',
  inapropiada: 'Cierre automático: conducta inapropiada hacia el paciente',
};

/** Lo que ve el docente cuando la práctica terminó por tiempo. Neutro: no es una falta. */
export const ETIQUETA_FIN_POR_TIEMPO = 'Terminó al cumplirse el tiempo de la consulta';
