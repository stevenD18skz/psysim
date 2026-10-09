'use client';

import { Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { AccionesDocente } from '@/components/admin/acciones-docente';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Input } from '@/components/ui/input';
import { describirAcceso, filtrarDocentes, type FiltroEstadoDocente } from '@/lib/admin/docentes';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { iniciales } from '@/lib/nombres';
import { cn } from '@/lib/utils';
import { type DocenteAdmin } from '@/types';

const FILTROS: { valor: FiltroEstadoDocente; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todas' },
  { valor: 'activos', etiqueta: 'Activas' },
  { valor: 'desactivados', etiqueta: 'Desactivadas' },
];

/** Tabla de las cuentas del equipo docente con búsqueda y filtro por estado. */
export function ListaDocentes({
  docentes,
  idPropio,
}: {
  docentes: DocenteAdmin[];
  idPropio: string;
}) {
  const id = useId();
  const [termino, setTermino] = useState('');
  const [estado, setEstado] = useState<FiltroEstadoDocente>('todos');
  const visibles = filtrarDocentes(docentes, termino, estado);

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <h2 id={`${id}-titulo`} className="text-xl font-semibold tracking-tight">
          Cuentas
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">
          <div role="group" aria-label="Filtrar por estado" className="flex gap-1.5">
            {FILTROS.map(filtro => (
              <button
                key={filtro.valor}
                type="button"
                aria-pressed={estado === filtro.valor}
                onClick={() => setEstado(filtro.valor)}
                className={cn(
                  'h-8 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  estado === filtro.valor
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted'
                )}
              >
                {filtro.etiqueta}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <label htmlFor={id} className="sr-only">
              Buscar cuenta
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id={id}
              type="search"
              autoComplete="off"
              placeholder="Buscar por nombre, correo o código"
              className="pl-9"
              value={termino}
              onChange={evento => setTermino(evento.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
        <table className="w-full text-sm">
          <caption className="sr-only">Docentes y administradores de PsySim</caption>
          <thead className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Cuenta
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                Acceso
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Actividad
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                Último ingreso
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibles.map(docente => {
              const esPropio = docente.id === idPropio;
              const { metricas } = docente;
              return (
                <tr
                  key={docente.id}
                  className={cn('align-middle', !docente.activo && 'bg-muted/30')}
                >
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          docente.activo
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {iniciales(docente.nombre)}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            href={`/admin/docentes/${docente.id}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {docente.nombre}
                          </Link>
                          {docente.rol === 'superadmin' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              <ShieldCheck className="size-3" aria-hidden />
                              Administrador
                            </span>
                          )}
                          {esPropio && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                              Tú
                            </span>
                          )}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {docente.correo} · {docente.codigoInstitucional}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {describirAcceso(docente)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block tabular-nums">
                      {metricas.estudiantes}{' '}
                      {metricas.estudiantes === 1 ? 'estudiante' : 'estudiantes'}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {metricas.sesiones} {metricas.sesiones === 1 ? 'sesión' : 'sesiones'}
                      {metricas.pendientesRetroalimentacion > 0 &&
                        ` · ${metricas.pendientesRetroalimentacion} por revisar`}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {docente.ultimoAcceso ? formatearDia(docente.ultimoAcceso) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <InsigniaEstado
                      estado={
                        docente.activo
                          ? { texto: 'Activa', tono: 'listo' }
                          : { texto: 'Desactivada', tono: 'neutro' }
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AccionesDocente docente={docente} esPropio={esPropio} />
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Ninguna cuenta coincide con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
