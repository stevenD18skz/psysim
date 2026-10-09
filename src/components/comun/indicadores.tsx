import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface Indicador {
  icono: LucideIcon;
  etiqueta: string;
  valor: string | number;
}

/** Fila de tarjetas con cifras clave (estudiantes, sesiones, por revisar…). */
export function Indicadores({
  indicadores,
  className,
}: {
  indicadores: readonly Indicador[];
  className?: string;
}) {
  return (
    <dl className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {indicadores.map(({ icono: Icono, etiqueta, valor }) => (
        <div
          key={etiqueta}
          className="flex flex-col gap-1 rounded-2xl border bg-card p-4 shadow-xs"
        >
          <dt className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Icono className="size-4 text-primary" aria-hidden />
            {etiqueta}
          </dt>
          <dd className="font-heading text-2xl font-semibold tabular-nums">
            {typeof valor === 'number' ? valor.toLocaleString('es-CO') : valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}
