import { ArrowRight, Clock, MessageSquareText } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
import { duracionSesion, estadoVisibleSesion } from '@/lib/sesiones/estados';
import { type SesionHistorial } from '@/types';

interface ListaSesionesProps {
  sesiones: SesionHistorial[];
  para: 'docente' | 'estudiante';
  /** Ruta del detalle de cada sesión. */
  enlace: (sesion: SesionHistorial) => Route;
  vacio: React.ReactNode;
}

/** Historial de sesiones con su estado (en progreso, por revisar, retroalimentación lista). */
export function ListaSesiones({ sesiones, para, enlace, vacio }: ListaSesionesProps) {
  if (sesiones.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {vacio}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {sesiones.map(sesion => {
        const estado = estadoVisibleSesion(sesion, para);
        const duracion = duracionSesion(sesion);
        const enCurso = sesion.estado === 'en_curso';
        const accion =
          para === 'docente'
            ? enCurso
              ? 'Ver estado'
              : sesion.retroalimentacion?.publicada
                ? 'Ver revisión'
                : 'Revisar'
            : enCurso
              ? 'Continuar'
              : 'Ver detalle';

        return (
          <li
            key={sesion.id}
            data-testid={`sesion-${sesion.id}`}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium">
                  {sesion.escenario.codigo}
                </span>
                <h3 className="truncate font-medium">{sesion.escenario.titulo}</h3>
                <InsigniaEstado estado={estado} />
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{formatearFechaHora(sesion.inicio)}</span>
                {duracion !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" aria-hidden />
                    {formatearDuracion(duracion)}
                  </span>
                )}
                {para === 'estudiante' && sesion.docente && (
                  <span className="flex items-center gap-1">
                    <MessageSquareText className="size-3" aria-hidden />
                    {sesion.docente}
                  </span>
                )}
              </p>
            </div>
            {sesion.retroalimentacion?.publicada && (
              <p className="flex items-baseline gap-1 sm:flex-col sm:items-end sm:gap-0">
                <span className="text-xs text-muted-foreground">Nota</span>
                <span className="font-heading text-2xl font-semibold tabular-nums">
                  {formatearNota(sesion.retroalimentacion.nota)}
                </span>
              </p>
            )}
            <Link
              href={enlace(sesion)}
              className="inline-flex items-center gap-1 self-start rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:self-center"
            >
              {accion}
              <span className="sr-only">: {sesion.escenario.titulo}</span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
