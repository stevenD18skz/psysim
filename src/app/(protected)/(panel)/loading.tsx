import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mientras carga una página del panel, el menú sigue visible y el contenido muestra su silueta:
 * sin esto, al pulsar un enlace la pantalla anterior se quedaba quieta hasta que llegaba la nueva y
 * parecía que el clic no había funcionado.
 */
export default function CargandoPanel() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Cargando…</span>
      <div className="flex flex-col gap-2" aria-hidden>
        <Skeleton className="h-8 w-64 max-w-full motion-reduce:animate-none" />
        <Skeleton className="h-4 w-96 max-w-full motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl motion-reduce:animate-none" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl motion-reduce:animate-none" aria-hidden />
    </div>
  );
}
