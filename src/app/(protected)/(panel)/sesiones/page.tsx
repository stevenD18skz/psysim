import { ArrowRight, ChevronDown, Clock3, Download, MessagesSquare, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import { type Route } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { BusquedaLista, QuitarFiltros, SelectorLista } from '@/components/comun/controles-lista';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Paginacion } from '@/components/comun/paginacion';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { codigoVisibleCaso } from '@/lib/escenarios/etiquetas';
import { formatearDia, formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
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

const VACIOS: Record<Vista, string> = {
  pendientes: 'No tienes prácticas por revisar. Cuando un estudiante termine una, aparecerá aquí.',
  publicadas: 'Aún no has publicado ninguna retroalimentación.',
  'en-curso': 'Nadie está practicando en este momento.',
  todas: 'Todavía no hay prácticas. Asigna una desde «Asignar práctica».',
};

/** Prácticas por página en la lista (la misma medida que la ficha del estudiante). */
const PRACTICAS_POR_PAGINA = 10;
/** Grupos por página en las vistas agrupadas (cada grupo ya resume varias prácticas). */
const GRUPOS_POR_PAGINA = 10;
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
  const hayFiltros = Boolean(consulta || caso || periodo !== 'todo');
  const exportar = conParametros('/sesiones/exportar', actuales, {}, defectos);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
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
      />

      <nav aria-label="Filtrar por estado" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {VISTAS.map(v => {
          const activa = v.id === vista;
          return (
            <Link
              key={v.id}
              href={url({ vista: v.id, orden: null }) as Route}
              scroll={false}
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

      {sesiones.length > 0 && (
        <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
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
          />
          <QuitarFiltros claves={FILTROS_LISTA} />
        </div>
      )}

      {filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input/50 px-5 py-8 text-center text-muted-foreground">
          {hayFiltros && sesiones.length > 0
            ? 'Ninguna práctica coincide con los filtros. Prueba con otra búsqueda o quita los filtros.'
            : VACIOS[vista]}
        </p>
      ) : agrupar === 'lista' ? (
        <VistaLista sesiones={filtradas} pagina={pagina} url={url} />
      ) : agrupar === 'matriz' ? (
        <VistaMatriz sesiones={filtradas} />
      ) : (
        <VistaGrupos
          grupos={
            agrupar === 'estudiante' ? agruparPorEstudiante(filtradas) : agruparPorCaso(filtradas)
          }
          porEstudiante={agrupar === 'estudiante'}
          pagina={pagina}
          url={url}
        />
      )}
    </div>
  );
}

type Url = (cambios: Record<string, string | number | null>) => string;

function VistaLista({
  sesiones,
  pagina,
  url,
}: {
  sesiones: SesionDocente[];
  pagina: number;
  url: Url;
}) {
  const resultado = paginar(sesiones, pagina, PRACTICAS_POR_PAGINA);
  return (
    <section aria-label="Prácticas" className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
        {resultado.visibles.map(sesion => (
          <FilaRevision key={sesion.id} sesion={sesion} />
        ))}
      </ul>
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
  return sesion.retroalimentacion ? 'Continuar revisión' : 'Revisar';
}

function FilaRevision({ sesion }: { sesion: SesionDocente }) {
  const estado = estadoVisibleSesion(sesion, 'docente', {
    ultimaActividad: sesion.ultimaActividad,
  });
  const duracion = duracionSesion(sesion);
  const publicada = sesion.retroalimentacion?.publicada ?? false;
  const { esperaDias, corta } = senalesRevision(sesion);

  return (
    <li className="group relative flex flex-col gap-2 px-4 py-3.5 hover:bg-muted/60 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{sesion.estudiante.nombre}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {sesion.estudiante.codigo}
          </span>
          <InsigniaEstado estado={estado} />
          {esperaDias !== null && esperaDias >= 1 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                esperaDias >= 3 ? 'bg-ambar text-lino' : 'bg-muted text-muted-foreground'
              )}
            >
              <Clock3 className="size-3" aria-hidden />
              Espera {esperaDias === 1 ? '1 día' : `${esperaDias} días`}
            </span>
          )}
          {corta && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Zap className="size-3" aria-hidden />
              Muy corta
            </span>
          )}
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
          {sesion.comenzada && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MessagesSquare className="size-3.5" aria-hidden />
                {sesion.intervenciones === 1
                  ? '1 intervención'
                  : `${sesion.intervenciones} intervenciones`}
              </span>
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
        {accionDe(sesion)}
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

function VistaGrupos({
  grupos,
  porEstudiante,
  pagina,
  url,
}: {
  grupos: ResumenGrupo[];
  porEstudiante: boolean;
  pagina: number;
  url: Url;
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
  verTodas,
}: {
  grupo: ResumenGrupo;
  porEstudiante: boolean;
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
              className="size-4 text-muted-foreground transition-transform group-open/grupo:rotate-180"
              aria-hidden
            />
          </span>
        </summary>
        <ul className="divide-y border-t">
          {grupo.sesiones.slice(0, PRACTICAS_POR_GRUPO).map(sesion => (
            <FilaCompacta key={sesion.id} sesion={sesion} porEstudiante={porEstudiante} />
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
}: {
  sesion: SesionDocente;
  porEstudiante: boolean;
}) {
  const estado = estadoVisibleSesion(sesion, 'docente', {
    ultimaActividad: sesion.ultimaActividad,
  });
  const publicada = sesion.retroalimentacion?.publicada ?? false;
  return (
    <li className="group relative flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm hover:bg-muted/50">
      <span className="min-w-0 flex-1">
        {porEstudiante ? (
          <>
            <CodigoCaso codigo={sesion.escenario.codigo} className="mr-2 font-mono text-xs" />
            {sesion.escenario.titulo}
          </>
        ) : (
          <>
            {sesion.estudiante.nombre}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {sesion.estudiante.codigo}
            </span>
          </>
        )}
      </span>
      <span className="text-muted-foreground">{formatearDia(sesion.inicio)}</span>
      <InsigniaEstado estado={estado} />
      {publicada && (
        <span className="w-10 text-right font-semibold tabular-nums">
          {formatearNota(sesion.retroalimentacion?.nota ?? null)}
        </span>
      )}
      <Link
        href={`/sesiones/${sesion.id}`}
        className="font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        {accionDe(sesion)}
        <span className="sr-only">
          : {sesion.estudiante.nombre}, {sesion.escenario.titulo}
        </span>
      </Link>
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
        <span className="text-[0.7rem] text-muted-foreground">{sesiones.length} prácticas</span>
      )}
      <span className="sr-only">
        : {reciente.estudiante.nombre}, {reciente.escenario.titulo}
      </span>
    </Link>
  );
}

function VistaMatriz({ sesiones }: { sesiones: SesionDocente[] }) {
  const { estudiantes, casos, celdas } = matrizRevisiones(sesiones);
  return (
    <section aria-labelledby="matriz-titulo" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="matriz-titulo" className="text-lg font-bold tracking-[-0.01em]">
          Estudiantes × casos
        </h2>
        <p className="text-sm text-muted-foreground">
          Cada celda muestra la práctica más reciente: la nota publicada, si está por revisar o en
          curso. «—» es un caso que aún no ha practicado.
        </p>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="matriz-titulo"
        // `relative`: el texto para lectores de pantalla (sr-only, absoluto) queda dentro del
        // contenedor con scroll y no ensancha la página en el celular.
        className="relative overflow-x-auto rounded-xl border bg-card outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b bg-muted text-xs font-semibold text-muted-foreground">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-muted px-4 py-3 text-left font-semibold"
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
            {estudiantes.map(e => (
              <tr key={e.id} className="hover:bg-muted/40">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-medium"
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
      <p className="text-sm text-muted-foreground tabular-nums">
        {estudiantes.length === 1 ? '1 estudiante' : `${estudiantes.length} estudiantes`} ·{' '}
        {casos.length === 1 ? '1 caso' : `${casos.length} casos`} ·{' '}
        {sesiones.length === 1 ? '1 práctica' : `${sesiones.length} prácticas`}
      </p>
    </section>
  );
}
