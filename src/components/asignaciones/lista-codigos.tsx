'use client';

import { Ban, ChevronDown, Search } from 'lucide-react';
import { useId, useState } from 'react';

import { ConfirmacionAnularCodigo, useAnularCodigo } from '@/components/asignaciones/anular-codigo';
import { BotonEntregarEquipo } from '@/components/asignaciones/boton-entregar-equipo';
import { ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
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
}: {
  asignaciones: Asignacion[];
  estudiante: { nombre: string; correo: string | null };
}) {
  const idBusquedaHistorial = useId();
  const [paginaVigentes, setPaginaVigentes] = useState(1);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [estadoHistorial, setEstadoHistorial] = useState<
    'todos' | Exclude<EstadoAsignacion, 'pendiente'>
  >('todos');

  if (asignaciones.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-input/50 p-6 text-center text-sm text-muted-foreground">
        Aún no le has asignado prácticas.
      </p>
    );
  }

  // Los que aún sirven van a la vista; los usados, anulados y vencidos son historial: cada código
  // usado ya aparece como práctica, así que se pliegan para no duplicar la lista.
  const vigentes = asignaciones.filter(a => a.estado === 'pendiente');
  const historial = asignaciones.filter(a => a.estado !== 'pendiente');

  const resultadoVigentes = paginar(vigentes, paginaVigentes, VIGENTES_POR_PAGINA);
  const historialFiltrado = historial.filter(
    a =>
      (estadoHistorial === 'todos' || a.estado === estadoHistorial) &&
      coincideBusqueda(busquedaHistorial, a.codigo, a.escenario.titulo)
  );
  const resultadoHistorial = paginar(historialFiltrado, paginaHistorial, HISTORIAL_POR_PAGINA);

  return (
    <div className="flex flex-col gap-3">
      {vigentes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {resultadoVigentes.visibles.map(asignacion => (
              <FilaCodigo key={asignacion.id} asignacion={asignacion} estudiante={estudiante} />
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
        <p className="rounded-xl border border-dashed border-input/50 px-5 py-4 text-sm text-muted-foreground">
          No tiene códigos sin usar.
        </p>
      )}
      {historial.length > 0 && (
        <details className="group/historial rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium outline-hidden hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            Historial de códigos
            <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
              {historial.length}
            </span>
            <ChevronDown
              className="ml-auto size-4 text-muted-foreground transition-transform duration-300 ease-salida group-open/historial:rotate-180"
              aria-hidden
            />
          </summary>
          {historial.length > 8 && (
            <div className="flex flex-col gap-2.5 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                role="group"
                aria-label="Filtrar historial de códigos"
                className="flex flex-wrap gap-1.5"
              >
                {FILTROS_HISTORIAL.map(f => (
                  <button
                    key={f.valor}
                    type="button"
                    aria-pressed={estadoHistorial === f.valor}
                    onClick={() => {
                      setEstadoHistorial(f.valor);
                      setPaginaHistorial(1);
                    }}
                    className={cn(
                      'h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                      estadoHistorial === f.valor
                        ? 'border-nogal bg-nogal text-lino'
                        : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {f.etiqueta}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <label htmlFor={idBusquedaHistorial} className="sr-only">
                  Buscar en historial de códigos
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id={idBusquedaHistorial}
                  type="search"
                  autoComplete="off"
                  placeholder="Código o caso…"
                  className="h-8 pl-8 text-xs"
                  value={busquedaHistorial}
                  onChange={evento => {
                    setBusquedaHistorial(evento.target.value);
                    setPaginaHistorial(1);
                  }}
                />
              </div>
            </div>
          )}
          <ul className="flex flex-col divide-y border-t">
            {resultadoHistorial.visibles.map(asignacion => (
              <FilaCodigo key={asignacion.id} asignacion={asignacion} estudiante={estudiante} />
            ))}
            {resultadoHistorial.visibles.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Ningún código coincide con este filtro.
              </li>
            )}
          </ul>
          {(historial.length > HISTORIAL_POR_PAGINA ||
            estadoHistorial !== 'todos' ||
            busquedaHistorial.trim().length > 0) && (
            <div className="border-t bg-muted/20 px-4 py-3">
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
}: {
  asignacion: Asignacion;
  estudiante: { nombre: string; correo: string | null };
}) {
  const pendiente = asignacion.estado === 'pendiente';
  const { confirmando, anulando, botonAnular, abrir, cancelar, confirmar } = useAnularCodigo({
    id: asignacion.id,
    codigo: asignacion.codigo,
  });

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base font-semibold tracking-wider">
            {asignacion.codigo}
          </span>
          <InsigniaEstado estado={ESTADOS[asignacion.estado]} />
        </div>
        <p className="text-sm text-muted-foreground">
          {asignacion.escenario.titulo} · generado el {formatearFechaHora(asignacion.creadoEn)}
          {pendiente && <> · vence el {formatearFechaHora(asignacion.expiraEn)}</>}
        </p>
      </div>
      {pendiente && (
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
      )}
    </li>
  );
}
