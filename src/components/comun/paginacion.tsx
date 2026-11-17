import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { type Pagina } from '@/lib/listas';
import { cn } from '@/lib/utils';

interface ResumenPaginacionProps {
  pagina: Pick<Pagina<unknown>, 'pagina' | 'totalPaginas' | 'total' | 'desde' | 'hasta'>;
  /** Cómo se llaman los elementos: ['práctica', 'prácticas']. */
  sustantivo: readonly [string, string];
  className?: string;
}

interface PaginacionProps extends ResumenPaginacionProps {
  /** URL de una página (conserva los filtros). */
  enlace: (pagina: number) => string;
}

interface PaginacionLocalProps extends ResumenPaginacionProps {
  /** Cambia de página en componentes de cliente con filtros locales. */
  onCambiar: (pagina: number) => void;
  /** Oculta el bloque cuando todo cabe en una sola página. */
  soloSiHayVarias?: boolean;
}

const CLASE_BOTON_PAGINA =
  'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden';

function textoResumen(
  pagina: Pick<Pagina<unknown>, 'totalPaginas' | 'total' | 'desde' | 'hasta'>,
  sustantivo: readonly [string, string]
) {
  const nombre = pagina.total === 1 ? sustantivo[0] : sustantivo[1];
  if (pagina.total === 0) return 'Sin resultados';
  if (pagina.totalPaginas === 1) return `${pagina.total} ${nombre}`;
  return `${pagina.desde}–${pagina.hasta} de ${pagina.total} ${nombre}`;
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
  const { pagina: actual, totalPaginas } = pagina;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between',
        className
      )}
    >
      <p aria-live="polite" className="tabular-nums">
        {textoResumen(pagina, sustantivo)}
      </p>
      {totalPaginas > 1 && (
        <nav aria-label="Páginas" className="flex flex-wrap items-center justify-center gap-1">
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

/**
 * Variante de cliente con botones para secciones independientes o con filtros inmediatos (docentes,
 * códigos, biblioteca y grupos) sin recargar la página completa.
 */
export function PaginacionLocal({
  pagina,
  onCambiar,
  sustantivo,
  className,
  soloSiHayVarias = false,
}: PaginacionLocalProps) {
  const { pagina: actual, totalPaginas } = pagina;
  if (soloSiHayVarias && totalPaginas <= 1) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between',
        className
      )}
    >
      <p aria-live="polite" className="tabular-nums">
        {textoResumen(pagina, sustantivo)}
      </p>
      {totalPaginas > 1 && (
        <nav aria-label="Páginas" className="flex flex-wrap items-center justify-center gap-1">
          <BotonPagina
            activo={actual > 1}
            etiqueta="Página anterior"
            onClick={() => onCambiar(actual - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </BotonPagina>
          {numerosVisibles(actual, totalPaginas).map((n, i) =>
            n === 'salto' ? (
              <span key={`salto-${i}`} aria-hidden className="px-1">
                …
              </span>
            ) : (
              <BotonPagina
                key={n}
                activo
                actual={n === actual}
                etiqueta={`Página ${n}`}
                onClick={() => onCambiar(n)}
              >
                {n}
              </BotonPagina>
            )
          )}
          <BotonPagina
            activo={actual < totalPaginas}
            etiqueta="Página siguiente"
            onClick={() => onCambiar(actual + 1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </BotonPagina>
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
  if (!href) {
    return (
      <span aria-disabled className={cn(CLASE_BOTON_PAGINA, 'text-muted-foreground/40')}>
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
      className={cn(
        CLASE_BOTON_PAGINA,
        actual ? 'bg-nogal text-lino' : 'text-foreground hover:bg-muted'
      )}
    >
      {children}
    </Link>
  );
}

function BotonPagina({
  activo,
  actual = false,
  etiqueta,
  onClick,
  children,
}: {
  activo: boolean;
  actual?: boolean;
  etiqueta: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={activo === false}
      aria-label={etiqueta}
      aria-current={actual ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        CLASE_BOTON_PAGINA,
        activo === false
          ? 'text-muted-foreground/40'
          : actual
            ? 'bg-nogal text-lino'
            : 'text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}
