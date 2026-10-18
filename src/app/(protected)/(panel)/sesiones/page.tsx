import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
import { duracionSesion, estadoVisibleSesion, estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerSesionesDelDocente } from '@/lib/sesiones/queries';
import { cn } from '@/lib/utils';
import { type SesionDocente } from '@/types';

export const metadata: Metadata = {
  title: 'Revisiones',
};

const VISTAS = [
  { id: 'pendientes', etiqueta: 'Por revisar' },
  { id: 'publicadas', etiqueta: 'Publicadas' },
  { id: 'en-curso', etiqueta: 'En curso' },
  { id: 'todas', etiqueta: 'Todas' },
] as const;

type Vista = (typeof VISTAS)[number]['id'];

const FILTROS: Record<Vista, (s: SesionDocente) => boolean> = {
  pendientes: estaPorRevisar,
  publicadas: s => s.retroalimentacion?.publicada ?? false,
  'en-curso': s => s.estado === 'en_curso',
  todas: () => true,
};

const VACIOS: Record<Vista, string> = {
  pendientes: 'No tienes prácticas por revisar. Cuando un estudiante termine una, aparecerá aquí.',
  publicadas: 'Aún no has publicado ninguna retroalimentación.',
  'en-curso': 'Nadie está practicando en este momento.',
  todas: 'Todavía no hay prácticas. Asigna una desde «Asignar práctica».',
};

/**
 * Todas las prácticas del docente en un solo lugar, por estado: lo que falta revisar (de lo que
 * más espera a lo más reciente), lo publicado, lo que está en curso y el historial completo.
 */
export default async function RevisionesPage({ searchParams }: PageProps<'/sesiones'>) {
  await requerirDocente();
  const [{ vista: parametro }, sesiones] = await Promise.all([
    searchParams,
    obtenerSesionesDelDocente(),
  ]);
  const vista: Vista = VISTAS.some(v => v.id === parametro) ? (parametro as Vista) : 'pendientes';

  const conteos = Object.fromEntries(
    VISTAS.map(v => [v.id, sesiones.filter(FILTROS[v.id]).length])
  ) as Record<Vista, number>;

  let visibles = sesiones.filter(FILTROS[vista]);
  if (vista === 'pendientes') {
    visibles = [...visibles].sort((a, b) => (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <RefrescoAutomatico activo={conteos['en-curso'] > 0} segundos={30} />
      <EncabezadoPagina
        titulo="Revisiones"
        descripcion="Lee cada conversación, comenta frases concretas y publica tu retroalimentación con la nota."
      />

      <nav aria-label="Filtrar por estado" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {VISTAS.map(v => {
          const activa = v.id === vista;
          return (
            <Link
              key={v.id}
              href={v.id === 'pendientes' ? '/sesiones' : `/sesiones?vista=${v.id}`}
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                activa
                  ? 'bg-nogal text-lino'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {v.etiqueta}
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  activa ? 'bg-lino/15' : 'bg-muted'
                )}
              >
                {conteos[v.id]}
              </span>
            </Link>
          );
        })}
      </nav>

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input/50 px-5 py-8 text-center text-muted-foreground">
          {VACIOS[vista]}
        </p>
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
          {visibles.map(sesion => (
            <FilaRevision key={sesion.id} sesion={sesion} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilaRevision({ sesion }: { sesion: SesionDocente }) {
  const estado = estadoVisibleSesion(sesion, 'docente');
  const duracion = duracionSesion(sesion);
  const publicada = sesion.retroalimentacion?.publicada ?? false;
  const accion =
    sesion.estado === 'en_curso'
      ? 'Ver estado'
      : publicada
        ? 'Ver revisión'
        : sesion.retroalimentacion
          ? 'Continuar revisión'
          : 'Revisar';

  return (
    <li className="group relative flex flex-col gap-2 px-4 py-3.5 hover:bg-muted/60 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{sesion.estudiante.nombre}</span>
          <InsigniaEstado estado={estado} />
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
          <CodigoCaso
            codigo={sesion.escenario.codigo}
            className="font-mono text-xs text-foreground"
          />
          <span className="min-w-0 break-words">{sesion.escenario.titulo}</span>
          <span aria-hidden>·</span>
          <span>{formatearFechaHora(sesion.inicio)}</span>
          {duracion !== null && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{formatearDuracion(duracion)}</span>
            </>
          )}
          {sesion.estado === 'interrumpida' && (
            <>
              <span aria-hidden>·</span>
              <span>{sesion.comenzada ? 'Interrumpida' : 'No llegó a comenzar'}</span>
            </>
          )}
        </p>
      </div>
      {publicada && (
        <p className="flex items-baseline gap-1.5 sm:flex-col sm:items-end sm:gap-0">
          <span className="text-xs text-muted-foreground">Nota</span>
          <span className="text-xl font-semibold ancho-semiexpandido tabular-nums">
            {formatearNota(sesion.retroalimentacion?.nota ?? null)}
          </span>
        </p>
      )}
      <Link
        href={`/sesiones/${sesion.id}`}
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        {accion}
        <span className="sr-only">
          : {sesion.estudiante.nombre}, {sesion.escenario.titulo}
        </span>
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}
