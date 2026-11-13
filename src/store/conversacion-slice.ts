import { type StateCreator } from 'zustand';

import { type MotivoCierre } from '@/lib/conversacion/cierre';
import { type MensajeConversacion } from '@/types';

import { type AppState } from './app-store';
import { metricasDesdeHistorial } from './metricas-slice';

/** El paciente todavía no puede responder: el servidor espera cupo con su proveedor de IA. */
export interface EsperaPaciente {
  /** Cuándo se envió la intervención (ms, reloj del navegador). */
  desde: number;
  /** Cuándo se espera que el paciente pueda empezar a responder. */
  hasta: number;
}

export interface ConversacionState {
  /** Historial de la sesión activa, en orden cronológico. */
  mensajes: MensajeConversacion[];
  /**
   * Mensaje del estudiante que aún no tiene respuesta completa (se está procesando, la respuesta
   * está llegando o falló). Permite reintentarlo sin duplicarlo en el historial (HU-16 · T02).
   */
  pendiente: MensajeConversacion | null;
  /** Último error de comunicación con el paciente, para mostrarlo al estudiante (HU-16). */
  error: string | null;
  /** Espera anunciada por el servidor para la respuesta en camino. */
  espera: EsperaPaciente | null;
  /** El paciente dio por terminada la consulta: no se conversa más y la práctica se cierra. */
  cierre: MotivoCierre | null;
}

export interface ConversacionSlice {
  conversacion: ConversacionState & {
    /** HU-14 · T02 — Añade un mensaje al historial y actualiza las métricas asociadas. */
    agregarMensaje: (mensaje: MensajeConversacion) => void;
    /** Añade texto al final de un mensaje (la respuesta del paciente llega por partes). */
    ampliarMensaje: (id: string, texto: string) => void;
    /**
     * Cambia campos de un mensaje. Si recibe por primera vez su latencia, la suma a las métricas
     * (una respuesta por partes la conoce al completarse).
     */
    actualizarMensaje: (id: string, cambios: Partial<Omit<MensajeConversacion, 'id'>>) => void;
    /** Quita un mensaje: la respuesta que estaba llegando se cortó y no vale. */
    quitarMensaje: (id: string) => void;
    establecerPendiente: (mensaje: MensajeConversacion | null) => void;
    establecerError: (error: string | null) => void;
    establecerEspera: (espera: EsperaPaciente | null) => void;
    establecerCierre: (cierre: MotivoCierre | null) => void;
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
  espera: null,
  cierre: null,
};

/** ¿Hay una respuesta del paciente en camino (pedida o llegando por partes)? */
export function respuestaEnCamino(state: AppState): boolean {
  return (
    state.npc.estado === 'procesando' ||
    (state.npc.estado === 'respondiendo' && state.conversacion.mensajes.at(-1)?.enCurso === true)
  );
}

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
      ampliarMensaje: (id, texto) =>
        set(state => ({
          conversacion: {
            ...state.conversacion,
            mensajes: state.conversacion.mensajes.map(mensaje =>
              mensaje.id === id ? { ...mensaje, contenido: mensaje.contenido + texto } : mensaje
            ),
          },
        })),
      actualizarMensaje: (id, cambios) =>
        set(state => {
          const anterior = state.conversacion.mensajes.find(mensaje => mensaje.id === id);
          if (!anterior) return state;
          const estrenaLatencia =
            anterior.latencia_ms === undefined && cambios.latencia_ms !== undefined;
          return {
            conversacion: {
              ...state.conversacion,
              mensajes: state.conversacion.mensajes.map(mensaje =>
                mensaje.id === id ? { ...mensaje, ...cambios } : mensaje
              ),
            },
            metricas: estrenaLatencia
              ? {
                  ...state.metricas,
                  latencias: [...state.metricas.latencias, cambios.latencia_ms!],
                }
              : state.metricas,
          };
        }),
      quitarMensaje: id =>
        set(state => ({
          conversacion: {
            ...state.conversacion,
            mensajes: state.conversacion.mensajes.filter(mensaje => mensaje.id !== id),
          },
        })),
      establecerPendiente: pendiente =>
        set(state => ({ conversacion: { ...state.conversacion, pendiente } })),
      establecerError: error => set(state => ({ conversacion: { ...state.conversacion, error } })),
      establecerEspera: espera =>
        set(state => ({ conversacion: { ...state.conversacion, espera } })),
      establecerCierre: cierre =>
        set(state => ({ conversacion: { ...state.conversacion, cierre } })),
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
