import { ChevronLeft } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { MarcoHeroInicio } from '@/components/inicio/marco-hero';
import { cn } from '@/lib/utils';

/** Sombra suave de lino flotando sobre madera oscura (reutilizada en tarjetas superpuestas). */
export const SOMBRA_SOBRE_NOGAL = 'shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)] print:shadow-none';

/**
 * Encabezado común de las páginas de trabajo sobre una franja superior de nogal: enlace de
 * regreso opcional, título, descripción breve, acciones a la derecha y subbarra opcional. El
 * título habla solo: no lleva etiquetas encima.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  volver,
  acciones,
  subbarra,
  conBordeLateral = true,
  children,
  className,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  volver?: { href: Route; etiqueta: string };
  acciones?: React.ReactNode;
  /** Fila inferior dentro de la franja (pestañas de vista, resumen de catálogo o accesos). */
  subbarra?: React.ReactNode;
  /** `false` en vistas de estudiante donde la barra superior cubre todo el ancho sin menú lateral. */
  conBordeLateral?: boolean;
  /** Datos bajo el título (código, correo, estado…). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <MarcoHeroInicio
      conBordeLateral={conBordeLateral}
      compacto={Boolean(subbarra) === false}
      className={cn('print:border-0', className)}
    >
      <header className="flex flex-col gap-3">
        {volver && (
          <Link
            href={volver.href}
            className="-ml-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-laton-texto transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid print:hidden"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {volver.etiqueta}
          </Link>
        )}
        <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] text-balance text-sidebar-foreground sm:text-[2.5rem] print:text-foreground">
              {titulo}
            </h1>
            {descripcion && (
              <p className="max-w-2xl text-base text-pretty text-sidebar-muted print:text-muted-foreground">
                {descripcion}
              </p>
            )}
            {children}
          </div>
          {acciones && (
            <div className="hero-acciones-nogal flex shrink-0 flex-wrap items-center gap-2 print:hidden">
              {acciones}
            </div>
          )}
        </div>
      </header>

      {subbarra && (
        <div className="border-t border-sidebar-border pt-4 print:hidden">{subbarra}</div>
      )}
    </MarcoHeroInicio>
  );
}

/**
 * Contenido principal debajo de un `EncabezadoPagina`: el primer bloque invade la parte inferior de
 * la franja de nogal para mantener la jerarquía y continuidad visual con los inicios.
 */
export function ContenedorHero({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative z-10 mx-auto -mt-10 flex w-full max-w-[1400px] flex-col gap-8 px-4 pb-10 sm:-mt-14 sm:px-6 sm:pb-12 print:mt-0 print:px-0 print:pt-4 print:pb-0',
        className
      )}
    >
      {children}
    </div>
  );
}
