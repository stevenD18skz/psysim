import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  MessageSquareText,
  User,
} from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { intervencionesDe } from '@/lib/conversacion/intentos';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { formatearHora } from '@/lib/fechas';
import { duracionSesion, estadoVisibleSesion } from '@/lib/sesiones/estados';
import { type DetalleSesion } from '@/types';

/** Duración legible con unidades claras («45 s», «7 min 20 s», «1 h 12 min») para tarjetas KPI. */
function textoDuracion(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  if (total < 60) return `${total} s`;
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const restoSeg = total % 60;
  if (horas > 0) {
    return minutos > 0 ? `${horas} h ${minutos} min` : `${horas} h`;
  }
  return restoSeg > 0 ? `${minutos} min ${restoSeg} s` : `${minutos} min`;
}

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
  ahora,
}: {
  sesion: DetalleSesion;
  para: 'docente' | 'estudiante';
  volver: { href: Route; etiqueta: string };
  posicion?: PosicionRevision | null;
  ahora?: Date;
}) {
  const duracion = duracionSesion(sesion);
  const intervenciones = sesion.mensajes.filter(m => m.remitente === 'estudiante').length;
  const reformuladas = sesion.intentos.reduce(
    (total, intento) => total + intervencionesDe(intento),
    0
  );

  const transcurrido =
    sesion.estado === 'en_curso' && sesion.comenzada && ahora
      ? Math.max(0, (ahora.getTime() - new Date(sesion.inicio).getTime()) / 1000)
      : null;

  const indicadorDuracion =
    sesion.estado === 'en_curso'
      ? sesion.comenzada
        ? {
            valor: transcurrido !== null ? textoDuracion(transcurrido) : 'En curso',
            detalle: 'Conversando ahora',
            tono: 'activo' as const,
          }
        : {
            valor: 'Sin empezar',
            detalle: 'Leyendo instrucciones',
            tono: 'activo' as const,
          }
      : duracion !== null
        ? {
            valor: textoDuracion(duracion),
            detalle:
              sesion.estado === 'interrumpida'
                ? `Corte por pausa (${formatearDuracion(duracion)})`
                : `Consulta completa (${formatearDuracion(duracion)})`,
          }
        : {
            valor: 'Sin iniciar',
            detalle: 'Cerró antes de conversar',
          };

  const detalleFecha =
    sesion.estado === 'en_curso' && sesion.comenzada === false
      ? `Abierta a las ${formatearHora(sesion.inicio)}`
      : sesion.fin
        ? `${formatearHora(sesion.inicio)} – ${formatearHora(sesion.fin)}`
        : `Inició a las ${formatearHora(sesion.inicio)}`;
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
    <div className="flex flex-col">
      <EncabezadoPagina
        volver={volver}
        conBordeLateral={para === 'docente'}
        titulo={
          <>
            <CodigoCaso
              codigo={sesion.escenario.codigo}
              className="mr-3 align-middle font-mono text-base font-medium text-laton-texto print:text-muted-foreground"
            />
            {sesion.escenario.titulo}
          </>
        }
        acciones={
          posicion && posicion.total > 0 ? (
            <nav aria-label="Prácticas por revisar" className="flex items-center gap-1.5">
              <span className="mr-2 text-sm text-sidebar-muted tabular-nums print:text-muted-foreground">
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-sidebar-muted print:text-muted-foreground">
          <InsigniaEstado estado={estado} />
          <span>
            Paciente:{' '}
            <span className="rounded-md bg-terracota-suave px-2 py-0.5 text-xs font-medium text-terracota">
              {sesion.npc.nombre}
            </span>
            {sesion.npc.edad > 0 && `, ${sesion.npc.edad} años`}
          </span>
          <span aria-hidden>·</span>
          <span>
            {para === 'estudiante' ? 'Competencia que practicaste' : 'Competencia'}:{' '}
            {sesion.escenario.competenciaCentral}
          </span>
        </div>
      </EncabezadoPagina>
      <ContenedorHero className="pb-0 sm:pb-0">
        <Indicadores
          className={SOMBRA_SOBRE_NOGAL}
          indicadores={[
            para === 'docente'
              ? {
                  icono: User,
                  etiqueta: 'Estudiante',
                  valor: sesion.estudiante.nombre,
                  enlace: `/estudiantes/${sesion.estudiante.id}`,
                  detalle: `Código ${sesion.estudiante.codigo}`,
                }
              : {
                  icono: GraduationCap,
                  etiqueta: 'Docente',
                  valor: sesion.docente ?? 'Por asignar',
                  detalle: sesion.docente ? 'A cargo de tu revisión' : 'Sin docente vinculado',
                },
            {
              icono: CalendarDays,
              etiqueta: 'Fecha',
              valor: formatearDia(sesion.inicio),
              detalle: detalleFecha,
            },
            {
              icono: Clock,
              etiqueta: 'Duración',
              valor: indicadorDuracion.valor,
              detalle: indicadorDuracion.detalle,
              tono: indicadorDuracion.tono,
              ayuda:
                'Tiempo real desde que el estudiante comenzó el consultorio hasta el cierre (los cierres por inactividad descuentan el tiempo sin respuesta).',
            },
            {
              icono: MessageSquareText,
              etiqueta: 'Intervenciones',
              valor: intervenciones,
              detalle:
                reformuladas > 0
                  ? `+${reformuladas} ${reformuladas === 1 ? 'reformulada' : 'reformuladas'}`
                  : intervenciones === 0
                    ? 'Aún sin mensajes'
                    : 'Mensajes vigentes',
              ayuda:
                para === 'docente'
                  ? 'Mensajes vigentes que envió el estudiante al paciente (las reformuladas son intentos anteriores que rehízo).'
                  : 'Mensajes vigentes que enviaste durante la entrevista (aparte quedan los que reformulaste).',
            },
          ]}
        />
      </ContenedorHero>
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
    'flex size-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid sm:size-9';
  if (!href) {
    return (
      <span
        aria-disabled
        className={`${clases} border-sidebar-border bg-transparent text-sidebar-muted/45`}
      >
        <Icono className="size-4" aria-hidden />
        <span className="sr-only">{etiqueta} (no hay)</span>
      </span>
    );
  }
  return (
    <Link
      href={href as Route}
      className={`${clases} border-lino/30 bg-sidebar-accent/55 text-sidebar-foreground hover:border-lino/70 hover:bg-sidebar-accent`}
      title={etiqueta}
    >
      <Icono className="size-4" aria-hidden />
      <span className="sr-only">{etiqueta}</span>
    </Link>
  );
}
