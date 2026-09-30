import { createStore } from 'zustand/vanilla';

import { type AuthSlice, type AuthState, crearAuthSlice } from './auth-slice';

/** Estado global de la aplicación. Los próximos sprints añaden aquí sus slices. */
export type AppState = AuthSlice;

export interface EstadoInicialApp {
  auth?: AuthState;
}

/**
 * Crea una instancia del store. En Next.js no se usa un store global a nivel de módulo:
 * en el servidor sería compartido entre peticiones de distintos usuarios. Cada árbol de
 * React obtiene su propia instancia a través de `AppStoreProvider`.
 */
export function crearAppStore(inicial: EstadoInicialApp = {}) {
  return createStore<AppState>()((...args) => ({
    ...crearAuthSlice(inicial.auth)(...args),
  }));
}

export type AppStore = ReturnType<typeof crearAppStore>;
