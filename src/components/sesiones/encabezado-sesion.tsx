import { ArrowLeft, CalendarClock, Clock, MessageSquareText, UserRound } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { duracionSesion, estadoVisibleSesion } from '@/lib/sesiones/estados';
import { type DetalleSesion } from '@/types';

/** Encabezado común de la revisión (docente) y del detalle de la práctica (estudiante). */
export function EncabezadoSesion({
  sesion,
  para,
  volver,
}: {
  sesion: DetalleSesion;
  para: 'docente' | 'estudiante';
  volver: { href: Route; etiqueta: string };
}) {
  const duracion = duracionSesion(sesion);
  const intervenciones = sesion.mensajes.filter(m => m.remitente === 'estudiante').length;
  const estado = estadoVisibleSesion(
    {
      ...sesion,
      retroalimentacion: sesion.retroalimentacion
        ? {
            publicada: sesion.retroalimentacion.publicadaEn !== null,
            nota: sesion.retroalimentacion.nota,
          }
        : null,
    },
    para
  );

  const datos = [
    para === 'docente'
      ? {
          icono: UserRound,
          etiqueta: 'Estudiante',
          valor: `${sesion.estudiante.nombre} · ${sesion.estudiante.codigo}`,
        }
      : { icono: UserRound, etiqueta: 'Docente', valor: sesion.docente ?? '—' },
    { icono: CalendarClock, etiqueta: 'Fecha', valor: formatearFechaHora(sesion.inicio) },
    {
      icono: Clock,
      etiqueta: 'Duración',
      valor: duracion === null ? '—' : formatearDuracion(duracion),
    },
    { icono: MessageSquareText, etiqueta: 'Intervenciones', valor: String(intervenciones) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={volver.href}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {volver.etiqueta}
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium">
            {sesion.escenario.codigo}
          </span>
          <InsigniaEstado estado={estado} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {sesion.escenario.titulo}
        </h1>
        <p className="text-muted-foreground">
          Paciente: {sesion.npc.nombre}
          {sesion.npc.edad > 0 && `, ${sesion.npc.edad} años`} · Se entrena:{' '}
          {sesion.escenario.competenciaCentral}
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {datos.map(({ icono: Icono, etiqueta, valor }) => (
          <div
            key={etiqueta}
            className="flex flex-col gap-1 rounded-2xl border bg-card p-3.5 shadow-xs"
          >
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Icono className="size-3.5 text-primary" aria-hidden />
              {etiqueta}
            </dt>
            <dd className="truncate font-medium tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
