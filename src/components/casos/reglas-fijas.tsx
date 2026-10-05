'use client';

import { ChevronDown, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { REGLAS_FIJAS } from '@/lib/ia/reglas';
import { cn } from '@/lib/utils';

/**
 * Muestra, solo lectura, las reglas que el servidor añade siempre al prompt. Así el docente sabe
 * qué ya está resuelto y no necesita repetirlo en su texto.
 */
export function ReglasFijas({ className }: { className?: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Collapsible
      open={abierto}
      onOpenChange={setAbierto}
      className={cn('rounded-xl border bg-muted/40', className)}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="font-medium">Reglas fijas que siempre se aplican</span>
          <ChevronDown
            className={cn(
              'ml-auto size-4 text-muted-foreground transition-transform',
              abierto && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-3 py-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Se añaden a tu texto automáticamente y no se pueden quitar.
          </p>
          <ul className="flex list-disc flex-col gap-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
            {REGLAS_FIJAS.map(regla => (
              <li key={regla}>{regla}</li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
