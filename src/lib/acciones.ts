/** Resultado de una Server Action: los datos, o un mensaje de error para mostrar tal cual. */
export type ResultadoAccion<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Códigos de error de PostgreSQL que las acciones traducen a mensajes. */
export const CODIGO_PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
  INSUFFICIENT_PRIVILEGE: '42501',
} as const;
