import 'server-only';

type Datos = Record<string, string | number | boolean | null | undefined>;

/**
 * Registro estructurado del servidor (una línea JSON por evento), legible en los logs de
 * Vercel. Nunca registres secretos, credenciales ni el contenido de las conversaciones.
 */
export const log = {
  info(evento: string, datos: Datos = {}) {
    // eslint-disable-next-line no-console -- punto único de salida de logs informativos
    console.info(JSON.stringify({ nivel: 'info', evento, ...datos }));
  },
  error(evento: string, datos: Datos = {}) {
    console.error(JSON.stringify({ nivel: 'error', evento, ...datos }));
  },
};
