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
  onAbrir?: (id: string, origen: HTMLElement) => void;
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
              // Colores del tema (`ambar`, `ambar-suave`): sus pares están en `contraste.test.ts`.
              // El estado (al pasar el ratón, activa) se marca con un anillo, sin cambiar el fondo.
              'rounded-sm bg-ambar-suave text-foreground underline decoration-ambar decoration-2 underline-offset-2',
              'after:ml-0.5 after:align-super after:text-xs after:font-semibold after:text-ambar after:no-underline after:content-[attr(data-numero)]',
              onAbrir &&
                'cursor-pointer outline-hidden transition-colors hover:ring-1 hover:ring-ambar focus-visible:ring-2 focus-visible:ring-ring',
              activa === segmento.anotacion.id && 'ring-2 ring-ambar'
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
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ambar-suave text-xs font-semibold text-ambar tabular-nums">
      {numero}
    </span>
  );
}

/** Props de un subrayado que abre su comentario. */
function interaccion(id: string, onAbrir: NonNullable<TextoAnotadoProps['onAbrir']>) {
  return {
    ...ABRE_ANOTACION,
    role: 'button',
    tabIndex: 0,
    'aria-haspopup': 'dialog' as const,
    onClick: (evento: React.MouseEvent<HTMLElement>) => {
      // Al arrastrar para seleccionar texto también llega un clic: ese no abre nada.
      if (window.getSelection()?.isCollapsed === false) return;
      onAbrir(id, evento.currentTarget);
    },
    onKeyDown: (evento: React.KeyboardEvent<HTMLElement>) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return;
      evento.preventDefault();
      onAbrir(id, evento.currentTarget);
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
