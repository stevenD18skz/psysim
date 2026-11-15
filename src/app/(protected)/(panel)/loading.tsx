import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mientras carga una página del panel, el menú sigue visible y el contenido muestra su silueta
 * respetando exactamente el mismo contenedor, márgenes y espaciado de las páginas de trabajo.
 */
export default function CargandoPanel() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10"
    >
      <span className="sr-only">Cargando…</span>

      {/* Encabezado de página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" aria-hidden>
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-9 w-64 max-w-full sm:h-10 sm:w-80" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-44 shrink-0 rounded-[10px]" />
      </div>

      {/* Franja de indicadores */}
      <div
        className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:flex sm:divide-x"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-1 flex-col gap-2 px-4 py-3.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>

      {/* Contenido principal en dos bloques o registro de filas */}
      <div
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"
        aria-hidden
      >
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex w-20 shrink-0 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3.5 w-72 max-w-full" />
                </div>
                <Skeleton className="hidden h-4 w-20 sm:block" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-36" />
          <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2 px-4 py-4">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
