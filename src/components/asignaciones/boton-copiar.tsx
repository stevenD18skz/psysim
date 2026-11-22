'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Copia un texto al portapapeles y confirma con un ✓ durante unos segundos. */
export function BotonCopiar({
  texto,
  etiqueta,
  variant = 'outline',
  size = 'default',
  soloIcono = false,
  className,
}: {
  /** Texto a copiar; una función se evalúa al hacer clic (p. ej. para usar `window`). */
  texto: string | (() => string);
  etiqueta: string;
  variant?: 'outline' | 'default' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'icon' | 'icon-sm' | 'icon-lg';
  /** Muestra solo el ícono con un globo de ayuda al pasar el cursor o enfocar. */
  soloIcono?: boolean;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [tooltipAbierto, setTooltipAbierto] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const temporizador = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(temporizador);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(typeof texto === 'function' ? texto() : texto);
      setCopiado(true);
    } catch {
      toast.error('No pudimos copiar. Selecciona el texto y cópialo a mano.');
    }
  };

  const textoEstado = copiado ? 'Copiado' : etiqueta;

  if (soloIcono) {
    const tamanoIcono = size === 'default' ? 'icon' : size;
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip open={copiado || tooltipAbierto} onOpenChange={setTooltipAbierto}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={variant}
              size={tamanoIcono}
              onClick={copiar}
              className={className}
            >
              {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
              <span className="sr-only">{textoEstado}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="ring-1 ring-lino/15">
            {textoEstado}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={copiar} className={className}>
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      {textoEstado}
    </Button>
  );
}
