'use client';

import { Search, SearchX, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { AccionesDocente } from '@/components/admin/acciones-docente';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Selector } from '@/components/ui/selector';
import { describirAcceso, filtrarDocentes, type FiltroEstadoDocente } from '@/lib/admin/docentes';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { paginar } from '@/lib/listas';
import { iniciales } from '@/lib/nombres';
import { cn } from '@/lib/utils';
import { type DocenteAdmin } from '@/types';

const FILTROS: { valor: FiltroEstadoDocente; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todas' },
  { valor: 'activos', etiqueta: 'Activas' },
  { valor: 'desactivados', etiqueta: 'Desactivadas' },
];

type OrdenDocentes = 'nombre' | 'pendientes' | 'acceso' | 'estudiantes';

const ORDENES: { valor: OrdenDocentes; etiqueta: string }[] = [
  { valor: 'nombre', etiqueta: 'Nombre (A–Z)' },
  { valor: 'pendientes', etiqueta: 'Más por revisar' },
  { valor: 'acceso', etiqueta: 'Último ingreso' },
  { valor: 'estudiantes', etiqueta: 'Más estudiantes' },
];

/** Cuentas visibles por página para mantener la tabla manejable aunque supere las 100 filas. */
const DOCENTES_POR_PAGINA = 15;

const comparadorNombre = new Intl.Collator('es', { sensitivity: 'base' });

function ordenar(docentes: DocenteAdmin[], orden: OrdenDocentes): DocenteAdmin[] {
  const porNombre = (a: DocenteAdmin, b: DocenteAdmin) =>
    comparadorNombre.compare(a.nombre, b.nombre);
  return [...docentes].sort((a, b) => {
    switch (orden) {
      case 'pendientes':
        return (
          b.metricas.pendientesRetroalimentacion - a.metricas.pendientesRetroalimentacion ||
          porNombre(a, b)
        );
      case 'acceso':
        return (b.ultimoAcceso ?? '').localeCompare(a.ultimoAcceso ?? '') || porNombre(a, b);
      case 'estudiantes':
        return b.metricas.estudiantes - a.metricas.estudiantes || porNombre(a, b);
      default:
        return porNombre(a, b);
    }
  });
}

/** Tabla de las cuentas del equipo docente con búsqueda, filtro por estado y orden. */
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
  const [orden, setOrden] = useState<OrdenDocentes>('nombre');
  const [pagina, setPagina] = useState(1);
  const filtradas = ordenar(filtrarDocentes(docentes, termino, estado), orden);
  const resultado = paginar(filtradas, pagina, DOCENTES_POR_PAGINA);
  const visibles = resultado.visibles;

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <h2 id={`${id}-titulo`} className="text-xl font-bold tracking-[-0.015em]">
          Cuentas
        </h2>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
            {FILTROS.map(filtro => (
              <button
                key={filtro.valor}
                type="button"
                aria-pressed={estado === filtro.valor}
                onClick={() => {
                  setEstado(filtro.valor);
                  setPagina(1);
                }}
                className={cn(
                  'h-9 rounded-full border px-3.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  estado === filtro.valor
                    ? 'border-nogal bg-nogal font-semibold text-lino'
                    : 'bg-card hover:bg-muted'
                )}
              >
                {filtro.etiqueta}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Ordenar por</span>
            <Selector
              valor={orden}
              tamano="sm"
              ariaLabel="Ordenar docentes por"
              opciones={ORDENES}
              className="w-44"
              onChange={nuevo => {
                setOrden(nuevo as OrdenDocentes);
                setPagina(1);
              }}
            />
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
              onChange={evento => {
                setTermino(evento.target.value);
                setPagina(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* `relative`: el texto solo para lectores de pantalla (sr-only, absoluto) queda dentro del
          contenedor con scroll y no ensancha la página en móvil. */}
      <div className="relative overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Docentes y administradores de PsySim</caption>
          <thead className="border-b bg-muted/50 text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase ancho-condensado">
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
                  className={cn(
                    'align-middle transition-colors even:bg-muted/30 hover:bg-muted/60',
                    !docente.activo && 'bg-muted/45 text-muted-foreground'
                  )}
                >
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          docente.activo
                            ? 'bg-salvia-suave text-salvia-oscuro'
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-salvia-suave px-2 py-0.5 text-xs font-medium text-salvia-oscuro">
                              <ShieldCheck className="size-3" aria-hidden />
                              Administrador
                            </span>
                          )}
                          {esPropio && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.75rem] font-medium text-secondary-foreground">
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
                      {metricas.sesiones} {metricas.sesiones === 1 ? 'práctica' : 'prácticas'}
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
                <td colSpan={6} className="px-4 py-4">
                  <EstadoVacio
                    variante="inline"
                    icono={SearchX}
                    titulo="Ninguna cuenta coincide con los filtros"
                    descripcion="Prueba con otro nombre, correo o código, o vuelve a mostrar todas las cuentas."
                    accion={
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEstado('todos');
                          setTermino('');
                          setPagina(1);
                        }}
                      >
                        Mostrar todas las cuentas
                      </Button>
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2">
        <PaginacionLocal
          pagina={resultado}
          onCambiar={setPagina}
          sustantivo={['cuenta', 'cuentas']}
        />
        {filtradas.length < docentes.length && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Filtradas de {docentes.length} cuentas registradas.
          </p>
        )}
      </div>
    </section>
  );
}
