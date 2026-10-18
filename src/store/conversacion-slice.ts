import { type StateCreator } from 'zustand';

import { type MensajeConversacion } from '@/types';

import { type AppState } from './app-store';
import { metricasDesdeHistorial } from './metricas-slice';

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
    /** El servidor guardó el intercambio: los mensajes locales reciben el id de la base de datos. */
    confirmarGuardado: (ids: Readonly<Record<string, string | null>>) => void;
    /**
     * Ensayar otra respuesta: quita del historial la intervención indicada y todo lo que vino
     * después (el servidor ya los marcó como descartados).
     */
    volverA: (mensajeId: string) => void;
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
      confirmarGuardado: ids =>
        set(state => ({
          conversacion: {
            ...state.conversacion,
            mensajes: state.conversacion.mensajes.map(mensaje => {
              const id = ids[mensaje.id];
              if (!id) return mensaje;
              const { sinGuardar: _, ...guardado } = mensaje;
              return { ...guardado, id };
            }),
          },
        })),
      volverA: mensajeId =>
        set(state => {
          const indice = state.conversacion.mensajes.findIndex(m => m.id === mensajeId);
          if (indice === -1) return state;
          const mensajes = state.conversacion.mensajes.slice(0, indice);
          const { tokensEntrada, tokensSalida } = state.metricas;
          return {
            conversacion: { ...state.conversacion, mensajes, pendiente: null, error: null },
            metricas: {
              ...state.metricas,
              ...metricasDesdeHistorial(mensajes),
              tokensEntrada,
              tokensSalida,
            },
          };
        }),
    },
  });
