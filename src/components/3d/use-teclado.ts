'use client';

import { type RefObject, useEffect, useRef } from 'react';

/**
 * Acciones de movimiento y las teclas (KeyboardEvent.code) que las activan. Las flechas laterales
 * giran la vista en lugar de desplazar: sin ellas, quien no usa ratón podía avanzar pero no
 * orientarse, y si el paciente no quedaba en su camino no llegaba a conversar (WCAG 2.1.1).
 */
export const MAPA_TECLAS = {
  adelante: ['KeyW', 'ArrowUp'],
  atras: ['KeyS', 'ArrowDown'],
  izquierda: ['KeyA'],
  derecha: ['KeyD'],
  girarIzquierda: ['ArrowLeft'],
  girarDerecha: ['ArrowRight'],
} as const;

export type AccionMovimiento = keyof typeof MAPA_TECLAS;

const TECLAS_MOVIMIENTO = new Set<string>(Object.values(MAPA_TECLAS).flat());

/** ¿El evento viene de un campo de texto? Entonces no debe mover la cámara (p. ej. el chat). */
export function esCampoEditable(objetivo: EventTarget | null): boolean {
  if (!(objetivo instanceof HTMLElement)) return false;
  return (
    objetivo.isContentEditable ||
    objetivo instanceof HTMLInputElement ||
    objetivo instanceof HTMLTextAreaElement ||
    objetivo instanceof HTMLSelectElement
  );
}

/**
 * Registra las teclas de movimiento pulsadas en un `Set` mutable. Se lee desde `useFrame`
 * sin provocar re-renderizados. Ignora la escritura en campos de texto y las combinaciones con
 * Ctrl/Cmd/Alt, y suelta todas las teclas si la ventana pierde el foco.
 */
export function useTeclado(habilitado: boolean): RefObject<Set<string>> {
  const pulsadas = useRef(new Set<string>());

  useEffect(() => {
    const teclas = pulsadas.current;
    if (!habilitado) {
      teclas.clear();
      return;
    }

    const alPulsar = (evento: KeyboardEvent) => {
      if (!TECLAS_MOVIMIENTO.has(evento.code)) return;
      if (
        esCampoEditable(evento.target) ||
        evento.ctrlKey ||
        evento.metaKey ||
        evento.altKey ||
        (evento.target instanceof Element &&
          evento.target.closest('[role="dialog"], [role="alertdialog"]'))
      ) {
        return;
      }
      evento.preventDefault();
      teclas.add(evento.code);
    };
    const alSoltar = (evento: KeyboardEvent) => teclas.delete(evento.code);
    const soltarTodo = () => teclas.clear();

    window.addEventListener('keydown', alPulsar);
    window.addEventListener('keyup', alSoltar);
    window.addEventListener('blur', soltarTodo);
    document.addEventListener('visibilitychange', soltarTodo);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      window.removeEventListener('keyup', alSoltar);
      window.removeEventListener('blur', soltarTodo);
      document.removeEventListener('visibilitychange', soltarTodo);
      teclas.clear();
    };
  }, [habilitado]);

  return pulsadas;
}

/** -1, 0 o 1 según las teclas pulsadas para un eje. */
export function eje(pulsadas: Set<string>, positiva: AccionMovimiento, negativa: AccionMovimiento) {
  const activa = (accion: AccionMovimiento) =>
    MAPA_TECLAS[accion].some(codigo => pulsadas.has(codigo));
  return (activa(positiva) ? 1 : 0) - (activa(negativa) ? 1 : 0);
}
