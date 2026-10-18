import { ArrowRight } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
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

/** Historial de prácticas como registro: caso, estado, fecha, duración y nota publicada. */
export function ListaSesiones({ sesiones, para, enlace, vacio }: ListaSesionesProps) {
  if (sesiones.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-input/50 p-6 text-center text-sm text-muted-foreground">
        {vacio}
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {sesiones.map(sesion => {
        const estado = estadoVisibleSesion(sesion, para, {
          ultimaActividad: sesion.ultimaActividad,
        });
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
              : 'Ver';

        return (
          <li
            key={sesion.id}
            data-testid={`sesion-${sesion.id}`}
            className="group relative flex flex-col gap-2 px-4 py-3.5 hover:bg-muted/60 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CodigoCaso
                  codigo={sesion.escenario.codigo}
                  className="font-mono text-xs font-medium text-muted-foreground"
                />
                <span className="truncate font-semibold">{sesion.escenario.titulo}</span>
                <InsigniaEstado estado={estado} />
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                <span>{formatearFechaHora(sesion.inicio)}</span>
                {duracion !== null && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{formatearDuracion(duracion)}</span>
                  </>
                )}
                {para === 'estudiante' && sesion.docente && (
                  <>
                    <span aria-hidden>·</span>
                    <span>Docente: {sesion.docente}</span>
                  </>
                )}
              </p>
            </div>
            {sesion.retroalimentacion?.publicada && (
              <p className="flex items-baseline gap-1.5 sm:flex-col sm:items-end sm:gap-0">
                <span className="text-xs text-muted-foreground">Nota</span>
                <span className="text-xl font-semibold ancho-semiexpandido tabular-nums">
                  {formatearNota(sesion.retroalimentacion.nota)}
                </span>
              </p>
            )}
            <Link
              href={enlace(sesion)}
              className="inline-flex w-fit items-center gap-1 rounded-md text-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              {accion}
              <span className="sr-only">: {sesion.escenario.titulo}</span>
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
