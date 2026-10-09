import { randomInt } from 'node:crypto';

/** Sin caracteres que se confunden al dictarlos o copiarlos a mano (0/O, 1/l/I). */
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GRUPOS = 4;
const LARGO_GRUPO = 4;

/**
 * Contraseña temporal que el Administrador entrega al docente, p. ej. `Xk7m-p9Qa-...`: 16
 * caracteres aleatorios (~92 bits) en grupos para leerla sin errores. El docente la cambia al
 * entrar.
 */
export function generarContrasenaTemporal(): string {
  return Array.from({ length: GRUPOS }, () =>
    Array.from({ length: LARGO_GRUPO }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
  ).join('-');
}
