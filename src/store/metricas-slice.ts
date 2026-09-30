import { type StateCreator } from 'zustand';

import { type AppState } from './app-store';

export interface MetricasState {
  /** Intervenciones del estudiante en la sesión. */
  totalMensajes: number;
  /** Latencia percibida de cada respuesta del NPC, en milisegundos (HU-13 · T03). */
  latencias: number[];
  /** Consumo acumulado de la IA (no se muestra; se persiste al cerrar en el Sprint 4). */
  tokensEntrada: number;
  tokensSalida: number;
}

export interface MetricasSlice {
  metricas: MetricasState & {
    registrarTokens: (entrada: number | null, salida: number | null) => void;
  };
}

export const estadoInicialMetricas: MetricasState = {
  totalMensajes: 0,
  latencias: [],
  tokensEntrada: 0,
  tokensSalida: 0,
};

/** Slice `metricas`: indicadores capturados en silencio durante la sesión (base del Sprint 4). */
export const crearMetricasSlice =
  (inicial: MetricasState = estadoInicialMetricas): StateCreator<AppState, [], [], MetricasSlice> =>
  set => ({
    metricas: {
      ...inicial,
      registrarTokens: (entrada, salida) =>
        set(state => ({
          metricas: {
            ...state.metricas,
            tokensEntrada: state.metricas.tokensEntrada + (entrada ?? 0),
            tokensSalida: state.metricas.tokensSalida + (salida ?? 0),
          },
        })),
    },
  });

/** Estado de métricas derivado de un historial ya existente (p. ej. al recargar la página). */
export function metricasDesdeHistorial(
  mensajes: readonly { remitente: string; latencia_ms?: number }[]
): MetricasState {
  return {
    ...estadoInicialMetricas,
    totalMensajes: mensajes.filter(m => m.remitente === 'estudiante').length,
    latencias: mensajes.flatMap(m =>
      m.remitente === 'npc' && m.latencia_ms !== undefined ? [m.latencia_ms] : []
    ),
  };
}
