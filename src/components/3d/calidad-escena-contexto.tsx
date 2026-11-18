'use client';

import { createContext, useContext } from 'react';

import { CALIDAD_INICIAL, type CalidadEscena } from '@/lib/escena/calidad';

/**
 * La calidad que decidió el lienzo según el rendimiento (`lib/escena/calidad.ts`). Lo provee
 * `SceneCanvas` dentro del `<Canvas>`; fuera de él, la escena va con la calidad completa.
 */
export const ContextoCalidadEscena = createContext<CalidadEscena>(CALIDAD_INICIAL);

export function useCalidadEscena(): CalidadEscena {
  return useContext(ContextoCalidadEscena);
}
