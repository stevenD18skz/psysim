import { ChevronDown, ShieldCheck } from 'lucide-react';

import { REGLAS_FIJAS } from '@/lib/ia/reglas';
import { cn } from '@/lib/utils';

/** Lo que garantizan las reglas, dicho para quien no escribe instrucciones para una IA. */
const GARANTIAS = [
  'Siempre actúa como paciente: no rompe el personaje ni dice que es una IA.',
  'Habla como una persona en consulta y cuenta las cosas poco a poco, según cómo lo traten.',
  'Nunca da diagnósticos ni medicamentos, ni describe formas de hacerse daño.',
] as const;

/**
 * Lo que el servidor añade siempre al comportamiento del paciente. Arriba, en lenguaje llano, lo
 * que eso garantiza (así el docente sabe que no tiene que escribirlo); las reglas exactas que
 * recibe la IA quedan plegadas para quien quiera verlas. Siempre visible: es información de
 * seguridad, no un detalle que deba esconderse.
 */
export function ReglasFijas({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="reglas-fijas-titulo"
      className={cn('flex flex-col gap-3 rounded-2xl border bg-muted/40 p-5', className)}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <h3 id="reglas-fijas-titulo" className="text-sm font-semibold">
            PsySim ya se encarga de esto
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Se aplica a todos los pacientes y no se puede quitar. No necesitas escribirlo.
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-sm leading-snug">
        {GARANTIAS.map(garantia => (
          <li key={garantia} className="flex gap-2.5">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-salvia" />
            {garantia}
          </li>
        ))}
      </ul>
      <details className="group/reglas">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-xs font-medium text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          Ver las {REGLAS_FIJAS.length} reglas exactas que recibe la IA
          <ChevronDown
            className="size-3.5 transition-transform group-open/reglas:rotate-180"
            aria-hidden
          />
        </summary>
        <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          {REGLAS_FIJAS.map(regla => (
            <li key={regla} className="flex gap-2.5">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-salvia/70" />
              {regla}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
