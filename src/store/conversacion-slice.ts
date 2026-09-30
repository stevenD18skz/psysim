import { type StateCreator } from 'zustand';

import { type MensajeConversacion } from '@/types';

import { type AppState } from './app-store';

export interface ConversacionState {
  /** Historial de la sesión activa, en orden cronológico. */
  mensajes: MensajeConversacion[];
  /**
   * Mensaje del estudiante que aún no tiene respuesta (se está procesando o falló). Permite
   * reintentarlo sin duplicarlo en el historial (HU-16 · T02).
   */
  pendiente: MensajeConversacion | null;
  /** Último error de comunicación con el paciente, para mostrarlo al estudiante (HU-16). */
  error: string | null;
}

export interface ConversacionSlice {
  conversacion: ConversacionState & {
    /** HU-14 · T02 — Añade un mensaje al historial y actualiza las métricas asociadas. */
    agregarMensaje: (mensaje: MensajeConversacion) => void;
    establecerPendiente: (mensaje: MensajeConversacion | null) => void;
    establecerError: (error: string | null) => void;
  };
}

export const estadoInicialConversacion: ConversacionState = {
  mensajes: [],
  pendiente: null,
  error: null,
};

export const crearConversacionSlice =
  (
    inicial: ConversacionState = estadoInicialConversacion
  ): StateCreator<AppState, [], [], ConversacionSlice> =>
  set => ({
    conversacion: {
      ...inicial,
      agregarMensaje: mensaje =>
        set(state => {
          const { metricas } = state;
          return {
            conversacion: {
              ...state.conversacion,
              mensajes: [...state.conversacion.mensajes, mensaje],
            },
            metricas:
              mensaje.remitente === 'estudiante'
                ? { ...metricas, totalMensajes: metricas.totalMensajes + 1 }
                : mensaje.latencia_ms !== undefined
                  ? { ...metricas, latencias: [...metricas.latencias, mensaje.latencia_ms] }
                  : metricas,
          };
        }),
      establecerPendiente: pendiente =>
        set(state => ({ conversacion: { ...state.conversacion, pendiente } })),
      establecerError: error => set(state => ({ conversacion: { ...state.conversacion, error } })),
    },
  });
