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
