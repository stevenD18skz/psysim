import { calcularMetricasAgregadas } from '@/lib/metrics';
import { duracionSesion } from '@/lib/sesiones/estados';
import { type DetalleSesion, type MetricasSesion } from '@/types';

/** Fila de `metrica` tal como la devuelve la base de datos. */
export interface FilaMetrica {
  total_mensajes: number;
  latencia_promedio_ms: number | null;
  latencia_maxima_ms: number | null;
  duracion_segundos: number;
  indicadores: unknown;
}

/** `indicadores.proximidad_promedio` si es un número válido (el JSON no tiene tipo en la base). */
function proximidadDe(indicadores: unknown): number | null {
  if (typeof indicadores !== 'object' || indicadores === null) return null;
  const valor = (indicadores as Record<string, unknown>).proximidad_promedio;
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/**
 * HU-21 — Indicadores de una práctica terminada. Si el navegador alcanzó a enviarlos, son los
 * guardados. Si no (cierre por inactividad, error al guardar, prácticas anteriores a las
 * métricas), se reconstruyen con lo que sí quedó en la base de datos: las intervenciones y las
 * latencias que mide el servidor en cada respuesta del paciente, y la duración de la sesión. La
 * proximidad solo se mide en el navegador, así que en ese caso queda sin valor.
 */
export function metricasDeSesion(
  sesion: Pick<DetalleSesion, 'comenzada' | 'inicio' | 'fin' | 'mensajes'>,
  fila: FilaMetrica | null
): MetricasSesion {
  if (fila) {
    return {
      totalMensajes: fila.total_mensajes,
      latenciaPromedioMs: fila.latencia_promedio_ms,
      latenciaMaximaMs: fila.latencia_maxima_ms,
      duracionSegundos: fila.duracion_segundos,
      proximidadPromedioM: proximidadDe(fila.indicadores),
      origen: 'guardadas',
    };
  }

  const latencias = sesion.mensajes.flatMap(m =>
    m.remitente === 'npc' && m.latencia_ms !== undefined ? [m.latencia_ms] : []
  );
  const { latencia_promedio_ms, latencia_maxima_ms } = calcularMetricasAgregadas(latencias);
  return {
    totalMensajes: sesion.mensajes.filter(m => m.remitente === 'estudiante').length,
    latenciaPromedioMs: latencia_promedio_ms,
    latenciaMaximaMs: latencia_maxima_ms,
    duracionSegundos: duracionSesion(sesion),
    proximidadPromedioM: null,
    origen: 'reconstruidas',
  };
}

/** Latencia legible: "850 ms" por debajo de un segundo y "1,8 s" desde ahí; `null` → "—". */
export function formatearLatencia(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}

/** Distancia al paciente en metros con coma decimal ("1,8 m"); `null` → "—". */
export function formatearDistancia(metros: number | null): string {
  if (metros === null) return '—';
  return `${metros.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
}
