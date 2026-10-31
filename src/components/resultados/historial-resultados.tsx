import { cn } from '@/lib/utils';
import { type DetalleSesion } from '@/types';

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/**
 * HU-21 · T03 — Historial completo de la conversación, en orden. Es una lectura sin comentarios:
 * subrayar frases y escribir la retroalimentación es trabajo de la revisión del docente.
 */
export function HistorialResultados({
  sesion,
  para,
}: {
  sesion: Pick<DetalleSesion, 'mensajes' | 'npc'>;
  para: 'docente' | 'estudiante';
}) {
  if (sesion.mensajes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-input/50 p-6 text-center text-sm text-muted-foreground">
        No hubo conversación con el paciente en esta práctica.
      </p>
    );
  }

  return (
    <ol
      aria-label="Conversación completa"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5"
    >
      {sesion.mensajes.map(mensaje => {
        const esEstudiante = mensaje.remitente === 'estudiante';
        return (
          <li
            key={mensaje.id}
            data-remitente={mensaje.remitente}
            className={cn(
              'flex max-w-[88%] flex-col gap-1',
              esEstudiante ? 'items-end self-end' : 'self-start'
            )}
          >
            <span className="px-1 text-xs font-medium text-muted-foreground">
              {esEstudiante ? (para === 'estudiante' ? 'Tú' : 'Estudiante') : sesion.npc.nombre} ·{' '}
              <time dateTime={mensaje.timestamp}>
                {formatoHora.format(new Date(mensaje.timestamp))}
              </time>
            </span>
            <p
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                esEstudiante
                  ? 'rounded-br-md bg-salvia-suave'
                  : 'rounded-bl-md border bg-background text-foreground'
              )}
            >
              {mensaje.contenido}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
