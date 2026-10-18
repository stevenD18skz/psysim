'use client';

import { useSyncExternalStore } from 'react';

/**
 * Un computador para la simulación: algún puntero fino (ratón o trackpad) con hover. No depende
 * del ancho de la ventana: con zoom alto, escala del sistema o la ventana partida, un computador
 * sigue siéndolo (WCAG 1.4.4 y 1.4.10). Los celulares y tabletas táctiles no cumplen.
 */
const CONSULTA = '(any-pointer: fine) and (any-hover: hover)';

/** El estudiante confirmó «Estoy en un computador»: vale para toda la pestaña (de /unirse a /simulacion). */
const CLAVE_FORZADO = 'psysim:computador-confirmado';

/** Una vez detectado (o confirmado), no se revierte: nunca se desmonta una escena ya cargada. */
let confirmado = false;
const oyentes = new Set<() => void>();

function leerForzado(): boolean {
  try {
    return window.sessionStorage.getItem(CLAVE_FORZADO) === '1';
  } catch {
    return false;
  }
}

/** Para un portátil táctil o un equipo mal detectado: el estudiante confirma que está en un computador. */
export function confirmarComputador() {
  confirmado = true;
  try {
    window.sessionStorage.setItem(CLAVE_FORZADO, '1');
  } catch {
    // Sin almacenamiento la confirmación dura lo que dure la página.
  }
  for (const oyente of oyentes) oyente();
}

function suscribir(alCambiar: () => void) {
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener('change', alCambiar);
  oyentes.add(alCambiar);
  return () => {
    consulta.removeEventListener('change', alCambiar);
    oyentes.delete(alCambiar);
  };
}

function leer(): boolean {
  if (!confirmado && (window.matchMedia(CONSULTA).matches || leerForzado())) confirmado = true;
  return confirmado;
}

/**
 * `true` en un computador, `false` en un celular o tableta, y `null` antes de hidratar (en el
 * servidor no se sabe): la interfaz no debe decidir nada irreversible mientras sea `null`.
 */
export function useEsComputador(): boolean | null {
  return useSyncExternalStore<boolean | null>(suscribir, leer, () => null);
}
