import 'server-only';

type Datos = Record<string, string | number | boolean | null | undefined>;

/**
 * Registro estructurado del servidor (una línea JSON por evento), legible en los logs de
 * Vercel, que ya añade la hora. Nunca registres secretos, credenciales, correos ni el contenido
 * de las conversaciones. Los eventos se nombran `area.evento` (ver docs/observabilidad.md).
 */
export const log = {
  info(evento: string, datos: Datos = {}) {
    // eslint-disable-next-line no-console -- punto único de salida de logs informativos
    console.info(JSON.stringify({ nivel: 'info', evento, ...datos }));
  },
  /** Algo raro pero que el sistema absorbió (un tope alcanzado, un dato rechazado). */
  warn(evento: string, datos: Datos = {}) {
    console.warn(JSON.stringify({ nivel: 'warn', evento, ...datos }));
  },
  error(evento: string, datos: Datos = {}) {
    console.error(JSON.stringify({ nivel: 'error', evento, ...datos }));
  },
};
