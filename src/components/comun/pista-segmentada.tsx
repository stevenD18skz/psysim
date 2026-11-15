'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/** Lo que marca la opción activa: botones con `aria-pressed`, enlaces con `aria-current`. */
const SELECTOR_ACTIVO = '[aria-pressed="true"], [aria-current="page"], [aria-selected="true"]';

interface Posicion {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

type PistaSegmentadaProps = {
  /** `nav` para pestañas que son enlaces; `div` (con `role="group"`) para botones. */
  elemento?: 'div' | 'nav';
  /** Fondo, sombra y radio del indicador que se desliza bajo la opción activa. */
  claseIndicador: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

/**
 * Pista de un control segmentado: el fondo de la opción activa es una sola pieza que se desliza
 * hasta la nueva opción en lugar de apagarse en una y encenderse en otra. Así se ve de dónde viene
 * y adónde va el cambio.
 *
 * Las opciones conservan su propio estilo activo: es lo que se pinta en el HTML del servidor, antes
 * de que el indicador pueda medirse. Cuando el indicador ya está en su sitio, la pista lleva
 * `data-listo` y una regla de `globals.css` vuelve transparente el fondo de la opción activa.
 */
export function PistaSegmentada({
  elemento: Elemento = 'div',
  claseIndicador,
  className,
  children,
  ...props
}: PistaSegmentadaProps) {
  const pista = useRef<HTMLElement>(null);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  // La primera colocación no se anima: el indicador no debe entrar deslizándose desde la esquina.
  const [animar, setAnimar] = useState(false);

  useLayoutEffect(() => {
    const nodo = pista.current;
    if (!nodo) return;

    const medir = () => {
      const activa = nodo.querySelector<HTMLElement>(SELECTOR_ACTIVO);
      setPosicion(
        activa
          ? {
              x: activa.offsetLeft,
              y: activa.offsetTop,
              ancho: activa.offsetWidth,
              alto: activa.offsetHeight,
            }
          : null
      );
    };

    medir();
    // Un contador que cambia de cifra o una fuente que termina de cargar mueven los bordes.
    // Sin ResizeObserver (navegadores viejos, jsdom) solo se pierde ese ajuste fino.
    const tamano = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    tamano?.observe(nodo);
    for (const hijo of Array.from(nodo.children)) tamano?.observe(hijo);
    const cambios = new MutationObserver(medir);
    cambios.observe(nodo, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-pressed', 'aria-current', 'aria-selected'],
    });
    const cuadro = requestAnimationFrame(() => setAnimar(true));

    return () => {
      tamano?.disconnect();
      cambios.disconnect();
      cancelAnimationFrame(cuadro);
    };
  }, []);

  return (
    <Elemento
      ref={pista as React.Ref<HTMLDivElement>}
      data-pista=""
      data-listo={posicion ? '' : undefined}
      className={cn('relative isolate', className)}
      {...props}
    >
      <span
        aria-hidden
        data-indicador=""
        className={cn(
          'pointer-events-none absolute top-0 left-0 -z-10',
          animar &&
            'transition-[translate,width,height,opacity] duration-[380ms] ease-deslizar motion-reduce:transition-none',
          claseIndicador
        )}
        style={{
          translate: posicion ? `${posicion.x}px ${posicion.y}px` : undefined,
          width: posicion?.ancho ?? 0,
          height: posicion?.alto ?? 0,
          opacity: posicion ? 1 : 0,
        }}
      />
      {children}
    </Elemento>
  );
}
