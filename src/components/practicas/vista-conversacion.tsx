import { numerarAnotaciones, TextoAnotado } from '@/components/retroalimentacion/texto-anotado';
import { cn } from '@/lib/utils';
import { type DetalleSesion } from '@/types';

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/**
 * Conversación de una práctica para el estudiante. Con la retroalimentación publicada, las frases
 * que comentó el docente aparecen subrayadas y su comentario va justo debajo del mensaje.
 */
export function VistaConversacion({ sesion }: { sesion: DetalleSesion }) {
  const anotaciones = sesion.retroalimentacion?.publicadaEn
    ? sesion.retroalimentacion.anotaciones
    : [];
  const numeros = numerarAnotaciones(sesion.mensajes, anotaciones);

  if (sesion.mensajes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No alcanzaste a conversar con el paciente en esta sesión.
      </p>
    );
  }

  return (
    <ol
      aria-label="Conversación de la sesión"
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:p-5"
    >
      {sesion.mensajes.map(mensaje => {
        const esEstudiante = mensaje.remitente === 'estudiante';
        const propias = anotaciones
          .filter(a => a.mensajeId === mensaje.id)
          .sort((a, b) => a.inicio - b.inicio);
        return (
          <li
            key={mensaje.id}
            data-remitente={mensaje.remitente}
            className={cn(
              'flex max-w-[88%] flex-col gap-1',
              esEstudiante ? 'items-end self-end' : 'self-start'
            )}
          >
            <span className="px-1 text-[11px] font-medium text-muted-foreground">
              {esEstudiante ? 'Tú' : sesion.npc.nombre} ·{' '}
              <time dateTime={mensaje.timestamp}>
                {formatoHora.format(new Date(mensaje.timestamp))}
              </time>
            </span>
            <p
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                esEstudiante
                  ? 'rounded-br-md border border-primary/20 bg-primary/6'
                  : 'rounded-bl-md bg-muted text-foreground'
              )}
            >
              <TextoAnotado contenido={mensaje.contenido} anotaciones={propias} numeros={numeros} />
            </p>
            {propias.length > 0 && (
              <ul className="flex w-full flex-col gap-1.5">
                {propias.map(anotacion => (
                  <li
                    key={anotacion.id}
                    id={`anotacion-${anotacion.id}`}
                    className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-left text-sm dark:border-amber-500/40 dark:bg-amber-500/10"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-semibold text-amber-900">
                      {numeros.get(anotacion.id)}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="sr-only">
                        Comentario de tu docente sobre «{anotacion.fragmento}»:
                      </span>
                      <span className="whitespace-pre-wrap">{anotacion.comentario}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
