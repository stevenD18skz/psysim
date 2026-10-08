import { type EstadoVisible, type TonoEstado } from '@/lib/sesiones/estados';
import { cn } from '@/lib/utils';

const CLASES_TONO: Record<TonoEstado, string> = {
  'en-curso': 'bg-primary/10 text-primary',
  pendiente: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
  listo: 'bg-success/15 text-success',
  neutro: 'bg-secondary text-secondary-foreground',
};

/** Estado de una sesión o de un código como etiqueta de color (con punto animado si está en curso). */
export function InsigniaEstado({
  estado,
  className,
}: {
  estado: EstadoVisible;
  className?: string;
}) {
  return (
    <span
      data-tono={estado.tono}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        CLASES_TONO[estado.tono],
        className
      )}
    >
      {estado.tono === 'en-curso' && (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      )}
      {estado.texto}
    </span>
  );
}
