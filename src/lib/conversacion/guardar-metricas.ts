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
  /** Espera entre intentos; se reemplaza en los tests para no depender del reloj. */
  esperar?: (ms: number) => Promise<void>;
}

/** Esperas antes de cada reintento automático (HU-20 · T02: tres, cada vez más largas). */
export const ESPERAS_REINTENTO_MS = [1_000, 2_000, 4_000] as const;

const esperarReal = (ms: number) => new Promise<void>(listo => setTimeout(listo, ms));

/** Con sesión inválida, sin permiso o con datos rechazados, repetir la petición no cambia nada. */
const esPasajero = (status: number) => status === 408 || status === 429 || status >= 500;

interface Intento {
  resultado: ResultadoGuardado;
  reintentable: boolean;
}

/** Un envío. La validez del cuerpo no cambia entre intentos: solo la red y el servidor pueden. */
async function enviarMetricas(cuerpo: string, hacerFetch: typeof fetch): Promise<Intento> {
  let respuesta: Response;
  try {
    respuesta = await hacerFetch(RUTA_METRICAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_GUARDADO_MS),
    });
  } catch {
    return {
      resultado: { estado: 'fallo', motivo: 'Sin conexión con el servidor.' },
      reintentable: true,
    };
  }

  const json: unknown = await respuesta.json().catch(() => null);
  if (respuesta.ok) {
    return {
      resultado: metricsSaveResponseSchema.safeParse(json).success
        ? { estado: 'guardadas' }
        : { estado: 'fallo', motivo: 'Respuesta inesperada del servidor.' },
      reintentable: false,
    };
  }
  if (respuesta.status === 409)
    return { resultado: { estado: 'ya_terminada' }, reintentable: false };

  const error = metricsSaveErrorSchema.safeParse(json);
  return {
    resultado: {
      estado: 'fallo',
      motivo: error.success
        ? error.data.error
        : 'No pudimos guardar los resultados. Inténtalo de nuevo.',
    },
    reintentable: esPasajero(respuesta.status),
  };
}

/**
 * HU-20 · T02 — Envía a /api/metrics/save las métricas capturadas en el store (HU-18). Ante un
 * fallo pasajero reintenta hasta tres veces con espera creciente. Repetir es seguro: el servidor
 * guarda y cierra la sesión en una sola operación, así que si se perdió la respuesta de un intento
 * que sí se guardó, el siguiente recibe 409 (`ya_terminada`) y nada se duplica.
 */
export async function guardarMetricas(
  store: AppStore,
  { fetch: hacerFetch = fetch, esperar = esperarReal }: OpcionesGuardado = {}
): Promise<ResultadoGuardado> {
  const { sesion, metricas } = store.getState();
  if (!sesion.activa)
    return { estado: 'fallo', motivo: 'No hay una práctica abierta. Vuelve a Mis prácticas.' };

  const cuerpo = JSON.stringify(construirMetricasCierre(sesion.activa.id, metricas));
  let intento = await enviarMetricas(cuerpo, hacerFetch);
  for (const espera of ESPERAS_REINTENTO_MS) {
    if (!intento.reintentable) break;
    await esperar(espera);
    intento = await enviarMetricas(cuerpo, hacerFetch);
  }
  return intento.resultado;
}
