'use client';

import { Hourglass } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Aviso un minuto antes de cerrar la práctica por inactividad. Cualquier interacción (mover el
 * ratón, pulsar una tecla) lo descarta; el botón es la salida explícita. Va por encima de todo lo
 * demás de la simulación (z-60).
 */
export function AvisoInactividad({
  segundosRestantes,
  comenzada,
}: {
  segundosRestantes: number;
  comenzada: boolean;
}) {
  // El aviso toma el foco (p. ej. desde el campo de la conversación) y al cerrarse lo devuelve.
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previo = document.activeElement;
    boton.current?.focus();
    return () => {
      if (previo instanceof HTMLElement && previo.isConnected) previo.focus();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-nogal/55 p-6 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-inactividad-titulo"
        aria-describedby="aviso-inactividad-descripcion"
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center shadow-[0_24px_64px_-16px_rgb(29_20_14/0.5)]"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-ambar-suave text-ambar">
          <Hourglass className="size-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h2 id="aviso-inactividad-titulo" className="text-2xl font-bold tracking-[-0.02em]">
            ¿Sigues ahí?
          </h2>
          <p id="aviso-inactividad-descripcion" className="text-muted-foreground">
            Si no hay actividad, la práctica se cierra en{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {segundosRestantes} s
            </span>
            {comenzada
              ? '. Tu docente revisará lo que alcanzaste a conversar.'
              : ' y el código dejará de servir.'}
          </p>
        </div>
        <Button ref={boton} variant="accion" size="lg">
          Sigo aquí
        </Button>
      </section>
    </div>
  );
}
