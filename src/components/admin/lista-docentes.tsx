'use client';

import { CheckCircle2, KeyRound, Search, SearchX, ShieldCheck, X } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { AccionesDocente } from '@/components/admin/acciones-docente';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Selector } from '@/components/ui/selector';
import { describirAcceso, filtrarDocentes, type FiltroEstadoDocente } from '@/lib/admin/docentes';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import { paginar } from '@/lib/listas';
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
  ahora,
}: {
  docentes: DocenteAdmin[];
  idPropio: string;
  ahora?: Date;
}) {
  const id = useId();
  const router = useRouter();
  const [termino, setTermino] = useState('');
  const [estado, setEstado] = useState<FiltroEstadoDocente>('todos');
  const [orden, setOrden] = useState<OrdenDocentes>('nombre');
  const [pagina, setPagina] = useState(1);

  const conteoEstados: Record<FiltroEstadoDocente, number> = {
    todos: docentes.length,
    activos: docentes.filter(d => d.activo).length,
    desactivados: docentes.filter(d => !d.activo).length,
  };
  const filtradas = ordenar(filtrarDocentes(docentes, termino, estado), orden);
  const resultado = paginar(filtradas, pagina, DOCENTES_POR_PAGINA);
  const visibles = resultado.visibles;
  const hayFiltros = Boolean(termino.trim() || estado !== 'todos' || orden !== 'nombre');

  const limpiarFiltros = () => {
    setTermino('');
    setEstado('todos');
    setOrden('nombre');
    setPagina(1);
  };

  /**
   * Abre la ficha al pulsar en cualquier parte de la fila, salvo en controles interactivos,
   * portales (menús/diálogos) o al seleccionar texto. Con Ctrl/⌘ la abre en otra pestaña.
   */
  const abrirFicha = (evento: React.MouseEvent<HTMLTableRowElement>, ficha: Route) => {
    const objetivo = evento.target as Node;
    if (!evento.currentTarget.contains(objetivo)) return;
    if (objetivo instanceof Element && objetivo.closest('a, button, input, [role="menuitem"]')) {
      return;
    }
    if (window.getSelection()?.toString()) return;
    if (evento.ctrlKey || evento.metaKey) window.open(ficha, '_blank');
    else router.push(ficha);
  };

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`${id}-titulo`} className="text-xl font-bold tracking-[-0.015em]">
            Cuentas
          </h2>
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {filtradas.length !== docentes.length
              ? `${filtradas.length} de ${docentes.length}`
              : docentes.length}
          </span>
        </div>

        <div className="grid gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_auto_minmax(11.5rem,0.9fr)_auto] lg:items-end">
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
            <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
              Buscar
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={id}
                type="search"
                autoComplete="off"
                placeholder="Nombre, correo o código"
                className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                value={termino}
                onChange={evento => {
                  setTermino(evento.target.value);
                  setPagina(1);
                }}
                onKeyDown={evento => {
                  if (evento.key === 'Escape' && termino) {
                    evento.preventDefault();
                    setTermino('');
                    setPagina(1);
                  }
                }}
              />
              {termino && (
                <button
                  type="button"
                  onClick={() => {
                    setTermino('');
                    setPagina(1);
                  }}
                  aria-label="Borrar la búsqueda"
                  className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Estado</span>
            <PistaSegmentada
              elemento="div"
              role="group"
              aria-label="Filtrar por estado"
              className="flex h-10 items-center gap-1 rounded-[10px] border border-input bg-muted/40 p-1"
              claseIndicador="rounded-lg bg-nogal"
            >
              {FILTROS.map(filtro => {
                const activo = estado === filtro.valor;
                return (
                  <button
                    key={filtro.valor}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => {
                      setEstado(filtro.valor);
                      setPagina(1);
                    }}
                    className={cn(
                      'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-300 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid sm:text-sm',
                      activo
                        ? 'bg-nogal text-lino'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {filtro.etiqueta}
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-xs tabular-nums',
                        activo ? 'bg-lino/15 text-lino' : 'bg-card/80 text-muted-foreground'
                      )}
                    >
                      {conteoEstados[filtro.valor]}
                    </span>
                  </button>
                );
              })}
            </PistaSegmentada>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-orden`} className="text-xs font-medium text-muted-foreground">
              Ordenar por
            </label>
            <Selector
              id={`${id}-orden`}
              valor={orden}
              ariaLabel="Ordenar docentes por"
              opciones={ORDENES}
              onChange={nuevo => {
                setOrden(nuevo as OrdenDocentes);
                setPagina(1);
              }}
            />
          </div>

          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="h-10 cursor-pointer justify-self-start rounded-md px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* `relative`: el texto solo para lectores de pantalla (sr-only, absoluto) queda dentro del
          contenedor con scroll y no ensancha la página en móvil. */}
      <div className="relative overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Docentes y administradores de PsySim</caption>
          <thead className="border-b bg-muted/50 text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase ancho-condensado">
            <tr>
              <th scope="col" className="px-5 py-4 font-semibold">
                Cuenta
              </th>
              <th scope="col" className="hidden px-5 py-4 font-semibold md:table-cell">
                Acceso
              </th>
              <th scope="col" className="px-5 py-4 font-semibold">
                Actividad
              </th>
              <th scope="col" className="hidden px-5 py-4 font-semibold xl:table-cell">
                Retroalimentación
              </th>
              <th scope="col" className="hidden px-5 py-4 font-semibold lg:table-cell">
                Último ingreso
              </th>
              <th scope="col" className="px-5 py-4 font-semibold">
                Estado
              </th>
              <th scope="col" className="px-5 py-4">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibles.map(docente => {
              const esPropio = docente.id === idPropio;
              const { metricas } = docente;
              const ficha = `/admin/docentes/${docente.id}` as const;

              return (
                <tr
                  key={docente.id}
                  onClick={evento => abrirFicha(evento, ficha)}
                  className={cn(
                    'group/fila cursor-pointer align-middle transition-colors even:bg-muted/30 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60',
                    !docente.activo && 'bg-muted/45 text-muted-foreground'
                  )}
                >
                  <th scope="row" className="px-5 py-4 text-left font-normal">
                    <div className="flex items-center gap-3.5">
                      <AvatarCuenta
                        avatarId={docente.avatarId ?? null}
                        nombre={docente.nombre}
                        className={cn(
                          'size-8 text-xs sm:size-10 sm:text-sm',
                          !docente.activo && 'opacity-65 grayscale'
                        )}
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            href={ficha}
                            className="rounded-sm font-semibold underline-offset-4 outline-hidden group-hover/fila:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
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
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Tú
                            </span>
                          )}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="max-w-[16rem] truncate">{docente.correo}</span>
                          <span aria-hidden>·</span>
                          <span className="font-mono">{docente.codigoInstitucional}</span>
                        </span>
                      </div>
                    </div>
                  </th>

                  <td className="hidden px-5 py-4 md:table-cell">
                    {docente.contrasenaTemporal ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ambar-suave px-2.5 py-0.5 text-xs font-medium text-ambar">
                        <KeyRound className="size-3 shrink-0" aria-hidden />
                        Clave temporal
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {describirAcceso(docente)}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 tabular-nums">
                    <span className="block font-medium text-foreground">
                      {metricas.estudiantes}{' '}
                      {metricas.estudiantes === 1 ? 'estudiante' : 'estudiantes'}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {metricas.sesiones} {metricas.sesiones === 1 ? 'práctica' : 'prácticas'}
                      {metricas.casosPropios > 0 &&
                        ` · ${metricas.casosPropios} ${metricas.casosPropios === 1 ? 'caso' : 'casos'}`}
                    </span>
                    {metricas.enCurso > 0 && (
                      <InsigniaEstado
                        className="mt-1"
                        estado={{ texto: `${metricas.enCurso} en curso`, tono: 'en-curso' }}
                      />
                    )}
                    {metricas.pendientesRetroalimentacion > 0 && (
                      <InsigniaEstado
                        className="mt-1 xl:hidden"
                        estado={{
                          texto: `${metricas.pendientesRetroalimentacion} por revisar`,
                          tono: 'pendiente',
                        }}
                      />
                    )}
                  </td>

                  <td className="hidden px-5 py-4 xl:table-cell">
                    {metricas.pendientesRetroalimentacion > 0 ? (
                      <InsigniaEstado
                        estado={{
                          texto: `${metricas.pendientesRetroalimentacion} por revisar`,
                          tono: 'pendiente',
                        }}
                      />
                    ) : metricas.sesiones > metricas.enCurso ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-medium text-salvia-oscuro">
                        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                        Al día
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin prácticas aún</span>
                    )}
                  </td>

                  <td className="hidden px-5 py-4 lg:table-cell">
                    {docente.ultimoAcceso ? (
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        {ahora && (
                          <span className="text-sm font-medium text-foreground/85 first-letter:uppercase">
                            {tiempoRelativo(docente.ultimoAcceso, ahora)}
                          </span>
                        )}
                        <span
                          className={
                            ahora
                              ? 'text-xs text-muted-foreground'
                              : 'text-sm text-muted-foreground'
                          }
                        >
                          {formatearDia(docente.ultimoAcceso)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Aún no ha entrado</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <InsigniaEstado
                      estado={
                        docente.activo
                          ? { texto: 'Activa', tono: 'listo' }
                          : { texto: 'Desactivada', tono: 'neutro' }
                      }
                    />
                  </td>

                  <td className="px-5 py-4 text-right">
                    <AccionesDocente docente={docente} esPropio={esPropio} />
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4">
                  <EstadoVacio
                    variante="inline"
                    icono={SearchX}
                    titulo="Ninguna cuenta coincide con los filtros"
                    descripcion="Prueba con otro nombre, correo o código, o vuelve a mostrar todas las cuentas."
                    accion={
                      <Button type="button" size="sm" variant="outline" onClick={limpiarFiltros}>
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
