import { type StateCreator } from 'zustand';

import { type MensajeConversacion, type SesionActiva } from '@/types';

import { type AppState } from './app-store';
import { estadoInicialConversacion } from './conversacion-slice';
import { metricasDesdeHistorial } from './metricas-slice';
import { estadoInicialNpc } from './npc-slice';

export interface SesionState {
  /** Sesión de simulación en curso (HU-06 · T04). `null` si no hay ninguna. */
  activa: SesionActiva | null;
}

export interface SesionSlice {
  sesion: SesionState & {
    /**
     * HU-14 · T02 (`iniciarSesion`) — Registra la sesión activa y reinicia la conversación, el
     * estado del NPC y las métricas. `historial` permite retomar una conversación ya guardada
     * (p. ej. tras recargar la página).
     */
    iniciar: (sesion: SesionActiva, historial?: MensajeConversacion[]) => void;
    /**
     * HU-23 · T03 — El estudiante confirmó las instrucciones: marca la sesión como comenzada con
     * la hora de inicio que fijó la base de datos.
     */
    comenzar: (inicio: string) => void;
    /** HU-14 · T02 (`limpiarSesion`) — Resetea todos los slices de la sesión activa. */
    limpiar: () => void;
  };
}

export const estadoInicialSesion: SesionState = { activa: null };

/** Slice `sesion`: datos de la simulación activa (escenario, paciente y estudiante). */
export const crearSesionSlice =
  (inicial: SesionState = estadoInicialSesion): StateCreator<AppState, [], [], SesionSlice> =>
  set => ({
    sesion: {
      ...inicial,
      iniciar: (activa, historial = []) =>
        set(state => ({
          sesion: { ...state.sesion, activa },
          conversacion: {
            ...state.conversacion,
            ...estadoInicialConversacion,
            mensajes: historial,
          },
          npc: { ...state.npc, ...estadoInicialNpc },
          metricas: { ...state.metricas, ...metricasDesdeHistorial(historial) },
        })),
      comenzar: inicio =>
        set(state => {
          const { activa } = state.sesion;
          if (!activa) return state;
          return { sesion: { ...state.sesion, activa: { ...activa, comenzada: true, inicio } } };
        }),
      limpiar: () =>
        set(state => ({
          sesion: { ...state.sesion, ...estadoInicialSesion },
          conversacion: { ...state.conversacion, ...estadoInicialConversacion },
          npc: { ...state.npc, ...estadoInicialNpc },
          metricas: { ...state.metricas, ...metricasDesdeHistorial([]) },
        })),
    },
  });
