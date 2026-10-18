import { type EstadoVisible, type TonoEstado } from '@/lib/sesiones/estados';
import { cn } from '@/lib/utils';

const CLASES_TONO: Record<TonoEstado, string> = {
  'en-curso': 'bg-salvia-suave text-salvia-oscuro',
  pendiente: 'bg-ambar-suave text-ambar',
  listo: 'bg-salvia-oscuro text-lino',
  neutro: 'bg-muted text-muted-foreground',
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
          <span className="absolute inline-flex size-full rounded-full bg-salvia opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-salvia" />
        </span>
      )}
      {estado.texto}
    </span>
  );
}
