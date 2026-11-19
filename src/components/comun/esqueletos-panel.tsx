import type { ReactNode } from 'react';

import { ContenedorHero, SOMBRA_SOBRE_NOGAL } from '@/components/comun/encabezado-pagina';
import { MarcoHeroInicio } from '@/components/inicio/marco-hero';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Siluetas por vista: replican la franja superior de nogal y la primera capa elevada sobre ella sin
 * esperar datos ni importar componentes interactivos.
 */
function Pagina({
  nombre,
  hero,
  sinContenedorHero = false,
  claseContenedor,
  children,
}: {
  nombre: string;
  hero: ReactNode;
  /** Cuando la página sitúa la franja de nogal + indicadores en su propio bloque (`EncabezadoSesion`). */
  sinContenedorHero?: boolean;
  claseContenedor?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-label={`Cargando ${nombre}`} className="flex flex-1 flex-col">
      <span className="sr-only">Cargando {nombre}…</span>
      <div aria-hidden="true" className="flex flex-1 flex-col">
        {hero}
        {sinContenedorHero ? (
          children
        ) : (
          <ContenedorHero className={claseContenedor}>{children}</ContenedorHero>
        )}
      </div>
    </div>
  );
}

function Lineas() {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function HeroPagina({
  titulo,
  volver = false,
  accion = false,
  anchoAccion = 'w-44',
  tonoAccion = 'laton',
  conMeta = false,
  conBordeLateral = true,
  subbarra,
  derecha,
}: {
  titulo?: string;
  volver?: boolean;
  accion?: boolean;
  anchoAccion?: string;
  tonoAccion?: 'laton' | 'contorno';
  conMeta?: boolean;
  conBordeLateral?: boolean;
  subbarra?: ReactNode;
  derecha?: ReactNode;
}) {
  return (
    <MarcoHeroInicio conBordeLateral={conBordeLateral} compacto={Boolean(subbarra) === false}>
      <div className="flex flex-col gap-3">
        {volver && <Skeleton className="h-6 w-28 bg-lino/15" />}
        <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            {titulo ? (
              <h1 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] text-sidebar-foreground sm:text-[2.5rem]">
                {titulo}
              </h1>
            ) : (
              <Skeleton className="h-9 w-3/4 max-w-96 bg-lino/20 sm:h-10" />
            )}
            <Skeleton className="h-5 w-full max-w-2xl bg-lino/15" />
            {conMeta && (
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <Skeleton className="h-6 w-24 rounded-full bg-lino/15" />
                <Skeleton className="h-5 w-40 bg-lino/15" />
                <Skeleton className="h-5 w-32 bg-lino/15" />
              </div>
            )}
          </div>
          {derecha ??
            (accion && (
              <Skeleton
                className={cn(
                  'h-10 shrink-0 rounded-[10px]',
                  anchoAccion,
                  tonoAccion === 'laton'
                    ? 'bg-laton/35'
                    : 'border border-lino/25 bg-sidebar-accent/70'
                )}
              />
            ))}
        </div>
      </div>

      {subbarra && <div className="border-t border-sidebar-border pt-4">{subbarra}</div>}
    </MarcoHeroInicio>
  );
}

function Indicadores({ cantidad = 4, elevada = false }: { cantidad?: number; elevada?: boolean }) {
  const filaAmplia = cantidad >= 5;
  const totalImpar = cantidad % 2 === 1;

  return (
    <div
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-2xl border bg-card',
        filaAmplia ? 'lg:flex lg:divide-x' : 'md:flex md:divide-x',
        elevada && SOMBRA_SOBRE_NOGAL
      )}
    >
      {Array.from({ length: cantidad }, (_, i) => (
        <div
          key={i}
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-2 px-4 py-4 sm:px-5 sm:py-5',
            totalImpar &&
              i === cantidad - 1 &&
              (filaAmplia ? 'col-span-2 lg:col-span-1' : 'col-span-2 md:col-span-1'),
            i % 2 === 1 && (filaAmplia ? 'border-l lg:border-l-0' : 'border-l md:border-l-0'),
            i >= 2 && (filaAmplia ? 'border-t lg:border-t-0' : 'border-t md:border-t-0')
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="mt-0.5 h-4 w-full max-w-28" />
            <Skeleton className="size-7 shrink-0 rounded-lg sm:size-8" />
          </div>
          <Skeleton className="h-8 w-16 sm:h-9" />
          <Skeleton className="h-3.5 w-full max-w-32" />
        </div>
      ))}
    </div>
  );
}

function Campo({ alto = false }: { alto?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Skeleton className="h-4 w-28 max-w-full" />
      <Skeleton className={alto ? 'h-28 w-full' : 'h-10 w-full'} />
    </div>
  );
}

function Filtros({ elevada = false, columnas = 3 }: { elevada?: boolean; columnas?: 3 | 5 }) {
  return (
    <div
      className={cn(
        'grid gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-2 lg:items-end',
        columnas === 5
          ? 'lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]'
          : 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]',
        elevada && SOMBRA_SOBRE_NOGAL
      )}
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <Campo />
      </div>
      {Array.from({ length: columnas - 1 }, (_, i) => (
        <Campo key={i} />
      ))}
    </div>
  );
}

function Pestanas({ enMadera = false, cantidad = 2 }: { enMadera?: boolean; cantidad?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: cantidad }, (_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-10 rounded-lg',
            i === 0 ? 'w-36 max-w-full' : 'w-28',
            enMadera && (i === 0 ? 'border border-sidebar-border bg-sidebar-accent' : 'bg-lino/12')
          )}
        />
      ))}
    </div>
  );
}

function SubbarraResumen({ conDerecha = true }: { conDerecha?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-4 w-32 bg-lino/15" />
        <Skeleton className="h-4 w-28 bg-lino/15" />
      </div>
      {conDerecha && <Skeleton className="h-4 w-36 bg-lino/15" />}
    </div>
  );
}

function SubbarraAccesos({ enlaces = 3 }: { enlaces?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: enlaces }, (_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-lg bg-sidebar-accent/70" />
        ))}
      </div>
      <Skeleton className="h-5 w-40 rounded-full bg-sidebar-accent/70" />
    </div>
  );
}

function Filas({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="@container divide-y overflow-hidden rounded-2xl border bg-card">
      {Array.from({ length: cantidad }, (_, i) => (
        <div
          key={i}
          className="grid gap-3 px-5 py-4 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] @2xl:items-center @2xl:gap-8 @2xl:py-5"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

function Bloque({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Skeleton className="h-6 w-48 max-w-full" />
      {children}
    </div>
  );
}

function TarjetasCasos({ cantidad = 6 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-5/6" />
          <Lineas />
          <div className="flex flex-col gap-2 border-t pt-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Paso({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-40 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </div>
      {children}
    </div>
  );
}

function Conversacion() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-5">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'flex w-5/6 flex-col gap-3 rounded-xl bg-muted/30 p-4',
            i % 2 === 1 && 'self-end'
          )}
        >
          <Skeleton className="h-3 w-24 max-w-full" />
          <Lineas />
        </div>
      ))}
    </div>
  );
}

/** Respaldo neutro para segmentos sin una silueta propia. */
export function EsqueletoPanel() {
  return (
    <Pagina nombre="contenido" hero={<HeroPagina />}>
      <div className={`rounded-2xl border bg-card p-6 ${SOMBRA_SOBRE_NOGAL}`}>
        <Lineas />
      </div>
    </Pagina>
  );
}

function FranjaRejillaInicio() {
  return (
    <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'flex min-w-0 flex-col gap-2 bg-card px-4 py-4 sm:px-5 sm:py-5',
            i === 2 && 'col-span-2 sm:col-span-1'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="mt-0.5 h-4 w-full max-w-28" />
            <Skeleton className="size-7 shrink-0 rounded-lg sm:size-8" />
          </div>
          <Skeleton className="h-8 w-14 sm:h-9" />
          <Skeleton className="h-3.5 w-full max-w-36" />
        </div>
      ))}
    </div>
  );
}

function TarjetaListaInicio({
  filas = 4,
  conBarraCodigo = false,
  elevada = false,
}: {
  filas?: number;
  conBarraCodigo?: boolean;
  elevada?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card',
        elevada && '@5xl/inicio:shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]'
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-36 max-w-full" />
          <Skeleton className="h-5 w-7 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="divide-y border-t">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 px-5 py-3.5 even:bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/3 max-w-48" />
                <Skeleton className="h-3.5 w-1/2 max-w-36" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Skeleton className="h-5 w-20 rounded-full" />
                {conBarraCodigo && <Skeleton className="h-3.5 w-28" />}
              </div>
            </div>
            {conBarraCodigo && <Skeleton className="h-9 w-full rounded-lg" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoInicio() {
  return (
    <div className="@container/inicio flex flex-1 flex-col">
      <Pagina
        nombre="inicio"
        claseContenedor="sm:-mt-16"
        hero={
          <HeroPagina
            derecha={
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <Skeleton className="h-10 w-36 rounded-[10px] border border-lino/25 bg-sidebar-accent/70" />
                <Skeleton className="h-10 w-40 rounded-[10px] bg-laton/35" />
              </div>
            }
            subbarra={<SubbarraAccesos enlaces={4} />}
          />
        }
      >
        <div className="grid items-start gap-6 @5xl/inicio:grid-cols-[minmax(0,1.55fr)_minmax(21.5rem,25.5rem)] @5xl/inicio:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <div className={`overflow-hidden rounded-2xl border bg-card ${SOMBRA_SOBRE_NOGAL}`}>
              <div className="flex items-center justify-between gap-2 border-b bg-muted/25 px-5 py-2.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <FranjaRejillaInicio />
              <div className="flex items-center justify-between gap-2 border-y bg-muted/25 px-5 py-2.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <FranjaRejillaInicio />
            </div>

            <TarjetaListaInicio filas={4} />
            <TarjetaListaInicio filas={4} />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex min-w-0 flex-col gap-4">
              <TarjetaListaInicio filas={2} elevada />
              <div className="grid min-w-0 items-start gap-4 @2xl/inicio:grid-cols-2 @5xl/inicio:grid-cols-1">
                <TarjetaListaInicio filas={2} />
                <TarjetaListaInicio filas={2} conBarraCodigo />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3.5">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex flex-col gap-2 border-t px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-px border-t bg-border">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex flex-col gap-1.5 bg-card px-4 py-3">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Pagina>
    </div>
  );
}

export function EsqueletoConfiguracion() {
  return (
    <Pagina
      nombre="asignación de práctica"
      hero={
        <HeroPagina
          titulo="Asignar práctica"
          accion
          anchoAccion="w-44"
          tonoAccion="contorno"
          subbarra={<SubbarraResumen />}
        />
      }
    >
      <div
        className={`flex flex-col gap-8 rounded-2xl border border-border/80 bg-background p-5 sm:p-7 ${SOMBRA_SOBRE_NOGAL}`}
      >
        <Paso>
          <Pestanas />
          <TarjetasCasos />
        </Paso>
        <Paso>
          <Campo />
        </Paso>
        <Paso>
          <Campo />
        </Paso>
        <div className="flex justify-end rounded-xl border bg-card p-4">
          <Skeleton className="h-11 w-44" />
        </div>
      </div>
    </Pagina>
  );
}

export function EsqueletoCasos() {
  return (
    <Pagina
      nombre="casos"
      hero={<HeroPagina titulo="Casos" accion anchoAccion="w-36" subbarra={<SubbarraResumen />} />}
    >
      <Filtros elevada />
      <Pestanas />
      <TarjetasCasos />
    </Pagina>
  );
}

export function EsqueletoConstructorCaso({ nuevo = false }: { nuevo?: boolean }) {
  return (
    <Pagina
      nombre={nuevo ? 'nuevo caso' : 'edición del caso'}
      hero={<HeroPagina titulo={nuevo ? 'Crear caso' : undefined} volver />}
    >
      <div
        className={`grid items-start gap-8 rounded-2xl border border-border/80 bg-background p-5 sm:p-7 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${SOMBRA_SOBRE_NOGAL}`}
      >
        <div className="flex min-w-0 flex-col gap-8">
          <Paso>
            <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              <Campo />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo />
                <Campo />
              </div>
              <Campo alto />
            </div>
          </Paso>
          <Paso>
            <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo />
                <Campo />
              </div>
              <Campo alto />
            </div>
          </Paso>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
            <Skeleton className="h-6 w-3/4" />
            <Lineas />
            <Lineas />
            <Lineas />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-11 w-40 self-end" />
        </div>
      </div>
    </Pagina>
  );
}

export function EsqueletoEstudiantes() {
  return (
    <Pagina
      nombre="estudiantes"
      hero={
        <HeroPagina
          titulo="Estudiantes"
          accion
          anchoAccion="w-44"
          subbarra={<SubbarraAccesos enlaces={2} />}
        />
      }
    >
      <Indicadores cantidad={5} elevada />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Filtros />
        <Filas cantidad={5} />
      </div>
    </Pagina>
  );
}

export function EsqueletoFichaEstudiante() {
  return (
    <Pagina
      nombre="ficha del estudiante"
      hero={
        <HeroPagina
          volver
          conMeta
          derecha={
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Skeleton className="h-10 w-36 rounded-[10px] border border-lino/25 bg-sidebar-accent/70" />
              <Skeleton className="h-10 w-28 rounded-[10px] border border-lino/25 bg-sidebar-accent/70" />
              <Skeleton className="h-10 w-40 rounded-[10px] bg-laton/35" />
              <Skeleton className="size-10 rounded-[10px] border border-lino/25 bg-sidebar-accent/70" />
            </div>
          }
        />
      }
    >
      <Indicadores elevada />
      <Bloque>
        <Pestanas cantidad={4} />
        <Filas cantidad={3} />
      </Bloque>
      <Bloque>
        <Filas cantidad={2} />
      </Bloque>
    </Pagina>
  );
}

export function EsqueletoDocentes() {
  return (
    <Pagina
      nombre="docentes"
      hero={
        <HeroPagina
          titulo="Docentes"
          accion
          anchoAccion="w-40"
          subbarra={<SubbarraAccesos enlaces={3} />}
        />
      }
    >
      <Indicadores elevada />
      <Filas cantidad={5} />
    </Pagina>
  );
}

export function EsqueletoFichaDocente() {
  return (
    <Pagina
      nombre="ficha del docente"
      hero={<HeroPagina volver conMeta accion anchoAccion="w-32" tonoAccion="contorno" />}
    >
      <div
        className={`grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 ${SOMBRA_SOBRE_NOGAL}`}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
      <Indicadores />
      <Bloque>
        <Filas cantidad={3} />
      </Bloque>
      <Bloque>
        <TarjetasCasos cantidad={2} />
      </Bloque>
    </Pagina>
  );
}

export function EsqueletoRevisiones() {
  return (
    <Pagina
      nombre="revisiones"
      claseContenedor="gap-6"
      hero={
        <HeroPagina
          titulo="Revisiones"
          accion
          anchoAccion="w-36"
          tonoAccion="contorno"
          subbarra={<Pestanas enMadera cantidad={5} />}
        />
      }
    >
      <Filtros elevada columnas={5} />
      <Filas cantidad={5} />
    </Pagina>
  );
}

export function EsqueletoRevision() {
  return (
    <Pagina
      nombre="revisión de la práctica"
      sinContenedorHero
      hero={
        <>
          <HeroPagina
            volver
            conMeta
            derecha={
              <div className="flex items-center gap-1.5">
                <Skeleton className="mr-2 h-4 w-28 bg-lino/15" />
                <Skeleton className="size-9 rounded-lg border border-lino/25 bg-sidebar-accent/70" />
                <Skeleton className="size-9 rounded-lg border border-lino/25 bg-sidebar-accent/70" />
              </div>
            }
          />
          <ContenedorHero className="pb-0 sm:pb-0">
            <Indicadores elevada />
          </ContenedorHero>
        </>
      }
    >
      <div className="mx-auto grid w-full max-w-[1400px] items-start gap-6 px-4 pt-8 pb-10 sm:px-6 sm:pb-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Bloque>
          <Conversacion />
        </Bloque>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
            <Skeleton className="h-6 w-3/4" />
            <Campo alto />
            <Campo />
            <Skeleton className="h-11 w-full" />
          </div>
          <Bloque>
            <Lineas />
          </Bloque>
        </div>
      </div>
    </Pagina>
  );
}

export function EsqueletoPracticas() {
  return (
    <Pagina
      nombre="mis prácticas"
      hero={
        <HeroPagina
          titulo="Mis prácticas"
          conBordeLateral={false}
          derecha={
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-40 rounded-lg border border-sidebar-border bg-sidebar-accent" />
              <Skeleton className="h-7 w-36 rounded-lg border border-sidebar-border bg-sidebar-accent" />
            </div>
          }
        />
      }
    >
      <Indicadores elevada />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <div className="order-2 min-w-0 lg:order-1">
          <Bloque>
            <Filas />
          </Bloque>
        </div>
        <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
            <Skeleton className="h-6 w-3/4" />
            <Lineas />
            <Campo />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
            <Skeleton className="h-5 w-2/3" />
            <Lineas />
            <Lineas />
          </div>
        </div>
      </div>
    </Pagina>
  );
}

export function EsqueletoDetallePractica() {
  return (
    <Pagina
      nombre="detalle de mi práctica"
      sinContenedorHero
      hero={
        <>
          <HeroPagina volver conMeta conBordeLateral={false} />
          <ContenedorHero className="pb-0 sm:pb-0">
            <Indicadores elevada />
          </ContenedorHero>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 pt-8 pb-10 sm:px-6 sm:pb-12">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-5 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-6 w-3/4" />
            <Lineas />
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
        <Bloque>
          <Campo alto />
        </Bloque>
        <Bloque>
          <Conversacion />
        </Bloque>
      </div>
    </Pagina>
  );
}

export function EsqueletoResultados() {
  return (
    <Pagina nombre="resultados de la práctica" hero={<HeroPagina volver conMeta />}>
      <div
        className={`rounded-2xl border border-border/80 bg-background p-5 sm:p-6 ${SOMBRA_SOBRE_NOGAL}`}
      >
        <Bloque>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </Bloque>
      </div>
      <Bloque>
        <Campo alto />
      </Bloque>
      <Bloque>
        <Conversacion />
      </Bloque>
    </Pagina>
  );
}

export function EsqueletoIa() {
  return (
    <Pagina
      nombre="paciente con IA"
      hero={
        <HeroPagina
          titulo="Paciente con IA"
          derecha={
            <div className="flex gap-1 rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-1">
              <Skeleton className="h-8 w-20 rounded-lg bg-lino/20" />
              <Skeleton className="h-8 w-20 rounded-lg bg-transparent" />
              <Skeleton className="h-8 w-20 rounded-lg bg-transparent" />
            </div>
          }
        />
      }
    >
      <div
        className={`flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:p-6 ${SOMBRA_SOBRE_NOGAL}`}
      >
        <Skeleton className="h-6 w-60 max-w-full" />
        <Lineas />
      </div>
      <Indicadores />
      <Bloque>
        <Filas cantidad={2} />
      </Bloque>
      <div className="grid gap-8 lg:grid-cols-2">
        <Bloque>
          <Filas cantidad={2} />
        </Bloque>
        <Bloque>
          <Filas cantidad={2} />
        </Bloque>
      </div>
    </Pagina>
  );
}

export function EsqueletoLaboratorio() {
  return (
    <Pagina
      nombre="herramientas de desarrollo"
      hero={<HeroPagina titulo="Herramientas de desarrollo" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={`flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 ${SOMBRA_SOBRE_NOGAL}`}
        >
          <Skeleton className="size-6" />
          <Skeleton className="h-6 w-5/6" />
          <Lineas />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </Pagina>
  );
}

export function EsqueletoLaboratorioNpc() {
  return (
    <div
      role="status"
      aria-label="Cargando laboratorio de personajes"
      className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh"
    >
      <span className="sr-only">Cargando laboratorio de personajes…</span>
      <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap gap-3 border-b bg-card px-4 py-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 border-b bg-card px-4 py-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="min-h-64 w-full flex-1 rounded-none" />
      </div>
    </div>
  );
}

export function EsqueletoUnirse() {
  return (
    <div
      role="status"
      aria-label="Cargando acceso a la práctica"
      className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16"
    >
      <span className="sr-only">Cargando acceso a la práctica…</span>
      <div
        aria-hidden="true"
        className="flex w-full max-w-xl flex-col gap-7 rounded-2xl border bg-card p-6 sm:p-9"
      >
        <Skeleton className="h-20 w-full" />
        <Lineas />
        <Campo />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}
