import { ABRE_ANOTACION } from '@/components/retroalimentacion/ancla';
import { segmentarMensaje } from '@/lib/retroalimentacion/fragmentos';
import { cn } from '@/lib/utils';
import { type Anotacion } from '@/types';

interface TextoAnotadoProps {
  contenido: string;
  anotaciones: readonly Anotacion[];
  /** Número visible de cada anotación (1, 2, 3…) en el orden de la conversación. */
  numeros: ReadonlyMap<string, number>;
  /** Anotación resaltada (p. ej. la que se está editando). */
  activa?: string | null;
  /** Si se indica, cada subrayado se puede pulsar (clic, Enter o espacio) para ver su comentario. */
  onAbrir?: (id: string) => void;
}

/**
 * Texto de un mensaje con las frases subrayadas por el docente. El número de cada subrayado se
 * dibuja con CSS (`data-numero`), no como texto: así el contenido del elemento coincide con el
 * mensaje y las posiciones de una selección nueva se calculan sobre el texto original.
 */
export function TextoAnotado({
  contenido,
  anotaciones,
  numeros,
  activa,
  onAbrir,
}: TextoAnotadoProps) {
  if (anotaciones.length === 0) return <>{contenido}</>;

  return (
    <>
      {segmentarMensaje(contenido, anotaciones).map((segmento, indice) =>
        segmento.anotacion ? (
          <mark
            key={segmento.anotacion.id}
            id={`marca-${segmento.anotacion.id}`}
            data-numero={numeros.get(segmento.anotacion.id) ?? ''}
            aria-describedby={`anotacion-${segmento.anotacion.id}`}
            {...(onAbrir && interaccion(segmento.anotacion.id, onAbrir))}
            className={cn(
              'rounded-sm bg-amber-200/90 text-amber-950 underline decoration-amber-600 decoration-2 underline-offset-2 dark:bg-amber-400/30 dark:text-amber-50',
              'after:ml-0.5 after:align-super after:text-[10px] after:font-semibold after:text-amber-700 after:no-underline after:content-[attr(data-numero)] dark:after:text-amber-300',
              onAbrir &&
                'cursor-pointer transition-colors outline-none hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-amber-400/45',
              activa === segmento.anotacion.id && 'bg-amber-300 ring-2 ring-amber-500'
            )}
          >
            {segmento.texto}
          </mark>
        ) : (
          <span key={`t-${indice}`}>{segmento.texto}</span>
        )
      )}
    </>
  );
}

/** Círculo con el número de un comentario, igual al que acompaña su subrayado. */
export function NumeroAnotacion({ numero }: { numero: number | undefined }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-semibold text-amber-900 tabular-nums">
      {numero}
    </span>
  );
}

/** Props de un subrayado que abre su comentario. */
function interaccion(id: string, onAbrir: (id: string) => void) {
  return {
    ...ABRE_ANOTACION,
    role: 'button',
    tabIndex: 0,
    'aria-haspopup': 'dialog' as const,
    onClick: () => {
      // Al arrastrar para seleccionar texto también llega un clic: ese no abre nada.
      if (window.getSelection()?.isCollapsed === false) return;
      onAbrir(id);
    },
    onKeyDown: (evento: React.KeyboardEvent) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return;
      evento.preventDefault();
      onAbrir(id);
    },
  };
}

/** Numera las anotaciones en el orden en que aparecen en la conversación. */
export function numerarAnotaciones(
  mensajes: readonly { id: string }[],
  anotaciones: readonly Anotacion[]
): Map<string, number> {
  const orden = new Map(mensajes.map((m, i) => [m.id, i]));
  const ordenadas = [...anotaciones].sort(
    (a, b) => (orden.get(a.mensajeId) ?? 0) - (orden.get(b.mensajeId) ?? 0) || a.inicio - b.inicio
  );
  return new Map(ordenadas.map((a, i) => [a.id, i + 1]));
}
