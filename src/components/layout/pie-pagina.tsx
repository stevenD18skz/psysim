import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { cn } from '@/lib/utils';

/** Pie de página institucional, común al inicio, el login y el panel del docente. */
export function PiePagina({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t bg-card', className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <LogoUnivalle className="h-9" />
          <div className="leading-tight">
            <p className="font-medium text-foreground">Universidad del Valle</p>
            <p className="text-xs">Escuela de Ingeniería de Sistemas y Computación</p>
          </div>
        </div>
        <div className="text-xs sm:text-right">
          <p>
            <span className="font-medium text-foreground">PsySim</span> · Simulador de escenarios
            psicológicos
          </p>
          <p>Trabajo de grado · Cali, Colombia · 2026</p>
        </div>
      </div>
    </footer>
  );
}
