import { type StateCreator } from 'zustand';

import { type AppState } from './app-store';

export interface MetricasState {
  /** Intervenciones del estudiante en la sesión. */
  totalMensajes: number;
  /** Latencia percibida de cada respuesta del NPC, en milisegundos (HU-13 · T03). */
  latencias: number[];
  /** Consumo acumulado de la IA en el navegador (el total que se guarda lo suma la base de datos). */
  tokensEntrada: number;
  tokensSalida: number;
  /** HU-18 · T03: suma de las distancias muestreadas al paciente (m) y número de muestras. */
  proximidadSuma: number;
  proximidadMuestras: number;
}

export interface MetricasSlice {
  metricas: MetricasState & {
    registrarTokens: (entrada: number | null, salida: number | null) => void;
    /** HU-18 · T03 — Anota una muestra de la distancia (m) entre el estudiante y el paciente. */
    registrarProximidad: (distancia: number) => void;
  };
}

export const estadoInicialMetricas: MetricasState = {
  totalMensajes: 0,
  latencias: [],
  tokensEntrada: 0,
  tokensSalida: 0,
  proximidadSuma: 0,
  proximidadMuestras: 0,
};

/** Slice `metricas`: indicadores capturados en silencio durante la sesión (HU-18). */
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
      registrarProximidad: distancia => {
        // Antes de que cargue la escena la distancia es Infinity: no es una muestra.
        if (!Number.isFinite(distancia) || distancia < 0) return;
        set(state => ({
          metricas: {
            ...state.metricas,
            proximidadSuma: state.metricas.proximidadSuma + distancia,
            proximidadMuestras: state.metricas.proximidadMuestras + 1,
          },
        }));
      },
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
