import { cn } from '@/lib/utils';

interface IndicadorEnVivoProps {
  /** Activa el pulso suave entre los arcos exteriores cuando el navegador permite animación. */
  animado?: boolean;
  className?: string;
}

/**
 * Ícono de transmisión en vivo tipo `((o))` usado en todo PsySim para señalar prácticas abiertas o
 * en curso. La animación vive solo bajo `prefers-reduced-motion: no-preference`.
 */
export function IndicadorEnVivo({ animado = true, className }: IndicadorEnVivoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-4 shrink-0', className)}
    >
      <path
        d="M4.9 19.1a10 10 0 0 1 0-14.2"
        className={animado ? 'onda-en-vivo-exterior' : undefined}
      />
      <path
        d="M7.8 16.2a6 6 0 0 1 0-8.4"
        className={animado ? 'onda-en-vivo-interior' : undefined}
      />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path
        d="M16.2 7.8a6 6 0 0 1 0 8.4"
        className={animado ? 'onda-en-vivo-interior' : undefined}
      />
      <path
        d="M19.1 4.9a10 10 0 0 1 0 14.2"
        className={animado ? 'onda-en-vivo-exterior' : undefined}
      />
    </svg>
  );
}
