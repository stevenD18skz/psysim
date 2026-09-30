import { type StateCreator } from 'zustand';

import { type EstadoNpc, esTransicionValida } from '@/lib/conversacion/estados-npc';

import { type AppState } from './app-store';

export interface NpcState {
  /** Estado del paciente virtual (sección 4.3.4). */
  estado: EstadoNpc;
}

export interface NpcSlice {
  npc: NpcState & {
    /**
     * HU-14 · T02 — Cambia el estado del NPC si la transición es válida. Devuelve `false` (y no
     * cambia nada) ante una transición no permitida, p. ej. un doble envío durante `procesando`.
     */
    actualizarEstadoNPC: (estado: EstadoNpc) => boolean;
  };
}

export const estadoInicialNpc: NpcState = { estado: 'inactivo' };

export const crearNpcSlice =
  (inicial: NpcState = estadoInicialNpc): StateCreator<AppState, [], [], NpcSlice> =>
  (set, get) => ({
    npc: {
      ...inicial,
      actualizarEstadoNPC: estado => {
        const actual = get().npc.estado;
        if (actual === estado) return true;
        if (!esTransicionValida(actual, estado)) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[npc] Transición no permitida: ${actual} → ${estado}`);
          }
          return false;
        }
        set(state => ({ npc: { ...state.npc, estado } }));
        return true;
      },
    },
  });
