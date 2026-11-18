import { createHash } from 'node:crypto';

import { type CredencialOrquestador, type OrquestadorEnv } from '@/lib/env/orquestador';

/*
 * Cuentas del orquestador con las que PsySim conversa. El orquestador limita a 10 mensajes por
 * minuto POR CUENTA y solo el dueño de una sesión escribe en ella, así que cada práctica queda
 * fija a una cuenta. Con el grupo vacío, la cuenta `teacher` es dueña de todas (modo de una sola
 * cuenta); al añadir cuentas `student`, las prácticas nuevas se reparten entre ellas.
 */

/** Mensajes por minuto que el orquestador acepta de una cuenta. */
export const LIMITE_ORQUESTADOR_POR_MINUTO = 10;
/** Cupo que usa PsySim: uno menos, de margen por si los relojes no coinciden. */
export const CUPO_POR_MINUTO = 9;
/** Ritmo observado: un estudiante envía unos 3 mensajes por minuto (un turno cada 15–20 s). */
export const MENSAJES_POR_ESTUDIANTE_Y_MINUTO = 3;

export interface CuentaOrquestador extends CredencialOrquestador {
  /**
   * Identificador de la cuenta dentro de PsySim: una huella del correo. Es lo que se guarda en la
   * base de datos, para no dejar correos de cuentas de servicio en tablas ni en registros.
   */
  clave: string;
  /** `true` si es la cuenta `teacher`, que además gestiona perfiles, escenarios y sesiones. */
  esDocente: boolean;
}

export function claveDeCuenta(correo: string): string {
  return createHash('sha256').update(correo.trim().toLowerCase()).digest('hex').slice(0, 16);
}

/** La cuenta `teacher`, que crea perfiles, escenarios y sesiones. */
export function cuentaDocente(env: OrquestadorEnv): CuentaOrquestador {
  return { ...env.docente, clave: claveDeCuenta(env.docente.correo), esDocente: true };
}

/** Cuentas que pueden ser dueñas de una sesión: las del grupo o, si no hay, la `teacher`. */
export function cuentasDeConversacion(env: OrquestadorEnv): CuentaOrquestador[] {
  if (env.grupo.length === 0) return [cuentaDocente(env)];
  return env.grupo.map(cuenta => ({
    ...cuenta,
    clave: claveDeCuenta(cuenta.correo),
    esDocente: false,
  }));
}

/**
 * Cuenta a la que quedó fija una práctica. `null` si ya no está configurada (alguien la quitó del
 * grupo): esa práctica no puede seguir en el orquestador.
 */
export function cuentaPorClave(env: OrquestadorEnv, clave: string): CuentaOrquestador | null {
  const docente = cuentaDocente(env);
  if (docente.clave === clave) return docente;
  return cuentasDeConversacion(env).find(cuenta => cuenta.clave === clave) ?? null;
}

export type EleccionDeCuenta =
  | { clave: string; lleno: false }
  /** Todas las cuentas alcanzaron el tope: `enCurso` es el total de prácticas activas. */
  | { clave: null; lleno: true; enCurso: number };

/**
 * Elige la cuenta con menos prácticas activas (en el orden configurado si hay empate). Con `tope`,
 * si la menos cargada ya lo alcanzó, no hay cupo. Es la misma regla de la función
 * `asignar_cuenta_orquestador` de la base de datos, que la aplica de forma atómica.
 */
export function elegirCuenta(
  claves: readonly string[],
  activas: ReadonlyMap<string, number>,
  tope: number | null
): EleccionDeCuenta {
  let elegida: string | null = null;
  let minimo = Infinity;
  let enCurso = 0;
  for (const clave of claves) {
    const carga = activas.get(clave) ?? 0;
    enCurso += carga;
    if (carga < minimo) {
      minimo = carga;
      elegida = clave;
    }
  }
  if (elegida === null || (tope !== null && minimo >= tope)) {
    return { clave: null, lleno: true, enCurso };
  }
  return { clave: elegida, lleno: false };
}

/** Lo que lee el estudiante cuando el tope de prácticas simultáneas no le deja empezar. */
export function mensajeConsultorioOcupado(enCurso: number): string {
  const cuantas = enCurso === 1 ? 'Hay 1 práctica en curso' : `Hay ${enCurso} prácticas en curso`;
  return `El consultorio está ocupado. ${cuantas}; inténtalo en unos minutos.`;
}

/** Prácticas simultáneas que una cuenta atiende sin esperas, al ritmo normal de conversación. */
export const PRACTICAS_POR_CUENTA = Math.floor(CUPO_POR_MINUTO / MENSAJES_POR_ESTUDIANTE_Y_MINUTO);

/** Cuentas del grupo necesarias para que `estudiantes` practiquen a la vez sin esperas. */
export function cuentasNecesarias(estudiantes: number): number {
  return Math.max(1, Math.ceil(estudiantes / PRACTICAS_POR_CUENTA));
}
