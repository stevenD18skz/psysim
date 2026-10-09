'use client';

import { Hourglass } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Aviso un minuto antes de cerrar la sesión por inactividad. Cualquier interacción (mover el
 * ratón, pulsar una tecla) lo descarta; el botón es la salida explícita.
 */
export function AvisoInactividad({ segundosRestantes }: { segundosRestantes: number }) {
  return (
    <div className="absolute inset-0 z-50 flex animate-in items-center justify-center bg-background/70 p-6 backdrop-blur-sm fade-in-0">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-inactividad-titulo"
        aria-describedby="aviso-inactividad-descripcion"
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border bg-card p-8 text-center shadow-2xl"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Hourglass className="size-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h2 id="aviso-inactividad-titulo" className="text-2xl font-semibold tracking-tight">
            ¿Sigues ahí?
          </h2>
          <p id="aviso-inactividad-descripcion" className="text-sm text-muted-foreground">
            Llevas un rato sin interactuar. Si no continúas, la sesión se cerrará en{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {segundosRestantes} s
            </span>{' '}
            y tu docente podrá revisar lo que alcanzaste a conversar.
          </p>
        </div>
        <Button size="lg" autoFocus>
          Sigo aquí
        </Button>
      </section>
    </div>
  );
}
