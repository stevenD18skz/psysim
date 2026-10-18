import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { type Pagina } from '@/lib/listas';
import { cn } from '@/lib/utils';

interface PaginacionProps {
  pagina: Pick<Pagina<unknown>, 'pagina' | 'totalPaginas' | 'total' | 'desde' | 'hasta'>;
  /** URL de una página (conserva los filtros). */
  enlace: (pagina: number) => string;
  /** Cómo se llaman los elementos: ['práctica', 'prácticas']. */
  sustantivo: readonly [string, string];
  className?: string;
}

/** Números de página a mostrar: los extremos y los vecinos de la actual, con saltos «…». */
function numerosVisibles(actual: number, total: number): (number | 'salto')[] {
  const numeros = new Set([1, total, actual - 1, actual, actual + 1]);
  const ordenados = [...numeros].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const resultado: (number | 'salto')[] = [];
  ordenados.forEach((n, i) => {
    const anterior = ordenados[i - 1];
    if (anterior !== undefined && n - anterior > 1) resultado.push('salto');
    resultado.push(n);
  });
  return resultado;
}

/**
 * Cuántos elementos hay y en cuál página se está, con enlaces a la anterior, la siguiente y las
 * cercanas. Son enlaces normales: funcionan sin JavaScript y el navegador recuerda la posición.
 */
export function Paginacion({ pagina, enlace, sustantivo, className }: PaginacionProps) {
  const { pagina: actual, totalPaginas, total, desde, hasta } = pagina;
  const nombre = total === 1 ? sustantivo[0] : sustantivo[1];

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between',
        className
      )}
    >
      <p aria-live="polite" className="tabular-nums">
        {total === 0
          ? 'Sin resultados'
          : totalPaginas === 1
            ? `${total} ${nombre}`
            : `${desde}–${hasta} de ${total} ${nombre}`}
      </p>
      {totalPaginas > 1 && (
        <nav aria-label="Páginas" className="flex items-center gap-1">
          <EnlacePagina href={actual > 1 ? enlace(actual - 1) : null} etiqueta="Página anterior">
            <ChevronLeft className="size-4" aria-hidden />
          </EnlacePagina>
          {numerosVisibles(actual, totalPaginas).map((n, i) =>
            n === 'salto' ? (
              <span key={`salto-${i}`} aria-hidden className="px-1">
                …
              </span>
            ) : (
              <EnlacePagina key={n} href={enlace(n)} etiqueta={`Página ${n}`} actual={n === actual}>
                {n}
              </EnlacePagina>
            )
          )}
          <EnlacePagina
            href={actual < totalPaginas ? enlace(actual + 1) : null}
            etiqueta="Página siguiente"
          >
            <ChevronRight className="size-4" aria-hidden />
          </EnlacePagina>
        </nav>
      )}
    </div>
  );
}

function EnlacePagina({
  href,
  etiqueta,
  actual = false,
  children,
}: {
  href: string | null;
  etiqueta: string;
  actual?: boolean;
  children: React.ReactNode;
}) {
  const clases =
    'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden';
  if (!href) {
    return (
      <span aria-disabled className={cn(clases, 'text-muted-foreground/40')}>
        {children}
        <span className="sr-only">{etiqueta} (no hay)</span>
      </span>
    );
  }
  return (
    <Link
      href={href as Route}
      scroll={false}
      aria-label={etiqueta}
      aria-current={actual ? 'page' : undefined}
      className={cn(clases, actual ? 'bg-nogal text-lino' : 'text-foreground hover:bg-muted')}
    >
      {children}
    </Link>
  );
}
