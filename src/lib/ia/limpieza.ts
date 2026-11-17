/**
 * Largo máximo de una respuesta del paciente: el que acepta la base de datos
 * (`mensaje_contenido_check`). El largo real lo decide el proveedor (con Gemini lo acota
 * `AI_MAX_TOKENS`; con el orquestador, nada de este lado), así que se recorta antes de guardar.
 */
export const LARGO_MAXIMO_RESPUESTA = 4000;

/**
 * Tope de lo que se acumula de una respuesta mientras llega. Muy por encima de lo que puede
 * guardarse: pasado este punto el proveedor está fallando y no tiene sentido seguir leyendo.
 */
export const LARGO_MAXIMO_FLUJO = LARGO_MAXIMO_RESPUESTA * 4;

/**
 * Normaliza la respuesta del modelo: quita espacios, comillas envolventes y el prefijo
 * "Nombre:" que algunos modelos añaden al interpretar un personaje.
 */
export function limpiarTexto(texto: string, nombrePaciente?: string): string {
  let limpio = texto.trim();
  if (nombrePaciente) {
    const escapado = nombrePaciente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    limpio = limpio.replace(new RegExp(`^\\**${escapado}\\**\\s*:\\s*`, 'i'), '');
  }
  const comillas = /^(["“«])([\s\S]*)(["”»])$/.exec(limpio);
  if (comillas) limpio = comillas[2]!.trim();
  return limpio;
}

/**
 * Recorta una respuesta que no cabe en la base de datos. Sin esto el guardado fallaba y, con el
 * orquestador, la práctica quedaba atascada: el reintento recuperaba de su historial la misma
 * respuesta y volvía a fallar.
 *
 * Corta en el final de la última frase que cabe; si no hay ninguno en la segunda mitad (un texto
 * sin puntuación), corta en el último espacio y lo marca con «…».
 */
export function recortarRespuesta(texto: string, maximo: number = LARGO_MAXIMO_RESPUESTA): string {
  if (texto.length <= maximo) return texto;

  const cabe = texto.slice(0, maximo);
  const finDeFrase = Math.max(
    cabe.lastIndexOf('.'),
    cabe.lastIndexOf('?'),
    cabe.lastIndexOf('!'),
    cabe.lastIndexOf('…')
  );
  if (finDeFrase >= maximo / 2) return cabe.slice(0, finDeFrase + 1).trimEnd();

  // Se reserva un carácter para la marca del corte.
  const sinMarca = cabe.slice(0, maximo - 1);
  const espacio = sinMarca.search(/\s\S*$/);
  const base = espacio >= maximo / 2 ? sinMarca.slice(0, espacio) : sinMarca;
  return `${base.trimEnd()}…`;
}
