import { type StateCreator } from 'zustand';

import { type SesionActiva } from '@/types';

export interface SesionState {
  /** Sesión de simulación en curso (HU-06 · T04). `null` si no hay ninguna. */
  activa: SesionActiva | null;
}

export interface SesionSlice {
  sesion: SesionState & {
    /** Registra la sesión creada en Supabase para que la consuman la escena 3D y el chat. */
    iniciar: (sesion: SesionActiva) => void;
    limpiar: () => void;
  };
}

export const estadoInicialSesion: SesionState = { activa: null };

/** Slice `sesion`: datos de la simulación activa (escenario, paciente y estudiante). */
export const crearSesionSlice =
  (inicial: SesionState = estadoInicialSesion): StateCreator<SesionSlice, [], [], SesionSlice> =>
  set => ({
    sesion: {
      ...inicial,
      iniciar: activa => set(state => ({ sesion: { ...state.sesion, activa } })),
      limpiar: () => set(state => ({ sesion: { ...state.sesion, ...estadoInicialSesion } })),
    },
  });
