'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const CONSULTA_MOVIMIENTO_REDUCIDO = '(prefers-reduced-motion: reduce)';

/** Entornos sin `matchMedia` (p. ej. jsdom en los tests) se tratan como "sin preferencia". */
const haySoporte = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function suscribir(avisar: () => void) {
  if (!haySoporte()) return () => {};
  const consulta = window.matchMedia(CONSULTA_MOVIMIENTO_REDUCIDO);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
}

/** `true` si el sistema pide reducir el movimiento. En el servidor se asume que no. */
export function useMovimientoReducido() {
  return useSyncExternalStore(
    suscribir,
    () => haySoporte() && window.matchMedia(CONSULTA_MOVIMIENTO_REDUCIDO).matches,
    () => false
  );
}

/**
 * Índice que avanza solo cada `intervaloMs` para rotar entre `total` elementos. Se detiene
 * mientras `pausado` sea verdadero y no avanza si el usuario prefiere menos movimiento (en ese
 * caso la persona cambia de elemento con los puntos).
 */
export function useRotacion(total: number, intervaloMs: number) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const movimientoReducido = useMovimientoReducido();

  useEffect(() => {
    if (pausado || movimientoReducido || total < 2) return;
    const temporizador = setInterval(() => setIndice(i => (i + 1) % total), intervaloMs);
    return () => clearInterval(temporizador);
  }, [pausado, movimientoReducido, total, intervaloMs]);

  return { indice, setIndice, setPausado };
}
