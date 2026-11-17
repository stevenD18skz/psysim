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
 * Severidad desde la que un cierre `terminated` sin motivo se puede leer como crisis. El
 * orquestador cierra por crisis cuando la severidad se queda en el límite superior del rango del
 * caso, y el más bajo de esos límites es 4 (casos básicos; ver `mapeo.ts`).
 */
export const SEVERIDAD_DE_CRISIS = 4;

/** Lo que se sabe del turno recuperado, además del estado de la sesión. */
export interface PistasDeCierre {
  /** `risk_flags` del mensaje del estudiante y de la respuesta. */
  banderas?: readonly string[];
  /** Severidad de la respuesta recuperada. */
  severidad?: number | null;
  /** `closing_kind` de la sesión, si el orquestador lo devuelve (hoy no lo hace). */
  cierre?: string | null;
}

/**
 * Lo mismo, cuando el turno se recupera del historial y solo se conoce el estado de la sesión
 * (`GET /sessions/{id}`). Debe llegar a la misma conclusión que `decidirCierre` con los mismos
 * hechos, y cuando faltan hechos no inventa un motivo clínico:
 *
 * - Si la sesión trae su `closing_kind`, decide él.
 * - `completed` es el cierre `success`.
 * - `terminated` con banderas de maltrato es trato inapropiado. Sin ellas solo es una crisis si
 *   la severidad de la respuesta lo respalda: una sesión también queda `terminated` por un cierre
 *   manual o una limpieza del lado del orquestador, y el docente leería «el paciente entró en
 *   crisis» sin que haya pasado. En ese caso la práctica sigue (con Gemini) y queda registrado.
 */
export function decidirCierrePorEstado(
  estado: string,
  pistas: PistasDeCierre = {}
): DecisionCierre {
  const clave = estado.trim().toLowerCase();
  if (clave === 'active') return { tipo: 'sigue' };
  if (pistas.cierre?.trim()) return decidirCierre(true, pistas.cierre);
  if (clave === 'completed') return { tipo: 'cerrada_alla', codigo: 'success' };
  if (clave === 'terminated') {
    const maltrato = (pistas.banderas ?? []).some(bandera =>
      BANDERAS_DE_MALTRATO.includes(bandera)
    );
    if (maltrato) return { tipo: 'termina', motivo: 'inapropiada' };
    const severidad = pistas.severidad;
    if (typeof severidad === 'number' && severidad >= SEVERIDAD_DE_CRISIS) {
      return { tipo: 'termina', motivo: 'crisis' };
    }
  }
  return { tipo: 'cerrada_alla', codigo: 'desconocido' };
}

/** Motivo con el que la práctica pasa a Gemini (`sesion_ia.cambio_motivo`) tras un cierre ajeno. */
export const MOTIVO_CAMBIO_POR_CIERRE: Record<CierreAjeno, string> = {
  success: 'cierre_orquestador',
  sin_motivo: 'cierre_sin_motivo',
  desconocido: 'cierre_desconocido',
};
