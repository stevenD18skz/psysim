import { type LucideIcon } from 'lucide-react';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { cn } from '@/lib/utils';

export interface Indicador {
  /** Se conserva por compatibilidad; la franja no dibuja íconos. */
  icono?: LucideIcon;
  etiqueta: string;
  valor: string | number;
  /** Contexto breve debajo del valor (p. ej. «5 con cuenta»). */
  detalle?: string;
  /** Explicación en un globo de ayuda para orientar al docente o al administrador. */
  ayuda?: string;
}

/**
 * Cifras clave como una franja de ficha (etiqueta condensada sobre el valor, separadas por
 * filetes), no como tarjetas sueltas: se leen de un vistazo sin competir con el contenido.
 *
 * `franja` pone todas en una fila desde 640 px. `rejilla` las reparte en tres columnas para una
 * columna estrecha (seis cifras quedan en dos filas); los filetes salen del hueco de 1 px entre
 * celdas, así que cuadran con cualquier cantidad de filas.
 */
export function Indicadores({
  indicadores,
  disposicion = 'franja',
  className,
}: {
  indicadores: readonly Indicador[];
  disposicion?: 'franja' | 'rejilla';
  className?: string;
}) {
  const rejilla = disposicion === 'rejilla';
  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-xl border bg-card',
        rejilla ? 'gap-px bg-border sm:grid-cols-3' : 'sm:flex sm:divide-x',
        className
      )}
    >
      {indicadores.map(({ etiqueta, valor, detalle, ayuda }, indice) => (
        <div
          key={etiqueta}
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3.5 transition-colors',
            rejilla
              ? // Opaco: un fondo translúcido dejaría ver el color del filete detrás.
                'bg-card hover:bg-[color-mix(in_oklch,var(--card),var(--muted)_35%)]'
              : [
                  'hover:bg-muted/35',
                  // En dos columnas, filetes entre celdas.
                  indice % 2 === 1 && 'border-l sm:border-l-0',
                  indice >= 2 && 'border-t sm:border-t-0',
                ]
          )}
        >
          <dt className="flex items-center gap-1 text-sm text-muted-foreground ancho-condensado">
            <span className="truncate">{etiqueta}</span>
            {ayuda && <AyudaContextual etiqueta={`Qué es ${etiqueta}`} texto={ayuda} />}
          </dt>
          <dd className="text-lg font-bold tracking-[-0.01em] text-pretty tabular-nums">
            {typeof valor === 'number' ? valor.toLocaleString('es-CO') : valor}
          </dd>
          {detalle && (
            <dd className="truncate text-xs text-muted-foreground tabular-nums">{detalle}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
