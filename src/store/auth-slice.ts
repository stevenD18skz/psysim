import { type StateCreator } from 'zustand';

import { type PerfilUsuario } from '@/types';

import { type AppState } from './app-store';

export interface AuthState {
  perfil: PerfilUsuario | null;
}

export interface AuthSlice {
  auth: AuthState & {
    establecerPerfil: (perfil: PerfilUsuario) => void;
    limpiar: () => void;
  };
}

export const estadoInicialAuth: AuthState = { perfil: null };

/** Slice `auth`: perfil del docente autenticado (HU-02 · T04, HU-04 · T01). */
export const crearAuthSlice =
  (inicial: AuthState = estadoInicialAuth): StateCreator<AppState, [], [], AuthSlice> =>
  set => ({
    auth: {
      ...inicial,
      establecerPerfil: perfil => set(state => ({ auth: { ...state.auth, perfil } })),
      limpiar: () => set(state => ({ auth: { ...state.auth, ...estadoInicialAuth } })),
    },
  });
