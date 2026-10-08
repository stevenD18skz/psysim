/** Dominio de los correos institucionales de los estudiantes (Google Workspace de Univalle). */
export const DOMINIO_ESTUDIANTES = 'correounivalle.edu.co';

/** Parámetro de /login con el motivo por el que falló el acceso con Google. */
export const PARAM_ERROR_LOGIN = 'error';

/** Mensajes de /login según el motivo que devuelve /auth/callback. */
export const ERRORES_GOOGLE = {
  cancelado: 'Cancelaste el acceso con Google. Vuelve a intentarlo cuando quieras.',
  fallo: 'No fue posible completar el acceso con Google. Inténtalo de nuevo.',
} as const;

export type ErrorGoogle = keyof typeof ERRORES_GOOGLE;

export function esErrorGoogle(valor: unknown): valor is ErrorGoogle {
  return typeof valor === 'string' && Object.hasOwn(ERRORES_GOOGLE, valor);
}
