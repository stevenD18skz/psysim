import { type MetricsSaveRequest } from '@/schemas/metrics.schema';

/** Lo que el store de métricas acumula durante la práctica (ver `metricas-slice`). */
export interface MetricasCapturadas {
  totalMensajes: number;
  /** Latencia percibida de cada respuesta del paciente, en milisegundos. */
  latencias: readonly number[];
  /** Suma de las distancias muestreadas al paciente (m) y cuántas muestras son. */
  proximidadSuma: number;
  proximidadMuestras: number;
}

export interface MetricasAgregadas {
  latencia_promedio_ms: number | null;
  latencia_maxima_ms: number | null;
}

/**
 * HU-18 · T04 — Indicadores agregados de las latencias de la sesión. Sin respuestas del paciente
 * devuelve `null` (no 0 ni NaN): una práctica sin conversación no tiene latencia que promediar.
 */
export function calcularMetricasAgregadas(latencias: readonly number[]): MetricasAgregadas {
  if (latencias.length === 0) return { latencia_promedio_ms: null, latencia_maxima_ms: null };
  const suma = latencias.reduce((total, valor) => total + valor, 0);
  return {
    latencia_promedio_ms: Math.round(suma / latencias.length),
    latencia_maxima_ms: Math.max(...latencias),
  };
}

/** HU-18 · T03 — Distancia media al paciente (m, con dos decimales) o `null` sin muestras. */
export function promediarProximidad(suma: number, muestras: number): number | null {
  return muestras > 0 ? Math.round((suma / muestras) * 100) / 100 : null;
}

/**
 * HU-18 · T04 — Arma el cuerpo de `/api/metrics/save` con lo capturado en la sesión. Las latencias
 * se redondean a milisegundos enteros (el contrato no admite decimales).
 */
export function construirMetricasCierre(
  sesionId: string,
  metricas: MetricasCapturadas
): MetricsSaveRequest {
  const enteras = metricas.latencias.map(valor => Math.max(0, Math.round(valor)));
  return {
    sesion_id: sesionId,
    total_mensajes: metricas.totalMensajes,
    ...calcularMetricasAgregadas(enteras),
    indicadores: {
      proximidad_promedio: promediarProximidad(
        metricas.proximidadSuma,
        metricas.proximidadMuestras
      ),
    },
  };
}
