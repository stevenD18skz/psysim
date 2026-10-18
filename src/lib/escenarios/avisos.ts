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
};

const AVISO_CASO_PROPIO =
  'Tu docente creó este caso. Puede incluir temas sensibles; lee la descripción antes de empezar.';

/** Casos en los que se muestran los recursos de apoyo (duelo, riesgo, crisis y casos propios). */
const CON_APOYO = new Set(['E-01', 'E-03', 'E-04']);

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
