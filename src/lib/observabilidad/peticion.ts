/** Encabezado con el identificador que une el registro de una petición con su respuesta. */
export const ENCABEZADO_PETICION = 'x-request-id';

/** Identificadores aceptados: cortos y sin caracteres que ensucien los logs. */
const FORMATO_VALIDO = /^[\w.:-]{8,80}$/;

/**
 * Identificador de la petición. Lo fija el proxy (a partir del de Vercel o uno nuevo); se pone en
 * los registros de las rutas de la API para seguir un mismo caso de principio a fin.
 */
export function idPeticion(solicitud: Request): string {
  const recibido = solicitud.headers.get(ENCABEZADO_PETICION);
  return recibido && FORMATO_VALIDO.test(recibido) ? recibido : 'sin-id';
}

/** Genera un identificador nuevo cuando la plataforma no entrega uno. */
export function nuevoIdPeticion(): string {
  return crypto.randomUUID();
}

/** Elige el identificador de Vercel si existe y es válido; si no, genera uno. */
export function resolverIdPeticion(deVercel: string | null): string {
  return deVercel && FORMATO_VALIDO.test(deVercel) ? deVercel : nuevoIdPeticion();
}
