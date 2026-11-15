import { type MotivoCierre } from '@/lib/conversacion/cierre';

/*
 * Qué significa para PsySim que el orquestador cierre su sesión.
 *
 * El orquestador cierra solo cuando la severidad queda en un límite del rango por varios turnos o
 * hay abuso reiterado. El límite puede ser el INFERIOR (el paciente se calmó): ese cierre llega
 * como `success` y deja la sesión `completed`. Solo `crisis` e `inappropriate` (sesión
 * `terminated`) terminan la práctica en PsySim.
 *
 * Regla: lo que no se reconoce nunca se convierte en un motivo clínico. Un cierre `success`, sin
 * motivo o con un valor nuevo deja seguir la práctica (con Gemini, porque la sesión de allá ya no
 * acepta turnos) y queda registrado.
 */

/** El orquestador cerró su sesión sin que la práctica deba terminar: por qué, en un código corto. */
export const CIERRES_AJENOS = ['success', 'sin_motivo', 'desconocido'] as const;
export type CierreAjeno = (typeof CIERRES_AJENOS)[number];

export type DecisionCierre =
  /** La sesión del orquestador sigue abierta. */
  | { tipo: 'sigue' }
  /** Crisis o trato inapropiado: la práctica termina con este turno. */
  | { tipo: 'termina'; motivo: MotivoCierre }
  /** El orquestador cerró su sesión, pero la práctica continúa en PsySim. */
  | { tipo: 'cerrada_alla'; codigo: CierreAjeno };

const MOTIVO_POR_CIERRE: Record<string, MotivoCierre> = {
  crisis: 'crisis',
  inappropriate: 'inapropiada',
};

/** Banderas del orquestador que indican trato inapropiado hacia el paciente. */
export const BANDERAS_DE_MALTRATO: readonly string[] = ['abuse', 'repeat_abuse'];

/** Lo que dice el evento `done` del stream (`should_close` y `closing_kind`). */
export function decidirCierre(debeCerrar: boolean, cierre: string | null): DecisionCierre {
  if (!debeCerrar) return { tipo: 'sigue' };
  const clave = cierre?.trim().toLowerCase() ?? '';
  const motivo = Object.hasOwn(MOTIVO_POR_CIERRE, clave) ? MOTIVO_POR_CIERRE[clave] : undefined;
  if (motivo) return { tipo: 'termina', motivo };
  if (clave === 'success') return { tipo: 'cerrada_alla', codigo: 'success' };
  return { tipo: 'cerrada_alla', codigo: clave === '' ? 'sin_motivo' : 'desconocido' };
}

/**
 * Lo mismo, cuando el turno se recupera del historial y solo se conoce el estado de la sesión
 * (`GET /sessions/{id}`): `completed` es el cierre `success` y `terminated` es crisis o trato
 * inapropiado, que se distinguen por las banderas del turno. Debe llegar a la misma conclusión que
 * `decidirCierre` con los mismos hechos.
 */
export function decidirCierrePorEstado(
  estado: string,
  banderasDelTurno: readonly string[]
): DecisionCierre {
  const clave = estado.trim().toLowerCase();
  if (clave === 'active') return { tipo: 'sigue' };
  if (clave === 'completed') return { tipo: 'cerrada_alla', codigo: 'success' };
  if (clave === 'terminated') {
    const maltrato = banderasDelTurno.some(bandera => BANDERAS_DE_MALTRATO.includes(bandera));
    return { tipo: 'termina', motivo: maltrato ? 'inapropiada' : 'crisis' };
  }
  return { tipo: 'cerrada_alla', codigo: 'desconocido' };
}

/** Motivo con el que la práctica pasa a Gemini (`sesion_ia.cambio_motivo`) tras un cierre ajeno. */
export const MOTIVO_CAMBIO_POR_CIERRE: Record<CierreAjeno, string> = {
  success: 'cierre_orquestador',
  sin_motivo: 'cierre_sin_motivo',
  desconocido: 'cierre_desconocido',
};
