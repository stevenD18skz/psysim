'use client';

import { Highlighter } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  ABRE_ANOTACION,
  abreOtraAnotacion,
  type Ancla,
  anclaDeMarca,
  irAMarca,
} from '@/components/retroalimentacion/ancla';
import {
  numerarAnotaciones,
  NumeroAnotacion,
  TextoAnotado,
} from '@/components/retroalimentacion/texto-anotado';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type DetalleSesion } from '@/types';

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/**
 * Conversación de una práctica para el estudiante. Con la retroalimentación publicada, las frases
 * que comentó el docente aparecen subrayadas: al pulsarlas, el comentario se abre en un globo
 * sobre el chat. Al lado (debajo en pantallas pequeñas) quedan todos los comentarios en orden.
 */
export function VistaConversacion({ sesion }: { sesion: DetalleSesion }) {
  const raiz = useRef<HTMLOListElement>(null);
  const [abierta, setAbierta] = useState<{ id: string; ancla: Ancla } | null>(null);

  const anotaciones = sesion.retroalimentacion?.publicadaEn
    ? sesion.retroalimentacion.anotaciones
    : [];
  const numeros = numerarAnotaciones(sesion.mensajes, anotaciones);
  const ordenadas = [...anotaciones].sort(
    (a, b) => (numeros.get(a.id) ?? 0) - (numeros.get(b.id) ?? 0)
  );
  const seleccionada = abierta ? anotaciones.find(a => a.id === abierta.id) : undefined;

  const abrir = (id: string) => {
    irAMarca(id);
    setAbierta({ id, ancla: anclaDeMarca(id, raiz.current) });
  };

  if (sesion.mensajes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No alcanzaste a conversar con el paciente en esta sesión.
      </p>
    );
  }

  const chat = (
    <ol
      ref={raiz}
      aria-label="Conversación de la sesión"
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:p-5"
    >
      {sesion.mensajes.map(mensaje => {
        const esEstudiante = mensaje.remitente === 'estudiante';
        const propias = anotaciones.filter(a => a.mensajeId === mensaje.id);
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
              <TextoAnotado
                contenido={mensaje.contenido}
                anotaciones={propias}
                numeros={numeros}
                activa={abierta?.id ?? null}
                onAbrir={abrir}
              />
            </p>
          </li>
        );
      })}
    </ol>
  );

  if (anotaciones.length === 0) return chat;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Highlighter className="size-4 shrink-0 text-amber-600" aria-hidden />
          Pulsa una frase subrayada para leer el comentario de tu docente.
        </p>
        {chat}

        <Popover open={seleccionada !== undefined} onOpenChange={a => !a && setAbierta(null)}>
          {abierta && <PopoverAnchor virtualRef={{ current: abierta.ancla }} />}
          {seleccionada && (
            <PopoverContent
              portal={false}
              side="bottom"
              hideWhenDetached
              onInteractOutside={evento => {
                if (abreOtraAnotacion(evento.target)) evento.preventDefault();
              }}
              aria-label={`Comentario ${numeros.get(seleccionada.id)} de tu docente`}
              className="flex w-80 flex-col gap-2"
            >
              <div className="flex items-start gap-2">
                <NumeroAnotacion numero={numeros.get(seleccionada.id)} />
                <p className="line-clamp-2 text-xs text-muted-foreground italic">
                  «{seleccionada.fragmento}»
                </p>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {seleccionada.comentario}
              </p>
            </PopoverContent>
          )}
        </Popover>
      </div>

      <aside
        aria-labelledby="comentarios-docente-titulo"
        className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto"
      >
        <h3 id="comentarios-docente-titulo" className="text-base font-semibold tracking-tight">
          Comentarios de tu docente
          <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
            {anotaciones.length}
          </span>
        </h3>
        <ol className="flex flex-col gap-2">
          {ordenadas.map(anotacion => (
            <li key={anotacion.id} id={`anotacion-${anotacion.id}`}>
              <button
                type="button"
                {...ABRE_ANOTACION}
                onClick={() => abrir(anotacion.id)}
                className={cn(
                  'flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  abierta?.id === anotacion.id
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10'
                    : 'bg-background hover:border-amber-300'
                )}
              >
                <span className="flex items-start gap-2">
                  <NumeroAnotacion numero={numeros.get(anotacion.id)} />
                  <span className="line-clamp-2 text-muted-foreground italic">
                    «{anotacion.fragmento}»
                  </span>
                </span>
                <span className="pl-7 whitespace-pre-wrap">{anotacion.comentario}</span>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
