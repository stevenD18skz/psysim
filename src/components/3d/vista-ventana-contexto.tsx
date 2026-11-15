'use client';

import { createContext, useContext, useState } from 'react';

import {
  elegirVistaVentana,
  VISTA_POR_DEFECTO,
  type VistaVentana,
} from '@/lib/ambiente/vista-ventana';

const ContextoVistaVentana = createContext<VistaVentana>(VISTA_POR_DEFECTO);

/** Lee `?ventana=` (p. ej. «lago-noche») para revisar una variante concreta. */
function vistaForzada(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ventana');
}

/**
 * Sortea una sola vez, al montar la escena, lo que se ve por la ventana. La vista y la luz de la
 * sala leen la misma elección: si cada una sorteara la suya, la ventana podría mostrar la noche con
 * la sala bañada en sol de mediodía.
 */
export function VistaVentanaProvider({ children }: { children: React.ReactNode }) {
  const [vista] = useState(() => elegirVistaVentana(Math.random, vistaForzada()));
  return <ContextoVistaVentana value={vista}>{children}</ContextoVistaVentana>;
}

export function useVistaVentana(): VistaVentana {
  return useContext(ContextoVistaVentana);
}
