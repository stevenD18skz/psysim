import { ChevronDown, RotateCcw } from 'lucide-react';

import { intervencionesDe } from '@/lib/conversacion/intentos';
import { cn } from '@/lib/utils';
import { type IntentoDescartado } from '@/types';

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

interface IntentoReformuladoProps {
  intento: IntentoDescartado;
  /** Nombre corto de quien practicó (el docente lo ve) o `null` para hablarle al estudiante. */
  estudiante: string | null;
  paciente: string;
}

/**
 * Intervenciones que el estudiante reformuló («ensayar otra respuesta»), en el punto de la
 * conversación donde ocurrieron. Plegadas por defecto: no forman parte de la conversación (el
 * paciente no las recuerda) ni se comentan, pero quedan a la vista del docente, como piden las
 * normas INACSL de integridad: nada de la práctica se oculta.
 */
export function IntentoReformulado({ intento, estudiante, paciente }: IntentoReformuladoProps) {
  const intervenciones = intervencionesDe(intento);
  const titulo = estudiante ? `${estudiante} reformuló aquí` : 'Reformulaste aquí';
  const detalle =
    intervenciones === 1
      ? '1 intervención descartada'
      : `${intervenciones} intervenciones descartadas`;

  return (
    <li className="self-stretch">
      <details className="group/intento rounded-xl border border-dashed border-ambar/45 bg-ambar-suave/35">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <RotateCcw className="size-4 shrink-0 text-ambar" aria-hidden />
          <span className="font-medium">{titulo}</span>
          <span className="text-muted-foreground">· {detalle}</span>
          <ChevronDown
            className="ml-auto size-4 text-muted-foreground transition-transform group-open/intento:rotate-180"
            aria-hidden
          />
        </summary>
        <ol className="flex flex-col gap-2 border-t border-dashed border-ambar/35 px-3 py-3">
          {intento.mensajes.map((mensaje, indice) => {
            const esEstudiante = mensaje.remitente === 'estudiante';
            // Un tramo nuevo (otra vez que reformuló) empieza siempre con una intervención suya.
            const nuevoTramo =
              indice > 0 &&
              esEstudiante &&
              intento.mensajes[indice - 1]?.descartadoEn !== mensaje.descartadoEn;
            return (
              <li key={mensaje.id} className="flex flex-col gap-1">
                {nuevoTramo && <span className="text-xs text-muted-foreground">Otro intento:</span>}
                <p
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground',
                    esEstudiante
                      ? 'self-end rounded-br-md bg-background/80'
                      : 'self-start rounded-bl-md border border-dashed bg-background/50'
                  )}
                >
                  <span className="sr-only">
                    {esEstudiante ? (estudiante ?? 'Tú') : paciente}:{' '}
                  </span>
                  {mensaje.contenido}
                </p>
                {esEstudiante && mensaje.descartadoEn && (
                  <span className="self-end text-xs text-muted-foreground">
                    {formatoHora.format(new Date(mensaje.timestamp))} · reformulada a las{' '}
                    {formatoHora.format(new Date(mensaje.descartadoEn))}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </details>
    </li>
  );
}
