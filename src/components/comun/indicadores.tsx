import { ArrowUpRight } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { type ComponentType } from 'react';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { cn } from '@/lib/utils';

export type IconoIndicador = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export interface Indicador {
  /** Ícono descriptivo que acompaña la métrica en la esquina superior derecha. */
  icono?: IconoIndicador;
  etiqueta: string;
  valor: string | number;
  /** Ruta opcional si el valor principal enlaza a una ficha o detalle relacionado. */
  enlace?: Route;
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
    valor: 'text-ambar',
    punto: 'bg-ambar',
    cajaIcono: 'bg-ambar-suave text-ambar',
  },
  activo: {
    valor: 'text-salvia-oscuro',
    punto: 'bg-salvia',
    cajaIcono: 'bg-salvia-suave text-salvia-oscuro',
  },
} as const;

function claseTamanoValor(valor: string | number) {
  if (typeof valor === 'number' || valor.length <= 7) return 'text-[1.75rem] sm:text-[2rem]';
  if (valor.length <= 15) return 'text-[1.25rem] sm:text-[1.45rem]';
  return 'text-lg leading-snug sm:text-[1.1875rem]';
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
  sinMarco = false,
  className,
}: {
  indicadores: readonly Indicador[];
  disposicion?: 'franja' | 'rejilla';
  /** Omite el borde y el radio exteriores cuando el bloque vive dentro de una tarjeta mayor. */
  sinMarco?: boolean;
  className?: string;
}) {
  const rejilla = disposicion === 'rejilla';
  const filaAmplia = indicadores.length >= 5;
  const totalImpar = indicadores.length % 2 === 1;

  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden bg-card',
        sinMarco === false && 'rounded-2xl border',
        rejilla
          ? 'gap-px bg-border sm:grid-cols-3'
          : filaAmplia
            ? 'lg:flex lg:divide-x'
            : 'md:flex md:divide-x',
        className
      )}
    >
      {indicadores.map(
        ({ icono: Icono, etiqueta, valor, enlace, detalle, ayuda, tono }, indice) => {
          const tamano = claseTamanoValor(valor);
          const ultimaImpar = totalImpar && indice === indicadores.length - 1;
          const esEnVivo = Icono === IndicadorEnVivo;
          const contenido = typeof valor === 'number' ? valor.toLocaleString('es-CO') : valor;

          return (
            <div
              key={etiqueta}
              className={cn(
                'flex min-w-0 flex-1 flex-col gap-1 px-4 py-4 transition-colors sm:px-5 sm:py-5',
                rejilla
                  ? [
                      // Opaco: un fondo translúcido dejaría ver el color del filete detrás.
                      'bg-card hover:bg-[color-mix(in_oklch,var(--card),var(--muted)_35%)]',
                      ultimaImpar && 'col-span-2 sm:col-span-1',
                    ]
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
                  {tono && !esEnVivo && (
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
                    {esEnVivo ? (
                      <IndicadorEnVivo animado={tono === 'activo'} className="size-3.5 sm:size-4" />
                    ) : (
                      <Icono className="size-3.5 sm:size-4" />
                    )}
                  </span>
                )}
              </dt>
              <dd
                className={cn(
                  'mt-1 leading-tight font-bold tracking-[-0.025em] text-pretty ancho-semiexpandido tabular-nums',
                  tamano,
                  tono && CLASE_TONO[tono].valor
                )}
              >
                {enlace ? (
                  <Link
                    href={enlace}
                    className="group/enlace inline-flex items-baseline gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                  >
                    <span>{contenido}</span>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-salida group-hover/enlace:translate-x-0.5 group-hover/enlace:-translate-y-0.5 group-hover/enlace:text-foreground"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  contenido
                )}
              </dd>
              {detalle && (
                <dd className="text-sm leading-snug text-muted-foreground tabular-nums">
                  {detalle}
                </dd>
              )}
            </div>
          );
        }
      )}
    </dl>
  );
}
