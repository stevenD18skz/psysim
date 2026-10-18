import { cn } from '@/lib/utils';

/**
 * Símbolo de PsySim: el vano de la puerta del consultorio (latón) con la butaca (salvia) y la
 * paciente (terracota). Es el mismo arco que enmarca el consultorio en la landing y en las
 * instrucciones del caso.
 */
export function SimboloPsySim({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('shrink-0', className)}>
      <path
        d="M7 29.5V14a9 9 0 0 1 18 0v15.5"
        fill="none"
        stroke="var(--laton)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <rect x="10.5" y="20.5" width="11" height="7" rx="2.4" fill="var(--salvia)" />
      <circle cx="16" cy="16.6" r="2.7" fill="var(--terracota)" />
    </svg>
  );
}

/**
 * Marca de PsySim: símbolo + nombre en Archivo expandido. El color del nombre se hereda
 * (`currentColor`), así sirve sobre el nogal y sobre el lino.
 */
export function MarcaPsySim({
  className,
  soloSimbolo = false,
}: {
  className?: string;
  soloSimbolo?: boolean;
}) {
  if (soloSimbolo) return <SimboloPsySim className={className} />;
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <SimboloPsySim className="h-full w-auto" />
      <span className="text-[1.35rem] leading-none font-bold tracking-[-0.02em] ancho-expandido">
        PsySim
      </span>
    </span>
  );
}
