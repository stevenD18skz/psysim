import { type StateCreator } from 'zustand';

import { type PerfilDocente } from '@/types';

export interface AuthState {
  perfil: PerfilDocente | null;
}

export interface AuthSlice {
  auth: AuthState & {
    establecerPerfil: (perfil: PerfilDocente) => void;
    limpiar: () => void;
  };
}

export const estadoInicialAuth: AuthState = { perfil: null };

/** Slice `auth`: perfil del docente autenticado (HU-02 · T04, HU-04 · T01). */
export const crearAuthSlice =
  (inicial: AuthState = estadoInicialAuth): StateCreator<AuthSlice, [], [], AuthSlice> =>
  set => ({
    auth: {
      ...inicial,
      establecerPerfil: perfil => set(state => ({ auth: { ...state.auth, perfil } })),
      limpiar: () => set(state => ({ auth: { ...state.auth, ...estadoInicialAuth } })),
    },
  });
