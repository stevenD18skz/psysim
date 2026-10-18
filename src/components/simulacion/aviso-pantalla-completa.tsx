'use client';

import { Maximize } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Segundos que el aviso permanece a la vista. */
const SEGUNDOS_VISIBLE = 10;

/** `true` si la ventana ya ocupa toda la pantalla (F11 o pantalla completa de la página). */
function enPantallaCompleta(): boolean {
  return (
    Boolean(document.fullscreenElement) ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.innerHeight >= screen.height - 1
  );
}

/**
 * Sugerencia, arriba y al centro, de pasar a pantalla completa con F11 para una mejor inmersión.
 * Aparece al iniciar la simulación, se va sola a los 10 s y no sale si ya está en pantalla
 * completa (ni vuelve a aparecer si el estudiante la activa).
 */
export function AvisoPantallaCompleta() {
  const [visible, setVisible] = useState(() => !enPantallaCompleta());

  useEffect(() => {
    if (!visible) return;
    const temporizador = window.setTimeout(() => setVisible(false), SEGUNDOS_VISIBLE * 1000);
    const alCambiarTamano = () => {
      if (enPantallaCompleta()) setVisible(false);
    };
    window.addEventListener('resize', alCambiarTamano);
    return () => {
      window.clearTimeout(temporizador);
      window.removeEventListener('resize', alCambiarTamano);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <p
      role="status"
      className="pointer-events-none absolute top-4 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
    >
      <Maximize className="size-4 shrink-0" aria-hidden />
      <span>
        Presiona <kbd className="rounded bg-white/20 px-1.5 font-mono text-xs">F11</kbd> para una
        mejor inmersión
      </span>
    </p>
  );
}
