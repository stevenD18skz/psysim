import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * Logo oficial de la Universidad del Valle (vertical, proporción 439 × 627). El tamaño se fija
 * con la altura (`className`, p. ej. `h-10`); el ancho se ajusta solo.
 * Fuente: Wikimedia Commons, File:Univalle.svg.
 */
export function LogoUnivalle({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/univalle.svg"
      alt="Universidad del Valle"
      width={439}
      height={627}
      // SVG vectorial: no necesita el optimizador de imágenes.
      unoptimized
      className={cn('h-10 w-auto shrink-0', className)}
    />
  );
}
