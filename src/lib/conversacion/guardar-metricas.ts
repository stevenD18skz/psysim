import { construirMetricasCierre } from '@/lib/metrics';
import { metricsSaveErrorSchema, metricsSaveResponseSchema } from '@/schemas/metrics.schema';
import { type AppStore } from '@/store/app-store';

export const RUTA_METRICAS = '/api/metrics/save';

/** Tiempo máximo que el cliente espera al servidor al guardar (la función tarda menos de 1 s). */
export const TIEMPO_MAXIMO_GUARDADO_MS = 15_000;

/**
 * Cómo terminó el intento de guardar:
 * - `guardadas`: las métricas y el cierre de la sesión quedaron en la base de datos.
 * - `ya_terminada`: la sesión ya no estaba en curso (otra pestaña o el cierre por inactividad).
 * - `fallo`: no se pudo guardar; la sesión sigue en curso.
 */
export type ResultadoGuardado =
  { estado: 'guardadas' } | { estado: 'ya_terminada' } | { estado: 'fallo'; motivo: string };

interface OpcionesGuardado {
  fetch?: typeof fetch;
}

/**
 * HU-20 · T02 — Envía a /api/metrics/save las métricas capturadas en el store (HU-18). El servidor
 * las guarda y cierra la sesión en una sola operación, así que el estudiante puede reintentar si
 * falla sin dejar nada a medias.
 */
export async function guardarMetricas(
  store: AppStore,
  { fetch: hacerFetch = fetch }: OpcionesGuardado = {}
): Promise<ResultadoGuardado> {
  const { sesion, metricas } = store.getState();
  if (!sesion.activa)
    return { estado: 'fallo', motivo: 'No hay una práctica abierta. Vuelve a Mis prácticas.' };

  let respuesta: Response;
  try {
    respuesta = await hacerFetch(RUTA_METRICAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(construirMetricasCierre(sesion.activa.id, metricas)),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_GUARDADO_MS),
    });
  } catch {
    return { estado: 'fallo', motivo: 'Sin conexión con el servidor.' };
  }

  const json: unknown = await respuesta.json().catch(() => null);
  if (respuesta.ok) {
    return metricsSaveResponseSchema.safeParse(json).success
      ? { estado: 'guardadas' }
      : { estado: 'fallo', motivo: 'Respuesta inesperada del servidor.' };
  }
  if (respuesta.status === 409) return { estado: 'ya_terminada' };

  const error = metricsSaveErrorSchema.safeParse(json);
  return {
    estado: 'fallo',
    motivo: error.success
      ? error.data.error
      : 'No pudimos guardar los resultados. Inténtalo de nuevo.',
  };
}
