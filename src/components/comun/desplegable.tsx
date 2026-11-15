'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/** Un poco más que la transición de apertura (300 ms): después ya no hay nada que recortar. */
const FIN_DEL_MOVIMIENTO_MS = 320;

interface DesplegableProps extends React.HTMLAttributes<HTMLDivElement> {
  abierto: boolean;
  children: React.ReactNode;
}

/**
 * Región que se abre y se cierra con la altura de su contenido, sin medirla: la rejilla pasa de una
 * fila de `0fr` a `1fr`. Cerrada queda `inert` (fuera del foco y del lector de pantalla), igual que
 * con `hidden`, pero la transición explica de dónde sale el contenido. Abrir dura más que cerrar.
 *
 * Mientras se mueve recorta lo que sobresale; abierta deja ver los anillos de foco del borde. El
 * espacio de separación va dentro del contenido (un `pt-*`), no en el `gap` del padre: cerrada no
 * debe dejar un hueco.
 */
export function Desplegable({ abierto, className, children, ...props }: DesplegableProps) {
  const [moviendose, setMoviendose] = useState(false);
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    setMoviendose(true);
  }

  // Con un temporizador y no con `transitionend`: con «reducir movimiento» no hay transición.
  useEffect(() => {
    if (!moviendose) return;
    const temporizador = setTimeout(() => setMoviendose(false), FIN_DEL_MOVIMIENTO_MS);
    return () => clearTimeout(temporizador);
  }, [moviendose, abierto]);

  return (
    <div
      inert={!abierto}
      data-abierto={abierto ? '' : undefined}
      className={cn(
        'grid transition-[grid-template-rows,opacity] motion-reduce:transition-none',
        abierto
          ? 'grid-rows-[1fr] opacity-100 duration-300 ease-salida'
          : 'grid-rows-[0fr] opacity-0 duration-200 ease-out',
        className
      )}
      {...props}
    >
      <div className={cn('min-h-0', (moviendose || !abierto) && 'overflow-hidden')}>{children}</div>
    </div>
  );
}
