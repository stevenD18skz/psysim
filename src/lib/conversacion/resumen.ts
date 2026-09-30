export interface ResumenSesion {
  duracionSegundos: number;
  intervenciones: number;
  /** Latencia media de las respuestas del paciente (ms), o `null` si no hubo respuestas. */
  latenciaPromedioMs: number | null;
}

/**
 * Resumen mostrado al cerrar la sesión. La duración se calcula con las horas de inicio y fin
 * que asigna la base de datos (no con el reloj del navegador). El Sprint 4 (HU-18/21) amplía
 * estos indicadores y los persiste.
 */
export function resumirSesion(
  inicio: string,
  fin: string,
  metricas: { totalMensajes: number; latencias: readonly number[] }
): ResumenSesion {
  const { latencias } = metricas;
  return {
    duracionSegundos: Math.max(0, Math.round((Date.parse(fin) - Date.parse(inicio)) / 1000)),
    intervenciones: metricas.totalMensajes,
    latenciaPromedioMs:
      latencias.length > 0
        ? Math.round(latencias.reduce((suma, valor) => suma + valor, 0) / latencias.length)
        : null,
  };
}

/** "mm:ss" (o "h:mm:ss" desde una hora). */
export function formatearDuracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`;
}
