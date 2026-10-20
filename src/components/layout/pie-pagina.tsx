import Link from 'next/link';

import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { cn } from '@/lib/utils';

/**
 * Pie de página común: PsySim como marca y la Universidad del Valle como respaldo institucional
 * (su sello conserva sus colores, el único lugar donde aparece el rojo de la universidad).
 */
export function PiePagina({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t bg-card print:hidden', className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <MarcaPsySim className="h-7 text-foreground" />
          <span aria-hidden className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <LogoUnivalle className="h-8" />
            <p className="text-xs leading-tight">
              Un proyecto de grado de la
              <br />
              <span className="font-medium text-foreground">Universidad del Valle</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs sm:items-end">
          <Link
            href="/privacidad"
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Privacidad y tratamiento de datos
          </Link>
          <p>Escuela de Ingeniería de Sistemas y Computación · Cali, 2026</p>
        </div>
      </div>
    </footer>
  );
}
