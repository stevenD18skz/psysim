'use client';

import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock3,
  KeyRound,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { ConfirmacionAnularCodigo, useAnularCodigo } from '@/components/asignaciones/anular-codigo';
import { BotonCopiar } from '@/components/asignaciones/boton-copiar';
import { BotonEntregarEquipo } from '@/components/asignaciones/boton-entregar-equipo';
import { ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { CodigoCaso } from '@/components/casos/codigo-caso';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { formatearVencimientoCodigo, tiempoRelativo } from '@/lib/fechas';
import { coincideBusqueda, paginar } from '@/lib/listas';
import { type EstadoVisible } from '@/lib/sesiones/estados';
import { cn } from '@/lib/utils';
import { type Asignacion, type EstadoAsignacion } from '@/types';

const VIGENTES_POR_PAGINA = 6;
const HISTORIAL_POR_PAGINA = 10;

const ESTADOS: Record<EstadoAsignacion, EstadoVisible> = {
  pendiente: { texto: 'Sin usar', tono: 'pendiente' },
  usada: { texto: 'Usado', tono: 'listo' },
  anulada: { texto: 'Anulado', tono: 'neutro' },
  vencida: { texto: 'Vencido', tono: 'neutro' },
};

const FILTROS_HISTORIAL: {
  valor: 'todos' | Exclude<EstadoAsignacion, 'pendiente'>;
  etiqueta: string;
}[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'usada', etiqueta: 'Usados' },
  { valor: 'vencida', etiqueta: 'Vencidos' },
  { valor: 'anulada', etiqueta: 'Anulados' },
];

/**
 * Códigos de acceso de un estudiante: los que aún no se han usado se pueden compartir de nuevo
 * (con el mismo mensaje que al generarlos) o anular, con paginación y filtro en historiales largos.
 */
export function ListaCodigos({
  asignaciones,
  estudiante,
  ahora,
}: {
  asignaciones: Asignacion[];
  estudiante: {
    nombre: string;
    correo: string | null;
    codigo?: string;
    cuentaVinculada?: boolean;
  };
  ahora?: Date;
}) {
  const idBusquedaHistorial = useId();
  const [paginaVigentes, setPaginaVigentes] = useState(1);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [estadoHistorial, setEstadoHistorial] = useState<
    'todos' | Exclude<EstadoAsignacion, 'pendiente'>
  >('todos');
  const primerNombre = estudiante.nombre.split(' ')[0] ?? estudiante.nombre;
  const enlaceAsignar =
    estudiante.cuentaVinculada !== false && estudiante.codigo
      ? `/configuracion?estudiante=${estudiante.codigo}`
      : null;

  if (asignaciones.length === 0) {
    return (
      <EstadoVacio
        icono={KeyRound}
        tono="salvia"
        titulo={`Aún no le has asignado prácticas a ${primerNombre}`}
        descripcion="Cuando le asignes un caso clínico, aquí verás el código de un solo uso para compartirlo, reenviarlo o anularlo."
        accion={
          enlaceAsignar ? (
            <Button asChild variant="outline">
              <Link href={enlaceAsignar}>
                Asignar práctica
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  // Los que aún sirven van a la vista; los usados, anulados y vencidos son historial: cada código
  // usado ya aparece como práctica, así que se pliegan para no duplicar la lista.
  const vigentes = asignaciones.filter(a => a.estado === 'pendiente');
  const historial = asignaciones.filter(a => a.estado !== 'pendiente');

  const resultadoVigentes = paginar(vigentes, paginaVigentes, VIGENTES_POR_PAGINA);
  const conteosHistorial = {
    todos: historial.length,
    usada: historial.filter(a => a.estado === 'usada').length,
    vencida: historial.filter(a => a.estado === 'vencida').length,
    anulada: historial.filter(a => a.estado === 'anulada').length,
  };
  const historialFiltrado = historial.filter(
    a =>
      (estadoHistorial === 'todos' || a.estado === estadoHistorial) &&
      coincideBusqueda(busquedaHistorial, a.codigo, a.escenario.codigo, a.escenario.titulo)
  );
  const resultadoHistorial = paginar(historialFiltrado, paginaHistorial, HISTORIAL_POR_PAGINA);

  return (
    <div className="flex flex-col gap-3">
      {vigentes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card">
            {resultadoVigentes.visibles.map(asignacion => (
              <FilaCodigo
                key={asignacion.id}
                asignacion={asignacion}
                estudiante={estudiante}
                ahora={ahora}
              />
            ))}
          </ul>
          <PaginacionLocal
            pagina={resultadoVigentes}
            onCambiar={setPaginaVigentes}
            sustantivo={['código vigente', 'códigos vigentes']}
            soloSiHayVarias
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-card/80">
          <EstadoVacio
            variante="compacto"
            sinBordeSuperior
            icono={CheckCircle2}
            tono="salvia"
            titulo="Sin códigos pendientes por usar"
            descripcion={`Todos los códigos generados para ${primerNombre} ya fueron usados, anulados o vencieron.`}
            accion={
              enlaceAsignar ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={enlaceAsignar}>
                    Asignar nueva práctica
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
      {historial.length > 0 && (
        <details className="group/historial rounded-2xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-medium outline-hidden transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid sm:px-5 [&::-webkit-details-marker]:hidden">
            Historial de códigos
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {historial.length}
            </span>
            <ChevronDown
              className="ml-auto size-4 text-muted-foreground transition-transform duration-300 ease-salida group-open/historial:rotate-180"
              aria-hidden
            />
          </summary>
          {historial.length > 5 && (
            <div className="flex flex-col gap-2.5 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div
                role="group"
                aria-label="Filtrar historial de códigos"
                className="flex flex-wrap gap-1.5"
              >
                {FILTROS_HISTORIAL.map(f => {
                  const activo = estadoHistorial === f.valor;
                  const cantidad = conteosHistorial[f.valor];
                  if (f.valor !== 'todos' && cantidad === 0) return null;
                  return (
                    <button
                      key={f.valor}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => {
                        setEstadoHistorial(f.valor);
                        setPaginaHistorial(1);
                      }}
                      className={cn(
                        'inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                        activo
                          ? 'border-nogal bg-nogal text-lino'
                          : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {f.etiqueta}
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-[0.75rem] tabular-nums',
                          activo ? 'bg-lino/15 text-lino' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {cantidad}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full sm:w-64">
                <label htmlFor={idBusquedaHistorial} className="sr-only">
                  Buscar en historial de códigos
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id={idBusquedaHistorial}
                  type="text"
                  autoComplete="off"
                  placeholder="Código o caso…"
                  className="h-9 pr-8 pl-8.5 text-xs"
                  value={busquedaHistorial}
                  onChange={evento => {
                    setBusquedaHistorial(evento.target.value);
                    setPaginaHistorial(1);
                  }}
                />
                {busquedaHistorial && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda en historial de códigos"
                    onClick={() => {
                      setBusquedaHistorial('');
                      setPaginaHistorial(1);
                    }}
                    className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          )}
          <ul className="flex flex-col divide-y border-t">
            {resultadoHistorial.visibles.map(asignacion => (
              <FilaCodigo
                key={asignacion.id}
                asignacion={asignacion}
                estudiante={estudiante}
                ahora={ahora}
              />
            ))}
            {resultadoHistorial.visibles.length === 0 && (
              <li>
                <EstadoVacio
                  variante="inline"
                  icono={SearchX}
                  titulo="Ningún código coincide con este filtro"
                  descripcion="Prueba con otro término o vuelve a ver todo el historial de códigos."
                  accion={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEstadoHistorial('todos');
                        setBusquedaHistorial('');
                        setPaginaHistorial(1);
                      }}
                    >
                      Mostrar todo el historial
                    </Button>
                  }
                />
              </li>
            )}
          </ul>
          {(historial.length > HISTORIAL_POR_PAGINA ||
            estadoHistorial !== 'todos' ||
            busquedaHistorial.trim().length > 0) && (
            <div className="border-t bg-muted/20 px-4 py-3 sm:px-5">
              <PaginacionLocal
                pagina={resultadoHistorial}
                onCambiar={setPaginaHistorial}
                sustantivo={['código', 'códigos']}
              />
            </div>
          )}
        </details>
      )}
    </div>
  );
}

function FilaCodigo({
  asignacion,
  estudiante,
  ahora,
}: {
  asignacion: Asignacion;
  estudiante: { nombre: string; correo: string | null };
  ahora?: Date;
}) {
  const pendiente = asignacion.estado === 'pendiente';
  const horasRestantes =
    pendiente && ahora
      ? (new Date(asignacion.expiraEn).getTime() - ahora.getTime()) / 3_600_000
      : null;
  const urgente = horasRestantes !== null && horasRestantes < 24;
  const vencimiento =
    pendiente && ahora ? formatearVencimientoCodigo(asignacion.expiraEn, ahora) : null;
  const creadoHace = ahora ? tiempoRelativo(asignacion.creadoEn, ahora) : null;
  const { confirmando, anulando, botonAnular, abrir, cancelar, confirmar } = useAnularCodigo({
    id: asignacion.id,
    codigo: asignacion.codigo,
  });

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/60 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="font-mono text-base font-semibold tracking-wider text-foreground">
              {asignacion.codigo}
            </span>
            {pendiente && (
              <BotonCopiar
                texto={asignacion.codigo}
                etiqueta="Copiar código"
                soloIcono
                size="icon-sm"
                variant="ghost"
              />
            )}
          </span>
          <InsigniaEstado estado={ESTADOS[asignacion.estado]} />
          {vencimiento && (
            <span
              title={`Vence el ${formatearFechaHora(asignacion.expiraEn)}`}
              className={cn(
                'inline-flex items-center gap-1 text-xs tabular-nums',
                urgente
                  ? 'rounded-full bg-ambar-suave px-2 py-0.5 font-semibold text-ambar'
                  : 'text-muted-foreground'
              )}
            >
              <Clock3 className="size-3.5 shrink-0" aria-hidden />
              {vencimiento}
            </span>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
          <CodigoCaso
            codigo={asignacion.escenario.codigo}
            className="font-mono text-xs font-medium text-foreground"
          />
          <span className="font-medium text-foreground/90">{asignacion.escenario.titulo}</span>
          <span aria-hidden>·</span>
          <span
            title={`Generado el ${formatearFechaHora(asignacion.creadoEn)}`}
            className="text-xs tabular-nums"
          >
            {creadoHace
              ? `Generado ${creadoHace}`
              : `Generado el ${formatearFechaHora(asignacion.creadoEn)}`}
          </span>
          {pendiente && !vencimiento && (
            <>
              <span aria-hidden>·</span>
              <span className="text-xs tabular-nums">
                vence el {formatearFechaHora(asignacion.expiraEn)}
              </span>
            </>
          )}
        </p>
      </div>
      {pendiente ? (
        <div className="flex flex-wrap items-center gap-2">
          {confirmando ? (
            <ConfirmacionAnularCodigo
              codigo={asignacion.codigo}
              anulando={anulando}
              onConfirmar={confirmar}
              onCancelar={cancelar}
            />
          ) : (
            <>
              <ReenviarCodigo
                codigo={asignacion.codigo}
                expiraEn={asignacion.expiraEn}
                caso={asignacion.escenario.titulo}
                estudiante={estudiante}
              />
              <BotonEntregarEquipo asignacionId={asignacion.id} estudiante={estudiante.nombre} />
              <Button ref={botonAnular} size="sm" variant="ghost" onClick={abrir}>
                <Ban aria-hidden />
                Anular
              </Button>
            </>
          )}
        </div>
      ) : asignacion.estado === 'usada' && asignacion.sesionId ? (
        <Link
          href={`/sesiones/${asignacion.sesionId}`}
          className="inline-flex w-fit shrink-0 items-center gap-1 rounded-md text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          Ver práctica
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </li>
  );
}
