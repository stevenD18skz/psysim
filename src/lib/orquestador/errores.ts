/**
 * Fallos del orquestador ya clasificados. De cada tipo depende qué hace PsySim: esperar, reintentar,
 * resincronizar el caso o pasar la práctica a Gemini (`docs/orquestador.md`).
 */
export type TipoErrorOrquestador =
  /** No hubo respuesta: DNS, conexión rechazada o cortada. */
  | 'red'
  | 'tiempo_agotado'
  /** 5xx. Con 502 el orquestador garantiza que descartó el turno. */
  | 'servidor'
  /** 500 en conversación o `discarded: false`: el turno pudo quedar guardado en su historial. */
  | 'descarte_incierto'
  /** 401 que sigue después de volver a iniciar sesión, o credenciales rechazadas. */
  | 'autenticacion'
  /** 403: la cuenta no es dueña de la sesión o no tiene el rol. Es un error de PsySim. */
  | 'permiso'
  /** 404: la sesión, el perfil o el escenario ya no existen (datos de prueba borrados). */
  | 'no_encontrado'
  /** 400 o 422: PsySim envió algo que el orquestador no acepta, o la sesión ya estaba cerrada. */
  | 'datos'
  /** 429: se pasó de 10 mensajes por minuto en esa cuenta. Se espera; nunca activa Gemini. */
  | 'limite'
  /** Respondió 2xx, pero con un cuerpo que no cumple el contrato. */
  | 'respuesta_invalida';

export class ErrorOrquestador extends Error {
  readonly tipo: TipoErrorOrquestador;
  readonly estado: number | null;
  /** Solo con `limite`: segundos que pide esperar (`Retry-After`), si los indicó. */
  readonly esperaS: number | null;

  constructor(
    tipo: TipoErrorOrquestador,
    opciones: { estado?: number; esperaS?: number | null; cause?: unknown } = {}
  ) {
    super(`Fallo del orquestador: ${tipo}`, { cause: opciones.cause });
    this.name = 'ErrorOrquestador';
    this.tipo = tipo;
    this.estado = opciones.estado ?? null;
    this.esperaS = opciones.esperaS ?? null;
  }
}

/** Traduce el código HTTP de una respuesta fallida. `enConversacion`: rutas `/conversation/*`. */
export function clasificarEstado(estado: number, enConversacion = false): TipoErrorOrquestador {
  if (estado === 401) return 'autenticacion';
  if (estado === 403) return 'permiso';
  if (estado === 404) return 'no_encontrado';
  if (estado === 429) return 'limite';
  if (estado === 408 || estado === 504) return 'tiempo_agotado';
  if (estado === 500 && enConversacion) return 'descarte_incierto';
  if (estado >= 500) return 'servidor';
  return 'datos';
}

/** Traduce una excepción de `fetch` (o de la lectura del cuerpo). */
export function clasificarExcepcion(error: unknown): TipoErrorOrquestador {
  // `AbortSignal.timeout` rechaza con un DOMException, que no siempre es `instanceof Error`.
  const nombre =
    typeof error === 'object' && error !== null && 'name' in error ? error.name : undefined;
  return nombre === 'TimeoutError' || nombre === 'AbortError' ? 'tiempo_agotado' : 'red';
}

/** Segundos de `Retry-After` (admite segundos o una fecha HTTP), o `null` si no es legible. */
export function leerRetryAfter(valor: string | null, ahora: number = Date.now()): number | null {
  if (!valor) return null;
  const segundos = Number(valor);
  if (Number.isFinite(segundos)) return segundos >= 0 ? Math.ceil(segundos) : null;
  const fecha = Date.parse(valor);
  return Number.isNaN(fecha) ? null : Math.max(0, Math.ceil((fecha - ahora) / 1000));
}

/**
 * ¿Este fallo significa que el orquestador no está disponible? Solo entonces el turno lo responde
 * Gemini. Un 429 se espera; un 400, 403, 404 o 422 es un error de PsySim o de sus datos y se trata
 * como tal (pasarlo a Gemini lo escondería).
 */
export function esFalloDelServicio(tipo: TipoErrorOrquestador): boolean {
  return (
    tipo === 'red' ||
    tipo === 'tiempo_agotado' ||
    tipo === 'servidor' ||
    tipo === 'descarte_incierto' ||
    tipo === 'autenticacion' ||
    tipo === 'respuesta_invalida'
  );
}
