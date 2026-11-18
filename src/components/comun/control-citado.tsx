import { cn } from '@/lib/utils';

/**
 * Nombre de un botón o enlace citado dentro de un texto («pulsa Guardar como mi caso»). En lugar de
 * comillas, se dibuja como una versión en miniatura del control: quien lee reconoce lo que tiene que
 * buscar en la pantalla. Es texto corrido para el lector de pantalla, sin rol propio.
 */
export function ControlCitado({
  children,
  icono,
  className,
}: {
  children: React.ReactNode;
  /** Ícono del control real, si lo tiene (14 px, decorativo). */
  icono?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'mx-px inline-flex items-center gap-1 rounded-md border border-input/45 bg-card px-1.5 align-baseline font-medium whitespace-nowrap text-foreground shadow-[0_1px_0_rgb(58_36_24/0.08)] [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:self-center',
        className
      )}
    >
      {icono}
      {children}
    </span>
  );
}
