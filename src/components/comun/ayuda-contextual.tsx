'use client';

import { CircleHelp } from 'lucide-react';
import { useState } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AyudaContextualProps {
  /** Nombre accesible del botón de ayuda, p. ej. «Qué significa Por revisar». */
  etiqueta: string;
  /** Explicación breve y directa que aparece en el globo. */
  texto: string;
  className?: string;
}

/**
 * Ícono discreto de ayuda que despliega una explicación al pasar el ratón, al enfocarlo con el
 * teclado o al tocarlo en pantallas táctiles. Guía a quien entra por primera vez sin recargar la
 * vista de quien ya conoce la plataforma.
 */
export function AyudaContextual({ etiqueta, texto, className }: AyudaContextualProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={abierto} onOpenChange={setAbierto}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={etiqueta}
            onClick={evento => {
              evento.preventDefault();
              evento.stopPropagation();
              setAbierto(prev => !prev);
            }}
            className={cn(
              'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid',
              className
            )}
          >
            <CircleHelp className="size-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>{texto}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
