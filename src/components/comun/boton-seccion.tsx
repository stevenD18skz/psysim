import { cn } from '@/lib/utils';

/**
 * Opción de una pista segmentada («Mis casos / Casos predefinidos»), con su cantidad al lado. Va
 * dentro de `PistaSegmentada`, que desliza el fondo de la opción activa.
 */
export function BotonSeccion({
  activa,
  cantidad,
  onClick,
  children,
}: {
  activa: boolean;
  cantidad: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-[380ms] ease-deslizar focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid',
        activa ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors duration-[380ms] ease-deslizar',
          activa ? 'bg-salvia-suave text-salvia-oscuro' : 'bg-background/70 text-muted-foreground'
        )}
      >
        {cantidad}
      </span>
    </button>
  );
}
