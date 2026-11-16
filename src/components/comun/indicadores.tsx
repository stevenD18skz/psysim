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
  /**
   * Resalta la cifra cuando pide atención («atencion», p. ej. prácticas por revisar) o cuando algo
   * está ocurriendo («activo», p. ej. practicando ahora). Sin tono, la cifra es neutra.
   */
  tono?: 'atencion' | 'activo';
}

const CLASE_TONO = {
  atencion: { valor: 'text-terracota', punto: 'bg-terracota' },
  activo: { valor: 'text-salvia-oscuro', punto: 'bg-salvia' },
} as const;

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
      {indicadores.map(({ etiqueta, valor, detalle, ayuda, tono }, indice) => (
        <div
          key={etiqueta}
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-1 px-5 py-4 transition-colors',
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
          <dt className="flex items-center gap-1.5 text-sm text-muted-foreground ancho-condensado">
            {tono && (
              <span
                aria-hidden
                className={cn('size-1.5 shrink-0 rounded-full', CLASE_TONO[tono].punto)}
              />
            )}
            <span className="truncate">{etiqueta}</span>
            {ayuda && <AyudaContextual etiqueta={`Qué es ${etiqueta}`} texto={ayuda} />}
          </dt>
          <dd
            className={cn(
              'text-2xl leading-tight font-bold tracking-[-0.02em] text-pretty ancho-semiexpandido tabular-nums',
              tono && CLASE_TONO[tono].valor
            )}
          >
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
