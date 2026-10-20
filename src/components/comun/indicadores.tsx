import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface Indicador {
  /** Se conserva por compatibilidad; la franja no dibuja íconos. */
  icono?: LucideIcon;
  etiqueta: string;
  valor: string | number;
}

/**
 * Cifras clave como una franja de ficha (etiqueta condensada sobre el valor, separadas por
 * filetes), no como tarjetas sueltas: se leen de un vistazo sin competir con el contenido.
 */
export function Indicadores({
  indicadores,
  className,
}: {
  indicadores: readonly Indicador[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:flex sm:divide-x',
        className
      )}
    >
      {indicadores.map(({ etiqueta, valor }, indice) => (
        <div
          key={etiqueta}
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3',
            // En dos columnas, filetes entre celdas.
            indice % 2 === 1 && 'border-l sm:border-l-0',
            indice >= 2 && 'border-t sm:border-t-0'
          )}
        >
          <dt className="truncate text-sm text-muted-foreground ancho-condensado">{etiqueta}</dt>
          <dd className="text-base font-semibold text-pretty tabular-nums">
            {typeof valor === 'number' ? valor.toLocaleString('es-CO') : valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}
