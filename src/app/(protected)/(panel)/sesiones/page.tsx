import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  MessageSquareQuote,
  SearchX,
  Users,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import { type Route } from 'next';
import Link from 'next/link';

import { PistaFaro } from '@/components/ayuda/pista-contextual';
import { CodigoCaso } from '@/components/casos/codigo-caso';
import { BusquedaLista, QuitarFiltros, SelectorLista } from '@/components/comun/controles-lista';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { Paginacion } from '@/components/comun/paginacion';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { codigoVisibleCaso } from '@/lib/escenarios/etiquetas';
import { formatearDia, formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import {
  conParametros,
  IDS_PERIODO,
  leerOpcion,
  leerPagina,
  leerTexto,
  paginar,
  PERIODOS,
} from '@/lib/listas';
import { duracionSesion, estadoVisibleSesion, estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerSesionesDelDocente } from '@/lib/sesiones/queries';
import {
  AGRUPACIONES,
  agruparPorCaso,
  agruparPorEstudiante,
  claveCelda,
  FILTROS_VISTA,
  filtrarRevisiones,
  IDS_AGRUPACION,
  IDS_ORDEN,
  IDS_VISTA,
  matrizRevisiones,
  ORDENES,
  ordenarRevisiones,
  ordenPorDefecto,
  type ResumenGrupo,
  senalesRevision,
  type Vista,
  VISTAS,
} from '@/lib/sesiones/revisiones';
import { cn } from '@/lib/utils';
import { type SesionDocente } from '@/types';

export const metadata: Metadata = {
  title: 'Revisiones',
};

/** Prácticas por página en la lista (la misma medida que la ficha del estudiante). */
const PRACTICAS_POR_PAGINA = 10;
/** Grupos por página en las vistas agrupadas (cada grupo ya resume varias prácticas). */
const GRUPOS_POR_PAGINA = 10;
/** Estudiantes por página en la matriz para que quepa en pantalla sin perder el encabezado. */
const MATRIZ_ESTUDIANTES_POR_PAGINA = 20;
/** Prácticas visibles dentro de cada grupo; el resto se ve en la lista filtrada. */
const PRACTICAS_POR_GRUPO = 5;
const FILTROS_LISTA = ['q', 'caso', 'periodo'] as const;

/**
 * Todas las prácticas del docente en un solo lugar. Con 30 estudiantes y 6 casos son unas 180 por
 * semestre: se buscan por estudiante o caso, se filtran por estado, caso y fecha, se ordenan y se
 * ven como lista, agrupadas por estudiante o por caso, o como matriz estudiantes × casos. Todo
 * queda en la URL.
 */
export default async function RevisionesPage({ searchParams }: PageProps<'/sesiones'>) {
  await requerirDocente();
  const [parametros, sesiones] = await Promise.all([searchParams, obtenerSesionesDelDocente()]);

  const vista = leerOpcion(parametros.vista, IDS_VISTA, 'pendientes');
  const defectoOrden = ordenPorDefecto(vista);
  const orden = leerOpcion(parametros.orden, IDS_ORDEN, defectoOrden);
  const agrupar = leerOpcion(parametros.agrupar, IDS_AGRUPACION, 'lista');
  const periodo = leerOpcion(parametros.periodo, IDS_PERIODO, 'todo');
  const consulta = leerTexto(parametros.q);
  const caso = leerTexto(parametros.caso);
  const pagina = leerPagina(parametros.pagina);

  const actuales = Object.fromEntries(
    Object.entries(parametros).flatMap(([clave, valor]) =>
      typeof valor === 'string' ? [[clave, valor]] : []
    )
  );
  const defectos = { vista: 'pendientes', orden: defectoOrden, agrupar: 'lista', periodo: 'todo' };
  const url = (cambios: Record<string, string | number | null>) =>
    conParametros('/sesiones', actuales, cambios, defectos);

  // Los contadores de las pestañas respetan los demás filtros: dicen cuántas verías al pulsar.
  const sinVista = filtrarRevisiones(sesiones, { vista: 'todas', consulta, caso, periodo });
  const conteos = Object.fromEntries(
    VISTAS.map(v => [v.id, sinVista.filter(FILTROS_VISTA[v.id]).length])
  ) as Record<Vista, number>;
  const filtradas = ordenarRevisiones(sinVista.filter(FILTROS_VISTA[vista]), orden);
  const enCursoTotal = sesiones.filter(s => s.estado === 'en_curso').length;

  const casos = [...new Map(sesiones.map(s => [s.escenario.codigo, s.escenario])).values()].sort(
    (a, b) => a.codigo.localeCompare(b.codigo)
  );
  const ahora = new Date();
  const hayFiltros = Boolean(consulta || caso || periodo !== 'todo');
  const exportar = conParametros('/sesiones/exportar', actuales, {}, defectos);

  return (
    <div className="flex flex-1 flex-col">
      <RefrescoAutomatico activo={enCursoTotal > 0} segundos={30} />
      <EncabezadoPagina
        titulo="Revisiones"
        descripcion="Lee cada conversación, comenta frases concretas y publica tu retroalimentación con la nota."
        acciones={
          sesiones.length > 0 ? (
            <Button asChild variant="outline" size="lg">
              <a href={exportar} download>
                <Download aria-hidden />
                Exportar CSV
              </a>
            </Button>
          ) : undefined
        }
        subbarra={
          <PistaSegmentada
            elemento="nav"
            aria-label="Filtrar por estado"
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
            claseIndicador="rounded-lg border border-sidebar-border bg-sidebar-accent"
          >
            {VISTAS.map(v => {
              const activa = v.id === vista;
              return (
                <Link
                  key={v.id}
                  href={url({ vista: v.id, orden: null }) as Route}
                  scroll={false}
                  aria-current={activa ? 'page' : undefined}
                  className={cn(
                    'flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors duration-300 ease-salida focus-visible:ring-2 focus-visible:ring-laton-texto focus-visible:outline-hidden',
                    activa
                      ? 'border border-sidebar-border bg-sidebar-accent text-lino'
                      : 'text-sidebar-muted hover:bg-sidebar-accent/45 hover:text-sidebar-foreground'
                  )}
                >
                  {v.etiqueta}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      activa ? 'bg-lino/15 text-lino' : 'bg-sidebar-accent/60 text-sidebar-muted'
                    )}
                  >
                    {conteos[v.id]}
                  </span>
                </Link>
              );
            })}
          </PistaSegmentada>
        }
      />

      <ContenedorHero className="gap-6">
        {sesiones.length > 0 && (
          <div
            className={cn(
              'grid gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end',
              SOMBRA_SOBRE_NOGAL
            )}
          >
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-medium text-muted-foreground">Buscar</span>
              <BusquedaLista
                etiqueta="Buscar por estudiante o caso"
                placeholder="Nombre, código o caso"
              />
            </div>
            <SelectorLista
              etiqueta="Caso"
              parametro="caso"
              defecto=""
              opciones={[
                { valor: '', etiqueta: 'Todos los casos' },
                ...casos.map(c => ({ valor: c.codigo, etiqueta: `${c.codigo} · ${c.titulo}` })),
              ]}
            />
            <SelectorLista
              etiqueta="Fecha"
              parametro="periodo"
              defecto="todo"
              opciones={PERIODOS.map(p => ({ valor: p.id, etiqueta: p.etiqueta }))}
            />
            <SelectorLista
              etiqueta="Ordenar por"
              parametro="orden"
              defecto={defectoOrden}
              opciones={ORDENES}
            />
            <SelectorLista
              etiqueta="Ver"
              parametro="agrupar"
              defecto="lista"
              opciones={AGRUPACIONES}
              ayuda={
                sesiones.length >= 2 ? (
                  <PistaFaro
                    id="revisiones-vistas"
                    etiqueta="Vista matriz"
                    titulo="Analiza a todo tu grupo de un vistazo"
                    descripcion="En «Ver» puedes agrupar las prácticas por estudiante, por caso o abrir la matriz estudiantes × casos para revisar notas y pendientes en una sola tabla."
                    alineacion="end"
                  />
                ) : undefined
              }
            />
            <QuitarFiltros claves={FILTROS_LISTA} />
          </div>
        )}

        {filtradas.length === 0 ? (
          <EstadoVacioRevisiones
            vista={vista}
            hayFiltros={hayFiltros}
            totalSesiones={sesiones.length}
            conteos={conteos}
            url={url}
          />
        ) : agrupar === 'lista' ? (
          <VistaLista sesiones={filtradas} pagina={pagina} url={url} ahora={ahora} />
        ) : agrupar === 'matriz' ? (
          <VistaMatriz sesiones={filtradas} pagina={pagina} url={url} />
        ) : (
          <VistaGrupos
            grupos={
              agrupar === 'estudiante' ? agruparPorEstudiante(filtradas) : agruparPorCaso(filtradas)
            }
            porEstudiante={agrupar === 'estudiante'}
            pagina={pagina}
            url={url}
            ahora={ahora}
          />
        )}
      </ContenedorHero>
    </div>
  );
}

type Url = (cambios: Record<string, string | number | null>) => string;

/** Rejilla compartida entre encabezado y filas de Revisiones: columnas fijas para Nota y Acción. */
const REJILLA_REVISIONES =
  '@4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_4.5rem_10.5rem] @4xl:items-center @4xl:gap-x-6';

/** Rejilla compartida de las filas dentro de cada grupo («Por estudiante» / «Por caso»). */
const REJILLA_COMPACTA =
  '@3xl:grid-cols-[minmax(0,1fr)_11.5rem_11.5rem_3.75rem_10.25rem] @3xl:items-center @3xl:gap-x-4';

function VistaLista({
  sesiones,
  pagina,
  url,
  ahora,
}: {
  sesiones: SesionDocente[];
  pagina: number;
  url: Url;
  ahora: Date;
}) {
  const resultado = paginar(sesiones, pagina, PRACTICAS_POR_PAGINA);
  return (
    <section aria-label="Prácticas" className="flex flex-col gap-4">
      <div className="@container overflow-hidden rounded-2xl border bg-card">
        <div
          aria-hidden
          className={cn(
            'hidden border-b bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground sm:px-6 @4xl:grid',
            REJILLA_REVISIONES
          )}
        >
          <span>Estudiante</span>
          <span>Caso y fecha</span>
          <span>Estado</span>
          <span className="text-right">Nota</span>
          <span className="text-right">Acción</span>
        </div>
        <ul className="flex flex-col divide-y">
          {resultado.visibles.map(sesion => (
            <FilaRevision key={sesion.id} sesion={sesion} ahora={ahora} />
          ))}
        </ul>
      </div>
      <Paginacion
        pagina={resultado}
        enlace={n => url({ pagina: n })}
        sustantivo={['práctica', 'prácticas']}
      />
    </section>
  );
}

/** Texto de la acción según el estado de la práctica. */
function accionDe(sesion: SesionDocente): string {
  if (sesion.estado === 'en_curso') return 'Ver estado';
  if (sesion.retroalimentacion?.publicada) return 'Ver revisión';
  if (sesion.retroalimentacion) return 'Continuar revisión';
  if (sesion.estado === 'interrumpida' && !sesion.comenzada) return 'Ver detalle';
  return 'Revisar';
}

function FilaRevision({ sesion, ahora }: { sesion: SesionDocente; ahora: Date }) {
  const estado = estadoVisibleSesion(sesion, 'docente', {
    ultimaActividad: sesion.ultimaActividad,
  });
  const duracion = duracionSesion(sesion);
  const publicada = sesion.retroalimentacion?.publicada ?? false;
  const { esperaDias, corta } = senalesRevision(sesion, ahora);
  const referenciaTiempo = sesion.fin ?? sesion.inicio;
  const haceCuanto = tiempoRelativo(referenciaTiempo, ahora);
  const etiquetaInterrupcion =
    sesion.estado === 'interrumpida'
      ? !sesion.comenzada
        ? 'No llegó a comenzar'
        : publicada
          ? 'Interrumpida'
          : null
      : null;

  const intervenciones =
    sesion.comenzada && sesion.intervenciones > 0
      ? sesion.intervenciones === 1
        ? '1 intervención'
        : `${sesion.intervenciones} intervenciones`
      : null;

  const requiereRevision = !publicada && sesion.estado !== 'en_curso' && sesion.comenzada;

  return (
    // Columnas con anchos fijos para Nota y Acción: ningún estado desplaza las columnas vecinas.
    <li
      className={cn(
        'group relative grid gap-3 px-5 py-4 transition-colors even:bg-muted/30 hover:bg-muted/60 sm:px-6 @4xl:py-4.5',
        REJILLA_REVISIONES
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-semibold text-foreground">{sesion.estudiante.nombre}</span>
        <span className="font-mono text-xs text-muted-foreground">{sesion.estudiante.codigo}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-pretty text-foreground">{sesion.escenario.titulo}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
          <CodigoCaso
            codigo={sesion.escenario.codigo}
            className="font-mono text-xs font-medium text-foreground"
          />
          <span
            title={formatearFechaHora(sesion.inicio)}
            className="font-medium text-foreground/85 tabular-nums first-letter:uppercase"
          >
            {haceCuanto}
          </span>
          <span aria-hidden>·</span>
          <span className="text-xs tabular-nums">{formatearFechaHora(sesion.inicio)}</span>
        </span>
      </div>

      <div className="flex min-w-0 flex-col items-start gap-1">
        <InsigniaEstado estado={estado} />
        {(duracion !== null || intervenciones || etiquetaInterrupcion) && (
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
            {duracion !== null && <span>{formatearDuracion(duracion)}</span>}
            {intervenciones && <span>{intervenciones}</span>}
            {etiquetaInterrupcion && <span>{etiquetaInterrupcion}</span>}
          </span>
        )}
        {((esperaDias !== null && esperaDias >= 1) || corta) && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium">
            {esperaDias !== null && esperaDias >= 1 && (
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  esperaDias >= 3 ? 'text-ambar' : 'text-muted-foreground'
                )}
              >
                <Clock3 className="size-3.5" aria-hidden />
                Espera {esperaDias === 1 ? '1 día' : `${esperaDias} días`}
              </span>
            )}
            {corta && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Zap className="size-3.5" aria-hidden />
                Muy corta
              </span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-2.5 @4xl:contents">
        <div className="flex items-baseline gap-1.5 @4xl:justify-end">
          {publicada ? (
            <>
              <span className="text-xs text-muted-foreground @4xl:hidden">Nota</span>
              <span className="text-lg font-bold text-foreground ancho-semiexpandido tabular-nums">
                {formatearNota(sesion.retroalimentacion?.nota ?? null)}
              </span>
            </>
          ) : (
            <>
              <span aria-hidden className="hidden text-sm text-muted-foreground/55 @4xl:inline">
                —
              </span>
              <span className="sr-only">Sin nota</span>
            </>
          )}
        </div>

        <div className="ml-auto flex justify-end @4xl:ml-0">
          <Link
            href={`/sesiones/${sesion.id}`}
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-md text-sm whitespace-nowrap underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
              requiereRevision
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground group-hover:text-foreground'
            )}
          >
            {accionDe(sesion)}
            <span className="sr-only">
              : {sesion.estudiante.nombre}, {sesion.escenario.titulo}
            </span>
            <ArrowRight
              className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </li>
  );
}

function VistaGrupos({
  grupos,
  porEstudiante,
  pagina,
  url,
  ahora,
}: {
  grupos: ResumenGrupo[];
  porEstudiante: boolean;
  pagina: number;
  url: Url;
  ahora: Date;
}) {
  const resultado = paginar(grupos, pagina, GRUPOS_POR_PAGINA);
  return (
    <section
      aria-label={porEstudiante ? 'Prácticas por estudiante' : 'Prácticas por caso'}
      className="flex flex-col gap-4"
    >
      <ul className="flex flex-col gap-3">
        {resultado.visibles.map(grupo => (
          <GrupoRevision
            key={grupo.clave}
            grupo={grupo}
            porEstudiante={porEstudiante}
            ahora={ahora}
            verTodas={url(
              porEstudiante
                ? { agrupar: null, q: grupo.subtitulo }
                : { agrupar: null, caso: grupo.clave }
            )}
          />
        ))}
      </ul>
      <Paginacion
        pagina={resultado}
        enlace={n => url({ pagina: n })}
        sustantivo={porEstudiante ? ['estudiante', 'estudiantes'] : ['caso', 'casos']}
      />
    </section>
  );
}

function GrupoRevision({
  grupo,
  porEstudiante,
  ahora,
  verTodas,
}: {
  grupo: ResumenGrupo;
  porEstudiante: boolean;
  ahora: Date;
  /** Lista filtrada con todas las prácticas del grupo. */
  verTodas: string;
}) {
  const restantes = grupo.sesiones.length - PRACTICAS_POR_GRUPO;
  return (
    <li className="overflow-hidden rounded-xl border bg-card">
      {/* Abierto si tiene algo por revisar: lo que pide atención se ve sin un clic más. */}
      <details className="group/grupo" open={grupo.porRevisar > 0}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 outline-hidden hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{grupo.titulo}</span>
              <span className="font-mono text-xs text-muted-foreground">{grupo.subtitulo}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              {grupo.sesiones.length === 1 ? '1 práctica' : `${grupo.sesiones.length} prácticas`} ·
              última el {formatearDia(grupo.ultima)}
            </span>
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {grupo.porRevisar > 0 && (
              <InsigniaEstado
                estado={{ texto: `${grupo.porRevisar} por revisar`, tono: 'pendiente' }}
              />
            )}
            {grupo.enCurso > 0 && (
              <InsigniaEstado
                estado={{
                  texto: grupo.enCurso === 1 ? 'Practicando ahora' : `${grupo.enCurso} en curso`,
                  tono: 'en-curso',
                }}
              />
            )}
            <span className="text-sm text-muted-foreground tabular-nums">
              Promedio{' '}
              <span className="font-semibold text-foreground">{formatearNota(grupo.promedio)}</span>
            </span>
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform duration-300 ease-salida group-open/grupo:rotate-180"
              aria-hidden
            />
          </span>
        </summary>
        <ul className="@container divide-y border-t">
          {grupo.sesiones.slice(0, PRACTICAS_POR_GRUPO).map(sesion => (
            <FilaCompacta
              key={sesion.id}
              sesion={sesion}
              porEstudiante={porEstudiante}
              ahora={ahora}
            />
          ))}
        </ul>
        {(restantes > 0 || (porEstudiante && grupo.enlace)) && (
          <p className="flex flex-wrap gap-x-5 gap-y-1 border-t bg-muted/30 px-4 py-2.5 text-sm">
            {restantes > 0 && (
              <Link
                href={verTodas as Route}
                className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                Ver las {grupo.sesiones.length} prácticas en la lista
              </Link>
            )}
            {porEstudiante && grupo.enlace && (
              <Link
                href={grupo.enlace as Route}
                className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                Ver la ficha de {grupo.titulo.split(' ')[0]}
              </Link>
            )}
          </p>
        )}
      </details>
    </li>
  );
}

function FilaCompacta({
  sesion,
  porEstudiante,
  ahora,
}: {
  sesion: SesionDocente;
  porEstudiante: boolean;
  ahora: Date;
}) {
  const estado = estadoVisibleSesion(sesion, 'docente', {
    ultimaActividad: sesion.ultimaActividad,
  });
  const publicada = sesion.retroalimentacion?.publicada ?? false;
  const haceCuanto = tiempoRelativo(sesion.fin ?? sesion.inicio, ahora);
  const requiereRevision = !publicada && sesion.estado !== 'en_curso' && sesion.comenzada;

  return (
    <li
      className={cn(
        'group relative grid gap-2 px-4 py-3 text-sm transition-colors even:bg-muted/30 hover:bg-muted/60',
        REJILLA_COMPACTA
      )}
    >
      <span className="min-w-0 truncate">
        {porEstudiante ? (
          <>
            <CodigoCaso codigo={sesion.escenario.codigo} className="mr-2 font-mono text-xs" />
            <span className="font-medium text-foreground">{sesion.escenario.titulo}</span>
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{sesion.estudiante.nombre}</span>
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {sesion.estudiante.codigo}
            </span>
          </>
        )}
      </span>
      <span
        title={formatearFechaHora(sesion.inicio)}
        className="text-xs text-muted-foreground tabular-nums first-letter:uppercase @3xl:text-right"
      >
        {haceCuanto} · {formatearDia(sesion.inicio)}
      </span>
      <div>
        <InsigniaEstado estado={estado} />
      </div>
      <div className="flex items-center justify-between gap-3 @3xl:contents">
        <span className="tabular-nums @3xl:text-right">
          {publicada ? (
            <span className="font-semibold text-foreground">
              <span className="mr-1 text-xs font-normal text-muted-foreground @3xl:hidden">
                Nota
              </span>
              {formatearNota(sesion.retroalimentacion?.nota ?? null)}
            </span>
          ) : (
            <>
              <span aria-hidden className="hidden text-muted-foreground/55 @3xl:inline">
                —
              </span>
              <span className="sr-only">Sin nota</span>
            </>
          )}
        </span>
        <span className="ml-auto flex justify-end @3xl:ml-0">
          <Link
            href={`/sesiones/${sesion.id}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-md whitespace-nowrap underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
              requiereRevision
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground group-hover:text-foreground'
            )}
          >
            {accionDe(sesion)}
            <span className="sr-only">
              : {sesion.estudiante.nombre}, {sesion.escenario.titulo}
            </span>
            <ArrowRight
              className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </span>
      </div>
    </li>
  );
}

/** Contenido de una celda de la matriz: el estado de la práctica más reciente de ese caso. */
function CeldaMatriz({ sesiones }: { sesiones: SesionDocente[] | undefined }) {
  if (!sesiones || sesiones.length === 0) {
    return (
      <span className="text-muted-foreground/60">
        <span aria-hidden>—</span>
        <span className="sr-only">Sin práctica</span>
      </span>
    );
  }
  const reciente = sesiones[0]!;
  const publicada = reciente.retroalimentacion?.publicada ?? false;
  const contenido =
    reciente.estado === 'en_curso' ? (
      <InsigniaEstado estado={{ texto: 'En curso', tono: 'en-curso' }} />
    ) : publicada ? (
      <span className="text-base font-semibold tabular-nums">
        {formatearNota(reciente.retroalimentacion?.nota ?? null)}
      </span>
    ) : estaPorRevisar(reciente) ? (
      <InsigniaEstado estado={{ texto: 'Por revisar', tono: 'pendiente' }} />
    ) : (
      <InsigniaEstado estado={{ texto: 'Sin conversación', tono: 'neutro' }} />
    );
  return (
    <Link
      href={`/sesiones/${reciente.id}`}
      className="inline-flex flex-col items-center gap-0.5 rounded-md px-1 py-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
    >
      {contenido}
      {sesiones.length > 1 && (
        <span className="text-xs text-muted-foreground">{sesiones.length} prácticas</span>
      )}
      <span className="sr-only">
        : {reciente.estudiante.nombre}, {reciente.escenario.titulo}
      </span>
    </Link>
  );
}

function VistaMatriz({
  sesiones,
  pagina,
  url,
}: {
  sesiones: SesionDocente[];
  pagina: number;
  url: Url;
}) {
  const { estudiantes, casos, celdas } = matrizRevisiones(sesiones);
  const resultado = paginar(estudiantes, pagina, MATRIZ_ESTUDIANTES_POR_PAGINA);
  return (
    <section aria-labelledby="matriz-titulo" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id="matriz-titulo" className="text-lg font-bold tracking-[-0.01em]">
            Estudiantes × casos
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada celda muestra la práctica más reciente: la nota publicada, si está por revisar o en
            curso. Una raya indica un caso que aún no ha practicado.
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {estudiantes.length === 1 ? '1 estudiante' : `${estudiantes.length} estudiantes`} ·{' '}
          {casos.length === 1 ? '1 caso' : `${casos.length} casos`} ·{' '}
          {sesiones.length === 1 ? '1 práctica' : `${sesiones.length} prácticas`}
        </p>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="matriz-titulo"
        // `relative`: el texto para lectores de pantalla (sr-only, absoluto) queda dentro del
        // contenedor con scroll y no ensancha la página en el celular.
        className="relative max-h-[70vh] overflow-auto rounded-xl border bg-card outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="sticky top-0 z-10 border-b bg-muted text-xs font-semibold text-muted-foreground">
            <tr>
              <th
                scope="col"
                className="sticky top-0 left-0 z-20 bg-muted px-4 py-3 text-left font-semibold shadow-[1px_0_0_var(--border)]"
              >
                Estudiante
              </th>
              {casos.map(c => (
                <th
                  key={c.codigo}
                  scope="col"
                  title={c.titulo}
                  className="px-3 py-3 text-center font-semibold"
                >
                  {/* Los casos propios no tienen código visible: se distinguen por su título. */}
                  {codigoVisibleCaso(c.codigo) === 'Propio' ? (
                    <span className="mx-auto line-clamp-2 block max-w-[8rem] font-sans">
                      {c.titulo}
                    </span>
                  ) : (
                    <>
                      <CodigoCaso codigo={c.codigo} className="font-mono" />
                      <span className="sr-only">: {c.titulo}</span>
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {resultado.visibles.map(e => (
              <tr
                key={e.id}
                className="group/fila transition-colors even:bg-muted/30 hover:bg-muted/60"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-medium shadow-[1px_0_0_var(--border)] transition-colors group-even/fila:bg-[color-mix(in_oklch,var(--card),var(--muted)_30%)] group-hover/fila:bg-[color-mix(in_oklch,var(--card),var(--muted)_60%)]"
                >
                  <span className="block max-w-[14rem] truncate">{e.nombre}</span>
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {e.codigo}
                  </span>
                </th>
                {casos.map(c => (
                  <td key={c.codigo} className="px-3 py-2 text-center">
                    <CeldaMatriz sesiones={celdas.get(claveCelda(e.id, c.codigo))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion
        pagina={resultado}
        enlace={n => url({ pagina: n })}
        sustantivo={['estudiante', 'estudiantes']}
      />
    </section>
  );
}

/** Estado vacío contextual de Revisiones: explica qué ocurre y ofrece la salida más útil según la pestaña. */
function EstadoVacioRevisiones({
  vista,
  hayFiltros,
  totalSesiones,
  conteos,
  url,
}: {
  vista: Vista;
  hayFiltros: boolean;
  totalSesiones: number;
  conteos: Record<Vista, number>;
  url: Url;
}) {
  const filtroSinResultados = hayFiltros && totalSesiones > 0;
  const sinPracticas = totalSesiones === 0;

  let Icono = ClipboardList;
  let claseIcono = 'bg-salvia-suave text-salvia-oscuro';
  let titulo = 'Aún no tienes prácticas por revisar';
  let descripcion =
    'Asigna un caso clínico a tus estudiantes y envíales su código. Cuando conversen con el paciente, su entrevista aparecerá aquí para que dejes retroalimentación.';

  if (filtroSinResultados) {
    Icono = SearchX;
    claseIcono = 'bg-muted text-muted-foreground';
    titulo = 'Ninguna práctica coincide con estos filtros';
    descripcion =
      'Prueba con otro término de búsqueda, cambia de periodo o quita los filtros activos para volver a ver tu historial.';
  } else if (vista === 'pendientes' && sinPracticas === false) {
    Icono = CheckCircle2;
    claseIcono = 'bg-salvia-suave text-salvia-oscuro';
    titulo = 'Estás al día: no tienes prácticas por revisar';
    descripcion =
      'Cuando un estudiante termine una entrevista (o alcance al menos 3 intervenciones), aparecerá aquí lista para que comentes sus frases.';
  } else if (vista === 'publicadas') {
    Icono = MessageSquareQuote;
    claseIcono = 'bg-muted text-salvia-oscuro';
    titulo = 'Aún no has publicado retroalimentaciones';
    descripcion =
      'Abre una práctica terminada, anota tus comentarios en las frases del estudiante y publícala para que aparezca aquí y la lea tu grupo.';
  } else if (vista === 'en-curso') {
    Icono = Clock3;
    claseIcono = 'bg-muted text-muted-foreground';
    titulo = 'Nadie está practicando en este momento';
    descripcion =
      'Cuando un estudiante abra el consultorio 3D con uno de tus códigos, verás su progreso aquí automáticamente cada 30 segundos.';
  } else if (vista === 'todas') {
    Icono = ClipboardList;
    claseIcono = 'bg-salvia-suave text-salvia-oscuro';
    titulo = 'Todavía no hay prácticas registradas';
    descripcion =
      'Elige un caso clínico y genera un código de acceso para tu primer estudiante desde Asignar práctica.';
  }

  return (
    <section
      aria-label={titulo}
      className={cn(
        'rounded-2xl border px-6 py-12 text-center',
        sinPracticas ? `bg-card ${SOMBRA_SOBRE_NOGAL}` : 'border-dashed border-border bg-card/70'
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <span
          aria-hidden
          className={cn('flex size-12 items-center justify-center rounded-2xl', claseIcono)}
        >
          <Icono className="size-6" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold tracking-[-0.015em] text-foreground">{titulo}</h2>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{descripcion}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {filtroSinResultados ? (
            <Button asChild variant="outline">
              <Link href={url({ q: null, caso: null, periodo: null }) as Route}>
                Quitar filtros
              </Link>
            </Button>
          ) : vista === 'pendientes' && sinPracticas === false ? (
            <>
              {conteos['en-curso'] > 0 && (
                <Button asChild variant="outline">
                  <Link href={url({ vista: 'en-curso', orden: null }) as Route}>
                    <Clock3 aria-hidden />
                    Ver {conteos['en-curso']} en curso
                  </Link>
                </Button>
              )}
              {conteos.publicadas > 0 && (
                <Button asChild variant="outline">
                  <Link href={url({ vista: 'publicadas', orden: null }) as Route}>
                    <MessageSquareQuote aria-hidden />
                    Ver {conteos.publicadas} {conteos.publicadas === 1 ? 'publicada' : 'publicadas'}
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant={
                  conteos.publicadas === 0 && conteos['en-curso'] === 0 ? 'accion' : 'default'
                }
              >
                <Link href="/configuracion">
                  <ClipboardList aria-hidden />
                  Asignar práctica
                </Link>
              </Button>
            </>
          ) : vista === 'publicadas' && conteos.pendientes > 0 ? (
            <Button asChild variant="default">
              <Link href={url({ vista: 'pendientes', orden: null }) as Route}>
                Revisar {conteos.pendientes} {conteos.pendientes === 1 ? 'pendiente' : 'pendientes'}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant={sinPracticas ? 'accion' : 'outline'}>
                <Link href="/configuracion">
                  <ClipboardList aria-hidden />
                  Asignar práctica
                </Link>
              </Button>
              {sinPracticas && (
                <Button asChild variant="outline">
                  <Link href="/estudiantes">
                    <Users aria-hidden />
                    Ver estudiantes
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
