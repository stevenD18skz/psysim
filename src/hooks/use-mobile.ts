import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function suscribir(alCambiar: () => void) {
  const mql = window.matchMedia(CONSULTA);
  mql.addEventListener('change', alCambiar);
  return () => mql.removeEventListener('change', alCambiar);
}

/**
 * `true` en pantallas de menos de 768 px (el menú lateral pasa a ser un panel deslizable).
 * Se lee con `useSyncExternalStore`: sin efectos ni renders en cascada; en el servidor se asume
 * escritorio.
 */
export function useIsMobile() {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false
  );
}
