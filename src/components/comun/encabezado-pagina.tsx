import { ChevronLeft } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Encabezado común de las páginas de trabajo: un enlace de regreso opcional (la ruta de la que se
 * viene), el título, una descripción breve y las acciones a la derecha. El título habla solo: no
 * lleva etiquetas encima.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  volver,
  acciones,
  children,
  className,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  volver?: { href: Route; etiqueta: string };
  acciones?: React.ReactNode;
  /** Datos bajo el título (código, correo, estado…). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    // Consulta de contenedor: con el menú lateral abierto el contenido es más estrecho que la
    // ventana, así que las acciones pasan debajo según el espacio real.
    <header className={cn('@container flex flex-col gap-4', className)}>
      {volver && (
        <Link
          href={volver.href}
          className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {volver.etiqueta}
        </Link>
      )}
      <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] text-balance sm:text-[2.6rem]">
            {titulo}
          </h1>
          {descripcion && (
            <p className="max-w-2xl text-pretty text-muted-foreground">{descripcion}</p>
          )}
          {children}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </header>
  );
}
