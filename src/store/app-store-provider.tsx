'use client';

import { createContext, type ReactNode, use, useState } from 'react';
import { useStore } from 'zustand';

import { type AppState, type AppStore, crearAppStore, type EstadoInicialApp } from './app-store';

const AppStoreContext = createContext<AppStore | null>(null);

interface AppStoreProviderProps {
  children: ReactNode;
  estadoInicial?: EstadoInicialApp;
}

export function AppStoreProvider({ children, estadoInicial }: AppStoreProviderProps) {
  // El store se crea una sola vez por montaje del provider, hidratado con datos del servidor.
  const [store] = useState(() => crearAppStore(estadoInicial));

  return <AppStoreContext value={store}>{children}</AppStoreContext>;
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = use(AppStoreContext);
  if (!store) {
    throw new Error('useAppStore debe usarse dentro de <AppStoreProvider>.');
  }
  return useStore(store, selector);
}
