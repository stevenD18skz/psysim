import { ShieldCheck } from 'lucide-react';

import { REGLAS_FIJAS } from '@/lib/ia/reglas';
import { cn } from '@/lib/utils';

/**
 * Muestra, solo lectura, las reglas que el servidor añade siempre al prompt. Así el docente sabe
 * qué ya está resuelto y no necesita repetirlo en su texto. Siempre visible: es información de
 * seguridad, no un detalle que deba esconderse.
 */
export function ReglasFijas({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="reglas-fijas-titulo"
      className={cn('flex flex-col gap-3 rounded-2xl border bg-muted/40 p-5', className)}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <h3 id="reglas-fijas-titulo" className="text-sm font-semibold">
            Reglas fijas que siempre se aplican
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Se añaden a tu texto automáticamente y no se pueden quitar.
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
        {REGLAS_FIJAS.map(regla => (
          <li key={regla} className="flex gap-2.5">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary/60" />
            {regla}
          </li>
        ))}
      </ul>
    </section>
  );
}
