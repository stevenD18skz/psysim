import type { ComponentType, ReactNode } from 'react';

import { SOMBRA_SOBRE_NOGAL } from '@/components/comun/encabezado-pagina';
import { cn } from '@/lib/utils';

export type IconoEstadoVacio = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
export type TonoEstadoVacio = 'salvia' | 'ambar' | 'neutro';

export interface PasoEstadoVacio {
  icono: IconoEstadoVacio;
  titulo: string;
  texto: ReactNode;
}

const CLASE_TONO_ICONO: Record<TonoEstadoVacio, string> = {
  salvia: 'bg-salvia-suave text-salvia-oscuro',
  ambar: 'bg-ambar-suave text-ambar',
  neutro: 'bg-muted text-muted-foreground',
};

export interface EstadoVacioProps {
  icono: IconoEstadoVacio;
  titulo: string;
  descripcion?: ReactNode;
  tono?: TonoEstadoVacio;
  /**
   * - `bloque`: sección o tarjeta independiente con borde discontinuo (primer uso o vista vacía).
   * - `compacto`: franja horizontal dentro de una tarjeta ya enmarcada (p. ej. riel de inicio).
   * - `inline`: contenido centrado sin marco exterior (p. ej. fila vacía dentro de una tabla).
   */
  variante?: 'bloque' | 'compacto' | 'inline';
  /** Agrega la sombra de apoyo sobre el hero de nogal (solo en `variante="bloque"`). */
  elevado?: boolean;
  /** Omite el borde superior discontinuo en `variante="compacto"`. */
  sinBordeSuperior?: boolean;
  accion?: ReactNode;
  /** Hasta 3 pasos breves al pie del bloque para guiar un primer uso. */
  pasos?: readonly PasoEstadoVacio[];
  className?: string;
}

/**
 * Estado vacío unificado de PsySim («Nogal y salvia»): explica siempre por qué no hay registros
 * todavía y, cuando corresponde, ofrece el siguiente paso accionable sin recurrir a textos planos.
 */
export function EstadoVacio({
  icono: Icono,
  titulo,
  descripcion,
  tono = 'neutro',
  variante = 'bloque',
  elevado = false,
  sinBordeSuperior = false,
  accion,
  pasos,
  className,
}: EstadoVacioProps) {
  if (variante === 'compacto') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 bg-muted/20 px-5 py-4',
          !sinBordeSuperior && 'border-t border-dashed border-border/80',
          className
        )}
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
            CLASE_TONO_ICONO[tono]
          )}
        >
          <Icono className="size-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm leading-snug font-semibold text-foreground">{titulo}</p>
          {descripcion && (
            <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
              {descripcion}
            </p>
          )}
          {accion && <div className="pt-1.5">{accion}</div>}
        </div>
      </div>
    );
  }

  if (variante === 'inline') {
    return (
      <div
        className={cn(
          'mx-auto flex max-w-md flex-col items-center gap-2.5 px-4 py-6 text-center',
          className
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex size-10 items-center justify-center rounded-xl',
            CLASE_TONO_ICONO[tono]
          )}
        >
          <Icono className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{titulo}</p>
          {descripcion && (
            <p className="text-xs leading-relaxed text-pretty text-muted-foreground sm:text-sm">
              {descripcion}
            </p>
          )}
        </div>
        {accion && <div className="pt-1">{accion}</div>}
      </div>
    );
  }

  if (pasos && pasos.length > 0) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-dashed border-border bg-card',
          elevado && SOMBRA_SOBRE_NOGAL,
          className
        )}
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <span
            aria-hidden
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-2xl',
              CLASE_TONO_ICONO[tono]
            )}
          >
            <Icono className="size-7" />
          </span>
          <div className="flex flex-1 flex-col gap-1.5">
            <h2 className="text-xl font-bold tracking-[-0.015em] text-foreground">{titulo}</h2>
            {descripcion && (
              <p className="max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
                {descripcion}
              </p>
            )}
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
        <ul className="grid gap-4 border-t border-dashed border-border/80 bg-muted/35 p-6 text-sm sm:grid-cols-3 sm:px-8">
          {pasos.map(({ icono: IconoPaso, titulo: tituloPaso, texto }) => (
            <li key={tituloPaso} className="flex items-start gap-3">
              <IconoPaso className="mt-0.5 size-4 shrink-0 text-salvia-oscuro" aria-hidden />
              <p className="leading-snug">
                <span className="font-semibold text-foreground">{tituloPaso}. </span>
                <span className="text-muted-foreground">{texto}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-card/80 px-6 py-10 text-center',
        elevado && `bg-card ${SOMBRA_SOBRE_NOGAL}`,
        className
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-3.5">
        <span
          aria-hidden
          className={cn(
            'flex size-12 items-center justify-center rounded-2xl',
            CLASE_TONO_ICONO[tono]
          )}
        >
          <Icono className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-bold tracking-[-0.015em] text-foreground sm:text-lg">
            {titulo}
          </p>
          {descripcion && (
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {descripcion}
            </p>
          )}
        </div>
        {accion && <div className="pt-1">{accion}</div>}
      </div>
    </div>
  );
}
