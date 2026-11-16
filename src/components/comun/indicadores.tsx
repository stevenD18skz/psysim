import { type LucideIcon } from 'lucide-react';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { cn } from '@/lib/utils';

export interface Indicador {
  /** Ícono descriptivo que acompaña la métrica en la esquina superior derecha. */
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
  atencion: {
    valor: 'text-terracota',
    punto: 'bg-terracota',
    cajaIcono: 'bg-terracota-suave text-terracota',
  },
  activo: {
    valor: 'text-salvia-oscuro',
    punto: 'bg-salvia',
    cajaIcono: 'bg-salvia-suave text-salvia-oscuro',
  },
} as const;

function esDatoLargo(valor: string | number) {
  return typeof valor === 'string' && valor.length > 10;
}

/**
 * Cifras clave como una franja de ficha (etiqueta e ícono sobre el valor, separadas por
 * filetes), no como tarjetas sueltas: se leen de un vistazo sin competir con el contenido.
 *
 * `franja` coloca hasta 4 métricas en fila desde `md` (y 5 desde `lg`); `rejilla` las reparte en
 * tres columnas para una columna estrecha (seis cifras quedan en dos filas).
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
  const filaAmplia = indicadores.length >= 5;
  const totalImpar = indicadores.length % 2 === 1;

  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-2xl border bg-card',
        rejilla
          ? 'gap-px bg-border sm:grid-cols-3'
          : filaAmplia
            ? 'lg:flex lg:divide-x'
            : 'md:flex md:divide-x',
        className
      )}
    >
      {indicadores.map(({ icono: Icono, etiqueta, valor, detalle, ayuda, tono }, indice) => {
        const largo = esDatoLargo(valor);
        const ultimaImpar = rejilla === false && totalImpar && indice === indicadores.length - 1;

        return (
          <div
            key={etiqueta}
            className={cn(
              'flex min-w-0 flex-1 flex-col gap-1 px-4 py-4 transition-colors sm:px-5 sm:py-5',
              rejilla
                ? // Opaco: un fondo translúcido dejaría ver el color del filete detrás.
                  'bg-card hover:bg-[color-mix(in_oklch,var(--card),var(--muted)_35%)]'
                : [
                    'hover:bg-muted/35',
                    ultimaImpar &&
                      (filaAmplia ? 'col-span-2 lg:col-span-1' : 'col-span-2 md:col-span-1'),
                    // En dos columnas, filetes entre celdas.
                    indice % 2 === 1 &&
                      (filaAmplia ? 'border-l lg:border-l-0' : 'border-l md:border-l-0'),
                    indice >= 2 &&
                      (filaAmplia ? 'border-t lg:border-t-0' : 'border-t md:border-t-0'),
                  ]
            )}
          >
            <dt className="flex items-start justify-between gap-2 text-sm font-medium text-muted-foreground sm:text-[0.9375rem]">
              <span className="flex min-w-0 items-center gap-1.5 pt-0.5 leading-snug">
                {tono && (
                  <span
                    aria-hidden
                    className={cn('size-1.5 shrink-0 rounded-full', CLASE_TONO[tono].punto)}
                  />
                )}
                <span>{etiqueta}</span>
                {ayuda && <AyudaContextual etiqueta={`Qué es ${etiqueta}`} texto={ayuda} />}
              </span>
              {Icono && (
                <span
                  aria-hidden
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8',
                    tono ? CLASE_TONO[tono].cajaIcono : 'bg-muted/75 text-muted-foreground'
                  )}
                >
                  <Icono className="size-3.5 sm:size-4" />
                </span>
              )}
            </dt>
            <dd
              className={cn(
                'mt-1 leading-tight font-bold tracking-[-0.025em] text-pretty ancho-semiexpandido tabular-nums',
                largo ? 'text-lg sm:text-xl' : 'text-[1.75rem] sm:text-[2rem]',
                tono && CLASE_TONO[tono].valor
              )}
            >
              {typeof valor === 'number' ? valor.toLocaleString('es-CO') : valor}
            </dd>
            {detalle && (
              <dd className="text-sm leading-snug text-muted-foreground tabular-nums">{detalle}</dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
