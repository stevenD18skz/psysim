/*
 * Tiempo de consulta. Toda práctica tiene un marco de tiempo y un punto final que el estudiante
 * conoce desde las instrucciones (estándar de diseño de simulación de INACSL): encuadrar el
 * tiempo y cerrar la entrevista son parte de lo que se practica.
 *
 *   primera intervención ──▶ consulta (10, 15, 20 o 30 min) ──▶ margen de cierre (5 min) ──▶ fin
 *                              · aviso a los 3 min del final      el estudiante cierra;
 *                              · al cumplirse, invitación         pasado el margen, la práctica
 *                                a cerrar                         termina sola
 *
 * El tiempo lo cuenta la base de datos (`sesion.consulta_inicio` y `tiempo_de_consulta`). El
 * navegador solo lo muestra: recibe del servidor cuánto lleva y avanza con su reloj monotónico.
 */

/** Duraciones que puede elegir el docente al asignar (minutos). Coincide con el `check` de la BD. */
export const DURACIONES_CONSULTA_MIN = [10, 15, 20, 30] as const;
export type DuracionConsultaMin = (typeof DURACIONES_CONSULTA_MIN)[number];
export const DURACION_CONSULTA_POR_DEFECTO: DuracionConsultaMin = 15;

/** Desde cuándo se avisa que la consulta está por terminar (segundos antes del final). */
export const AVISO_FINAL_S = 180;
/** Margen para cerrar la entrevista después de cumplirse el tiempo (segundos). */
export const GRACIA_CONSULTA_S = 300;
/**
 * Tolerancia al anotar que una práctica terminó por tiempo: el navegador la termina sola al
 * acabar el margen, unos instantes antes o después de lo que mide la base de datos.
 */
export const TOLERANCIA_FIN_S = 15;

export interface TiempoConsulta {
  /** Duración de la consulta, en segundos. */
  duracionS: number;
  /** Segundos desde la primera intervención del estudiante; `null` si aún no ha intervenido. */
  transcurridoS: number | null;
}

export type FaseConsulta =
  /** El estudiante todavía no ha intervenido: el tiempo no corre. */
  | 'sin_iniciar'
  | 'en_curso'
  /** Quedan 3 minutos o menos. */
  | 'por_terminar'
  /** El tiempo se cumplió: es momento de cerrar. Todavía se puede conversar (margen). */
  | 'cumplida'
  /** Se acabó también el margen: no se aceptan más intervenciones y la práctica termina. */
  | 'vencida';

export function faseDeConsulta({ duracionS, transcurridoS }: TiempoConsulta): FaseConsulta {
  if (transcurridoS === null) return 'sin_iniciar';
  if (transcurridoS >= duracionS + GRACIA_CONSULTA_S) return 'vencida';
  if (transcurridoS >= duracionS) return 'cumplida';
  return duracionS - transcurridoS <= AVISO_FINAL_S ? 'por_terminar' : 'en_curso';
}

/**
 * El tiempo de consulta como lo lleva el navegador: el último valor que dio el servidor y cuándo
 * llegó, según el reloj monotónico (`performance.now()`), que no cambia si se ajusta la hora del
 * equipo. Solo sirve para mostrarlo: lo que se acepta o no lo decide el servidor.
 */
export interface ConsultaEnPantalla extends TiempoConsulta {
  medidoEn: number;
}

/** Cuánto lleva la consulta ahora, a partir del último dato del servidor. */
export function consultaAhora(consulta: ConsultaEnPantalla, ahora: number): TiempoConsulta {
  if (consulta.transcurridoS === null) return consulta;
  return {
    duracionS: consulta.duracionS,
    transcurridoS:
      consulta.transcurridoS + Math.max(0, Math.floor((ahora - consulta.medidoEn) / 1000)),
  };
}

/** Minutos de consulta que quedan, redondeados hacia arriba (lo que se le muestra al estudiante). */
export function minutosRestantes({ duracionS, transcurridoS }: TiempoConsulta): number {
  return Math.max(0, Math.ceil((duracionS - (transcurridoS ?? 0)) / 60));
}

/** «15 minutos», «1 minuto». */
export function enMinutos(minutos: number): string {
  return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
}

/**
 * ¿Terminó la práctica al cumplirse el tiempo de la consulta y su margen? Se decide con dos horas
 * de la base de datos (el inicio de la consulta y el fin de la práctica), nunca con el navegador.
 */
export function terminoPorTiempo(sesion: {
  consultaInicio: string | null;
  fin: string | null;
  duracionMinutos: number;
}): boolean {
  if (!sesion.consultaInicio || !sesion.fin) return false;
  const transcurridoS = (Date.parse(sesion.fin) - Date.parse(sesion.consultaInicio)) / 1000;
  if (!Number.isFinite(transcurridoS)) return false;
  return transcurridoS >= sesion.duracionMinutos * 60 + GRACIA_CONSULTA_S - TOLERANCIA_FIN_S;
}

/**
 * Opción B: el paciente puede notar que se acabó el tiempo, una sola vez. Corresponde en el primer
 * turno que llega con el tiempo ya cumplido: cuando la última respuesta guardada es anterior al
 * final previsto de la consulta. Si ya hubo un turno después, el paciente ya tuvo su ocasión.
 */
export function debeNotarElTiempo(
  { duracionS, transcurridoS }: TiempoConsulta,
  /** Segundos desde que se guardó la última respuesta del paciente (`null` si no hay ninguna). */
  desdeLaUltimaRespuestaS: number | null
): boolean {
  if (transcurridoS === null || transcurridoS < duracionS) return false;
  if (desdeLaUltimaRespuestaS === null) return true;
  // La última respuesta se guardó cuando la consulta llevaba `transcurrido - desde` segundos.
  return transcurridoS - desdeLaUltimaRespuestaS < duracionS;
}

/** Lo que lee el estudiante sobre el tiempo, en las instrucciones y durante la práctica. */
export const TEXTO_TIEMPO = {
  porTerminar: 'Quedan 3 minutos de consulta',
  cumplida: 'Es momento de cerrar la consulta',
  /** Respuesta del servidor cuando ya no se aceptan intervenciones. */
  vencida: 'Se cumplió el tiempo de la consulta. La práctica termina aquí.',
} as const;
