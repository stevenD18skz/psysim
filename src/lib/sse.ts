/** Un evento Server-Sent Events tal como llega: su nombre y sus líneas `data:` unidas. */
export interface EventoSse {
  evento: string;
  datos: string;
}

/** Serializa un evento para enviarlo: su nombre y sus datos en JSON (una sola línea `data:`). */
export function codificarEventoSse(evento: string, datos: unknown): string {
  return `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
}

function interpretarBloque(bloque: string): EventoSse | null {
  let evento = 'message';
  const datos: string[] = [];
  for (const linea of bloque.split('\n')) {
    // Las líneas que empiezan por «:» son comentarios (latidos para mantener viva la conexión).
    if (!linea || linea.startsWith(':')) continue;
    const corte = linea.indexOf(':');
    const campo = corte === -1 ? linea : linea.slice(0, corte);
    const valor = corte === -1 ? '' : linea.slice(corte + 1).replace(/^ /, '');
    if (campo === 'event') evento = valor;
    else if (campo === 'data') datos.push(valor);
  }
  return datos.length === 0 ? null : { evento, datos: datos.join('\n') };
}

/**
 * Lector incremental de Server-Sent Events. La red parte el flujo donde quiere (a mitad de un
 * evento, de una línea o de un `\r\n`), así que guarda lo incompleto hasta el siguiente trozo.
 */
export function crearLectorSse() {
  let resto = '';

  return {
    /** Recibe un trozo de texto y devuelve los eventos que quedaron completos. */
    alimentar(trozo: string): EventoSse[] {
      let texto = resto + trozo;
      // Un `\r` al final puede ser la mitad de un `\r\n`: se decide con el siguiente trozo.
      let cola = '';
      if (texto.endsWith('\r')) {
        cola = '\r';
        texto = texto.slice(0, -1);
      }
      const bloques = texto.replace(/\r\n?/g, '\n').split('\n\n');
      resto = (bloques.pop() ?? '') + cola;
      return bloques.flatMap(bloque => interpretarBloque(bloque) ?? []);
    },
    /**
     * Fin del flujo. Un evento sin su línea en blanco final quedó cortado y se descarta (así lo
     * manda el estándar): devuelve `true` si se perdió algo, para tratarlo como respuesta incompleta.
     */
    terminar(): boolean {
      const cortado = resto.trim().length > 0;
      resto = '';
      return cortado;
    },
  };
}
