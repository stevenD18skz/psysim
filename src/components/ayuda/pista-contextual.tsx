'use client';

import { Check, Lightbulb, X } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  clavePista,
  leerAyudaVista,
  marcarAyudaVista,
  suscribirAyuda,
} from '@/lib/ayuda/recorridos';
import { cn } from '@/lib/utils';

/**
 * Coach Mark / Feature Tooltip no invasivo: una pequeña píldora con faro en latón junto a una
 * función poco evidente (p. ej. la vista matriz de Revisiones o el modo presencial). Al pulsarla
 * abre un globo en nogal con la explicación concreta y se descarta para siempre con «Entendido».
 */
export function PistaFaro({
  id,
  etiqueta,
  titulo,
  descripcion,
  enMadera = false,
  lado = 'bottom',
  alineacion = 'start',
  className,
}: {
  id: string;
  /** Etiqueta breve de la píldora que invita a descubrir la función (p. ej. «Vista matriz»). */
  etiqueta: string;
  titulo: string;
  descripcion: string;
  /** Usa contraste adaptado cuando la píldora vive sobre la franja oscura de nogal. */
  enMadera?: boolean;
  lado?: 'top' | 'bottom' | 'left' | 'right';
  alineacion?: 'start' | 'center' | 'end';
  className?: string;
}) {
  const clave = clavePista(id);
  const vista = useSyncExternalStore(
    suscribirAyuda,
    () => leerAyudaVista(clave),
    () => true
  );
  const [abierto, setAbierto] = useState(false);

  if (vista) return null;

  const descartar = () => {
    setAbierto(false);
    marcarAyudaVista(clave);
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.75rem] leading-tight font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid',
            enMadera
              ? 'border-laton/40 bg-sidebar-accent text-laton-texto hover:border-laton/70 hover:text-sidebar-foreground focus-visible:outline-laton-claro'
              : 'border-ambar/35 bg-ambar-suave/75 text-ambar hover:bg-ambar-suave focus-visible:outline-ring',
            className
          )}
        >
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span
              className={cn(
                'absolute inline-flex size-full animate-ping rounded-full opacity-60',
                enMadera ? 'bg-laton-claro' : 'bg-ambar'
              )}
            />
            <span
              className={cn(
                'relative inline-flex size-2 rounded-full',
                enMadera ? 'bg-laton-texto' : 'bg-ambar'
              )}
            />
          </span>
          {etiqueta}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={lado}
        align={alineacion}
        sideOffset={8}
        className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-laton/35 bg-nogal p-4 text-sidebar-foreground shadow-[0_20px_44px_-14px_rgb(29_20_14/0.55)] ring-0"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-laton-texto">
            <Lightbulb className="size-3.5 shrink-0" aria-hidden />
            Atajo útil
          </span>
          <button
            type="button"
            onClick={descartar}
            aria-label="Cerrar pista"
            className="flex size-7 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-sm leading-snug font-bold text-sidebar-foreground">
            {titulo}
          </p>
          <p className="text-xs leading-relaxed text-sidebar-muted">{descripcion}</p>
        </div>
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={descartar}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-lino px-3 text-xs font-semibold text-nogal transition-colors hover:bg-lino/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid"
          >
            <Check className="size-3.5" aria-hidden />
            Entendido
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
