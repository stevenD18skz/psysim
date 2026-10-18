import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { duracionSesion, estadoVisibleSesion } from '@/lib/sesiones/estados';
import { type DetalleSesion } from '@/types';

/** Posición en la cola de revisión: «2 de 5 por revisar», con anterior y siguiente. */
export interface PosicionRevision {
  indice: number;
  total: number;
  anterior: string | null;
  siguiente: string | null;
}

/** Encabezado común de la revisión (docente) y de la relectura de la práctica (estudiante). */
export function EncabezadoSesion({
  sesion,
  para,
  volver,
  posicion = null,
}: {
  sesion: DetalleSesion;
  para: 'docente' | 'estudiante';
  volver: { href: Route; etiqueta: string };
  posicion?: PosicionRevision | null;
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

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        volver={volver}
        titulo={
          <>
            <CodigoCaso
              codigo={sesion.escenario.codigo}
              className="mr-3 align-middle font-mono text-base font-medium text-muted-foreground"
            />
            {sesion.escenario.titulo}
          </>
        }
        acciones={
          posicion && posicion.total > 0 ? (
            <nav aria-label="Prácticas por revisar" className="flex items-center gap-1">
              <span className="mr-2 text-sm text-muted-foreground tabular-nums">
                {posicion.indice} de {posicion.total} por revisar
              </span>
              <EnlaceCola
                href={posicion.anterior}
                etiqueta="Práctica anterior por revisar"
                icono="anterior"
              />
              <EnlaceCola
                href={posicion.siguiente}
                etiqueta="Siguiente práctica por revisar"
                icono="siguiente"
              />
            </nav>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground">
          <InsigniaEstado estado={estado} />
          <span>
            Paciente: <span className="font-medium text-terracota">{sesion.npc.nombre}</span>
            {sesion.npc.edad > 0 && `, ${sesion.npc.edad} años`}
          </span>
          <span aria-hidden>·</span>
          <span>
            {para === 'estudiante' ? 'Competencia que practicaste' : 'Competencia'}:{' '}
            {sesion.escenario.competenciaCentral}
          </span>
        </div>
      </EncabezadoPagina>
      <Indicadores
        indicadores={[
          para === 'docente'
            ? {
                etiqueta: 'Estudiante',
                valor: `${sesion.estudiante.nombre} · ${sesion.estudiante.codigo}`,
              }
            : { etiqueta: 'Docente', valor: sesion.docente ?? '—' },
          { etiqueta: 'Fecha', valor: formatearFechaHora(sesion.inicio) },
          { etiqueta: 'Duración', valor: duracion === null ? '—' : formatearDuracion(duracion) },
          { etiqueta: 'Intervenciones', valor: intervenciones },
        ]}
      />
    </div>
  );
}

function EnlaceCola({
  href,
  etiqueta,
  icono,
}: {
  href: string | null;
  etiqueta: string;
  icono: 'anterior' | 'siguiente';
}) {
  const Icono = icono === 'anterior' ? ChevronLeft : ChevronRight;
  const clases =
    'flex size-9 items-center justify-center rounded-lg border bg-card transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden';
  if (!href) {
    return (
      <span aria-disabled className={`${clases} text-muted-foreground/50`}>
        <Icono className="size-4" aria-hidden />
        <span className="sr-only">{etiqueta} (no hay)</span>
      </span>
    );
  }
  return (
    <Link href={href as Route} className={`${clases} hover:bg-muted`} title={etiqueta}>
      <Icono className="size-4" aria-hidden />
      <span className="sr-only">{etiqueta}</span>
    </Link>
  );
}
