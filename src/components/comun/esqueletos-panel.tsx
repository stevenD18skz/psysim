import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Siluetas por vista: no esperan datos ni importan los componentes interactivos de la página. */
function Pagina({
  nombre,
  children,
  className,
}: {
  nombre: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={`Cargando ${nombre}`}
      className={cn('mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10', className)}
    >
      <span className="sr-only">Cargando {nombre}…</span>
      <div aria-hidden="true" className="flex min-w-0 flex-col gap-8">
        {children}
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

function Encabezado({
  titulo,
  volver = false,
  accion = false,
}: {
  titulo?: string;
  volver?: boolean;
  accion?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {volver && <Skeleton className="h-5 w-32" />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {titulo ? (
            <h1 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.6rem]">
              {titulo}
            </h1>
          ) : (
            <Skeleton className="h-9 w-3/4 max-w-96 sm:h-11" />
          )}
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        {accion && <Skeleton className="h-11 w-44 shrink-0 rounded-[10px]" />}
      </div>
    </div>
  );
}

function Indicadores({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:flex sm:divide-x">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3.5">
          <Skeleton className="h-3.5 w-full max-w-28" />
          <Skeleton className="h-6 w-14" />
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

function Filtros() {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <Campo />
      <Campo />
      <Campo />
    </div>
  );
}

function Pestanas() {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-10 w-40 max-w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

function Filas({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="@container divide-y overflow-hidden rounded-xl border bg-card">
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
    <Pagina nombre="contenido">
      <Encabezado />
      <Lineas />
    </Pagina>
  );
}

export function EsqueletoInicio() {
  return (
    <Pagina nombre="inicio">
      <Encabezado accion />
      <Indicadores />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Bloque>
          <Filas />
        </Bloque>
        <div className="flex min-w-0 flex-col gap-6">
          <Bloque>
            <Filas cantidad={2} />
          </Bloque>
          <Bloque>
            <Filas cantidad={2} />
          </Bloque>
        </div>
      </div>
    </Pagina>
  );
}

export function EsqueletoConfiguracion() {
  return (
    <Pagina nombre="asignación de práctica">
      <Encabezado titulo="Asignar práctica" />
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
    </Pagina>
  );
}

export function EsqueletoCasos() {
  return (
    <Pagina nombre="casos">
      <Encabezado titulo="Casos" accion />
      <Filtros />
      <Pestanas />
      <TarjetasCasos />
    </Pagina>
  );
}

export function EsqueletoConstructorCaso({ nuevo = false }: { nuevo?: boolean }) {
  return (
    <Pagina nombre={nuevo ? 'nuevo caso' : 'edición del caso'} className="py-10">
      <Encabezado titulo={nuevo ? 'Crear caso' : undefined} volver />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
    <Pagina nombre="estudiantes">
      <Encabezado titulo="Estudiantes" accion />
      <Indicadores cantidad={5} />
      <div className="flex flex-col gap-4">
        <Filtros />
        <Filas cantidad={5} />
      </div>
    </Pagina>
  );
}

export function EsqueletoFichaEstudiante() {
  return (
    <Pagina nombre="ficha del estudiante">
      <Encabezado volver accion />
      <Indicadores />
      <Bloque>
        <Pestanas />
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
    <Pagina nombre="docentes">
      <Encabezado titulo="Docentes" accion />
      <Indicadores />
      <Filas cantidad={5} />
    </Pagina>
  );
}

export function EsqueletoFichaDocente() {
  return (
    <Pagina nombre="ficha del docente" className="py-10">
      <Encabezado volver accion />
      <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
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
    <Pagina nombre="revisiones">
      <Encabezado titulo="Revisiones" accion />
      <Pestanas />
      <Filtros />
      <Filas cantidad={5} />
    </Pagina>
  );
}

export function EsqueletoRevision() {
  return (
    <Pagina nombre="revisión de la práctica">
      <Encabezado volver />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
    <Pagina nombre="mis prácticas">
      <Encabezado titulo="Mis prácticas" />
      <Indicadores />
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
    <Pagina nombre="detalle de mi práctica">
      <Encabezado volver />
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
    </Pagina>
  );
}

export function EsqueletoResultados() {
  return (
    <Pagina nombre="resultados de la práctica">
      <Encabezado volver />
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
    <Pagina nombre="paciente con IA">
      <Encabezado titulo="Paciente con IA" accion />
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
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
    <Pagina nombre="herramientas de desarrollo">
      <Encabezado titulo="Herramientas de desarrollo" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
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
