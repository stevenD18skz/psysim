import { ArrowRight, ClipboardList, type LucideIcon, Users } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EnlaceHero {
  href: Route;
  texto: string;
  contador?: number;
}

/**
 * Capa superior en nogal para los paneles de inicio: forma la franja ancla sobre la que flotan
 * las tarjetas de indicadores y resumen.
 */
export function MarcoHeroInicio({
  conBordeLateral = true,
  compacto = false,
  className,
  children,
}: {
  conBordeLateral?: boolean;
  compacto?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative z-0 border-t border-sidebar-border vetas-nogal text-sidebar-foreground',
        conBordeLateral && 'md:border-t-0 md:border-l',
        className
      )}
    >
      <div
        className={cn(
          '@container mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pt-6 sm:px-6',
          compacto ? 'pb-14 sm:pt-7 sm:pb-20' : 'pb-16 sm:pt-8 sm:pb-24'
        )}
      >
        {children}
      </div>
      <div aria-hidden className="h-px w-full bg-laton/25" />
    </div>
  );
}

/**
 * Cabecera común del saludo y acciones rápidas sobre la franja de nogal (docente y Administrador).
 */
export function EncabezadoHeroTrabajo({
  textoSaludo,
  primerNombre,
  resumen,
  etiquetaEstudiantes,
}: {
  textoSaludo: string;
  primerNombre: string;
  resumen: string;
  etiquetaEstudiantes: string;
}) {
  return (
    <header className="flex flex-col gap-5 @2xl:flex-row @2xl:items-end @2xl:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] text-sidebar-foreground sm:text-[2.5rem]">
          {textoSaludo}, {primerNombre}
        </h1>
        <p className="max-w-2xl text-base text-sidebar-muted sm:text-lg">{resumen}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <Button
          asChild
          variant="outline"
          size="lg"
          className="border-lino/35 bg-transparent text-sidebar-foreground shadow-none hover:border-lino/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Link href="/estudiantes">
            <Users aria-hidden />
            {etiquetaEstudiantes}
          </Link>
        </Button>
        <Button asChild variant="accion" size="lg">
          <Link href="/configuracion">
            <ClipboardList aria-hidden />
            Asignar práctica
          </Link>
        </Button>
      </div>
    </header>
  );
}

/**
 * Subbarra inferior del encabezado de nogal con el título del área, accesos directos y una píldora
 * de estado a la derecha.
 */
export function BarraSubHero({
  tituloId,
  titulo,
  icono: Icono,
  ariaNavegacion,
  enlaces,
  estadoDerecha,
}: {
  tituloId: string;
  titulo: string;
  icono: LucideIcon;
  ariaNavegacion: string;
  enlaces: readonly EnlaceHero[];
  estadoDerecha?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
        <div className="flex items-center gap-2">
          <Icono className="size-4.5 shrink-0 text-laton" aria-hidden />
          <h2
            id={tituloId}
            className="text-base font-bold tracking-[-0.015em] text-sidebar-foreground"
          >
            {titulo}
          </h2>
        </div>
        <span aria-hidden className="hidden h-4 w-px bg-sidebar-border sm:block" />
        <nav aria-label={ariaNavegacion} className="flex flex-wrap items-center gap-1.5">
          {enlaces.map(enlace => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="group inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-sidebar-accent/55 px-3 py-1 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-laton-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {enlace.texto}
              {enlace.contador !== undefined && enlace.contador > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ambar-suave px-1.5 text-[0.75rem] leading-4 font-semibold text-ambar tabular-nums">
                  {enlace.contador}
                </span>
              )}
              <ArrowRight
                className="size-3.5 text-laton-texto transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </nav>
      </div>

      {estadoDerecha}
    </div>
  );
}
