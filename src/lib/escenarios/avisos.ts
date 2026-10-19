/**
 * Aviso de contenido de cada caso: de qué trata, con hechos y sin dramatismo, para que el
 * estudiante decida si entra ahora. Los casos propios del docente usan el aviso genérico.
 */
const AVISOS: Record<string, string> = {
  'E-01':
    'Marta Lucía perdió a su esposo de forma repentina hace cuatro meses. Habla de duelo, culpa, llanto e insomnio. No hay ideación suicida.',
  'E-02':
    'Andrés Felipe vive con preocupación constante por el trabajo, la salud de su hija y el dinero, con tensión física e irritabilidad.',
  'E-03':
    'Laura Sofía describe semanas de ánimo bajo y, si se lo preguntas, pensamientos pasivos de muerte (sin plan ni intención). Practicarás cómo explorar el riesgo con tacto.',
  'E-04':
    'Julián David llega en plena crisis de pánico: falta de aire, taquicardia y miedo intenso a morir. Escribe con angustia al principio.',
  'E-05':
    'Carolina habla de discusiones con su pareja por las tareas del hogar y la falta de comunicación. No hay violencia en la relación.',
  'E-06':
    'Santiago está en semana de parciales: carga académica, insomnio y presión familiar por mantener su beca.',
  'E-07':
    'Hernán, taxista, toma con frecuencia y su esposa le dijo que se irá con los hijos si sigue. Se habla del consumo de alcohol, de conflictos familiares y de la muerte de un padre.',
  'E-08':
    'Yolanda fue desplazada por el conflicto armado y vive con pesadillas, sobresaltos, insomnio y culpa. El caso toca la pérdida y la separación de familiares. Ella decide cuánto cuenta: no hace falta pedirle detalles de lo que vivió.',
  'E-09':
    'Sara, de 15 años, tiene cortes en los antebrazos que vio su orientadora. Se habla de autolesión, de acoso en redes y, si se lo preguntas, de pensamientos de que sería mejor no estar (sin plan ni intención). Practicarás cómo explorar el riesgo con tacto.',
  'E-10':
    'Daniela llega por cansancio y mareos. El caso toca la relación con la comida, el control del peso y conductas para compensar lo que come. No se mencionan cifras ni métodos.',
  'E-11':
    'Paola consulta por estrés y dolores de cabeza. El caso toca la violencia en la pareja: control, amenazas y un episodio de violencia física. Practicarás cómo preguntar con tacto y acompañar sin presionar.',
  'E-12':
    'Gilberto es un profesor jubilado, viudo hace tres años. Habla de soledad, duelo y olvidos recientes. No hay riesgo para sí mismo.',
};

const AVISO_CASO_PROPIO =
  'Tu docente creó este caso. Puede incluir temas sensibles; lee la descripción antes de empezar.';

/**
 * Casos en los que se muestran los recursos de apoyo (duelo, riesgo, crisis, trauma, autolesión,
 * conducta alimentaria, violencia y casos propios).
 */
const CON_APOYO = new Set(['E-01', 'E-03', 'E-04', 'E-08', 'E-09', 'E-10', 'E-11']);

export function avisoDeContenido(codigo: string): { texto: string; conApoyo: boolean } {
  const texto = AVISOS[codigo];
  return texto
    ? { texto, conApoyo: CON_APOYO.has(codigo) }
    : { texto: AVISO_CASO_PROPIO, conApoyo: true };
}

/**
 * Recursos de apoyo. Por validar con la universidad antes de publicar: el canal exacto de Bienestar
 * Universitario y la vigencia de la línea nacional (docs/rediseno/fase-2-flujos-y-copy.md, §6).
 */
export const RECURSOS_APOYO = [
  'Bienestar Universitario de la Universidad del Valle.',
  'Línea nacional de salud mental: 192, opción 4 (Ministerio de Salud).',
] as const;

export interface RecursoApoyo {
  texto: string;
  /** Dato que la universidad o el equipo de la tesis aún no ha validado. */
  porConfirmar?: boolean;
}

/** Recursos propios de un caso, además de los generales (p. ej. violencia en la pareja). */
const RECURSOS_POR_CASO: Record<string, readonly RecursoApoyo[]> = {
  'E-11': [
    {
      texto: 'Línea 155: orientación a mujeres víctimas de violencia en Colombia.',
      porConfirmar: true,
    },
  ],
};

/** Todos los recursos de apoyo de un caso: los generales y los propios del caso. */
export function recursosDeApoyo(codigo: string): readonly RecursoApoyo[] {
  return [...RECURSOS_APOYO.map(texto => ({ texto })), ...(RECURSOS_POR_CASO[codigo] ?? [])];
}
