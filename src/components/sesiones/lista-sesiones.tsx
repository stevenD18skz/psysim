import { ArrowRight, ClipboardList } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import { duracionSesion, estadoVisibleSesion } from '@/lib/sesiones/estados';
import { cn } from '@/lib/utils';
import { type SesionHistorial } from '@/types';

/** Rejilla compartida entre encabezado y filas: columnas fijas para Nota y Acción. */
const REJILLA_SESIONES =
  '@3xl:grid-cols-[minmax(0,1.6fr)_minmax(11.5rem,0.9fr)_4.5rem_10.5rem] @3xl:items-center @3xl:gap-x-6';

interface ListaSesionesProps {
  sesiones: SesionHistorial[];
  para: 'docente' | 'estudiante';
  /** Ruta del detalle de cada sesión. */
  enlace: (sesion: SesionHistorial) => Route;
  vacio: React.ReactNode;
  ahora?: Date;
}

/** Historial de prácticas como registro: caso, estado, fecha, duración y nota publicada. */
export function ListaSesiones({ sesiones, para, enlace, vacio, ahora }: ListaSesionesProps) {
  if (sesiones.length === 0) {
    if (typeof vacio === 'string') {
      return <EstadoVacio icono={ClipboardList} titulo={vacio} />;
    }
    return <>{vacio}</>;
  }

  return (
    <div className="@container overflow-hidden rounded-2xl border bg-card">
      <div
        aria-hidden
        className={cn(
          'hidden border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:px-5 @3xl:grid',
          REJILLA_SESIONES
        )}
      >
        <span>Caso y fecha</span>
        <span>Estado</span>
        <span className="text-right">Nota</span>
        <span className="text-right">Acción</span>
      </div>
      <ul className="flex flex-col divide-y">
        {sesiones.map(sesion => {
          const estado = estadoVisibleSesion(sesion, para, {
            ultimaActividad: sesion.ultimaActividad,
          });
          const duracion = duracionSesion(sesion);
          const enCurso = sesion.estado === 'en_curso';
          const publicada = sesion.retroalimentacion?.publicada ?? false;
          const haceCuanto = ahora ? tiempoRelativo(sesion.fin ?? sesion.inicio, ahora) : null;
          const accion =
            para === 'docente'
              ? enCurso
                ? 'Ver estado'
                : publicada
                  ? 'Ver revisión'
                  : sesion.retroalimentacion
                    ? 'Continuar revisión'
                    : sesion.estado === 'interrumpida' && !sesion.comenzada
                      ? 'Ver detalle'
                      : 'Revisar'
              : enCurso
                ? 'Continuar'
                : 'Ver';
          const etiquetaInterrupcion =
            sesion.estado === 'interrumpida'
              ? !sesion.comenzada
                ? 'No llegó a comenzar'
                : publicada
                  ? 'Interrumpida'
                  : null
              : null;
          const requiereRevision = para === 'docente' && !publicada && !enCurso && sesion.comenzada;

          return (
            <li
              key={sesion.id}
              data-testid={`sesion-${sesion.id}`}
              className={cn(
                'group relative grid gap-3 px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/60 sm:px-5 @3xl:py-4',
                REJILLA_SESIONES
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold text-pretty text-foreground">
                  {sesion.escenario.titulo}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                  <CodigoCaso
                    codigo={sesion.escenario.codigo}
                    className="font-mono text-xs font-medium text-foreground"
                  />
                  {haceCuanto && (
                    <>
                      <span
                        title={formatearFechaHora(sesion.inicio)}
                        className="font-medium text-foreground/85 tabular-nums first-letter:uppercase"
                      >
                        {haceCuanto}
                      </span>
                      <span aria-hidden>·</span>
                    </>
                  )}
                  <span className="text-xs tabular-nums">{formatearFechaHora(sesion.inicio)}</span>
                  {duracion !== null && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-xs tabular-nums">{formatearDuracion(duracion)}</span>
                    </>
                  )}
                  {para === 'estudiante' && sesion.docente && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-xs">Docente: {sesion.docente}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-col items-start gap-1">
                <InsigniaEstado estado={estado} />
                {etiquetaInterrupcion && (
                  <span className="text-xs text-muted-foreground">{etiquetaInterrupcion}</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-2.5 @3xl:contents">
                <div className="flex items-baseline gap-1.5 @3xl:justify-end">
                  {publicada ? (
                    <>
                      <span className="text-xs text-muted-foreground @3xl:hidden">Nota</span>
                      <span className="text-lg font-bold text-foreground ancho-semiexpandido tabular-nums">
                        {formatearNota(sesion.retroalimentacion?.nota ?? null)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        aria-hidden
                        className="hidden text-sm text-muted-foreground/55 @3xl:inline"
                      >
                        —
                      </span>
                      <span className="sr-only">Sin nota</span>
                    </>
                  )}
                </div>

                <div className="ml-auto flex justify-end @3xl:ml-0">
                  <Link
                    href={enlace(sesion)}
                    className={cn(
                      'inline-flex w-fit items-center gap-1.5 rounded-md text-sm whitespace-nowrap underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                      requiereRevision
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {accion}
                    <span className="sr-only">: {sesion.escenario.titulo}</span>
                    <ArrowRight
                      className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
