'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Children, useState } from 'react';

import { cn } from '@/lib/utils';

interface ListaPaginadaProps {
  /** Elementos `<li>` ya renderizados por el servidor para conservar formato y fechas consistentes. */
  children: React.ReactNode;
  porPagina: number;
  sustantivo: readonly [string, string];
  /** Nombre legible del bloque para diferenciar los controles de teclado y lectores de pantalla. */
  nombreBloque: string;
  claseLista?: string;
}

/**
 * Mantiene los bloques de la bandeja en una altura predecible aunque acumulen decenas de filas,
 * paginando en memoria de forma inmediata sin perder acceso a ningún elemento.
 */
export function ListaPaginada({
  children,
  porPagina,
  sustantivo,
  nombreBloque,
  claseLista,
}: ListaPaginadaProps) {
  const elementos = Children.toArray(children);
  const total = elementos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const [pagina, setPagina] = useState(1);

  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaSegura - 1) * porPagina;
  const visibles = elementos.slice(inicio, inicio + porPagina);
  const desde = total === 0 ? 0 : inicio + 1;
  const hasta = inicio + visibles.length;
  const unidad = total === 1 ? sustantivo[0] : sustantivo[1];

  return (
    <>
      <ul className={claseLista}>{visibles}</ul>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-2 border-t bg-muted/25 px-4 py-2 text-xs text-muted-foreground">
          <span aria-live="polite" className="tabular-nums">
            {desde}–{hasta} de {total} {unidad}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={paginaSegura <= 1}
              aria-label={`Anterior en ${nombreBloque}`}
              onClick={() => setPagina(p => Math.max(1, Math.min(p, totalPaginas) - 1))}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-lg border border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid sm:size-8',
                paginaSegura <= 1
                  ? 'cursor-not-allowed text-muted-foreground/40'
                  : 'cursor-pointer text-foreground hover:border-border hover:bg-card'
              )}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="min-w-10 text-center font-medium text-foreground tabular-nums">
              {paginaSegura} / {totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginaSegura >= totalPaginas}
              aria-label={`Siguiente en ${nombreBloque}`}
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-lg border border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid sm:size-8',
                paginaSegura >= totalPaginas
                  ? 'cursor-not-allowed text-muted-foreground/40'
                  : 'cursor-pointer text-foreground hover:border-border hover:bg-card'
              )}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
