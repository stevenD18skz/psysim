'use client';

import { CheckCircle2, FileText, Search, SearchX, UsersRound, X } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  contarPracticas,
  formatearDia,
  formatearNota,
  formatearTiempoPractica,
} from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import { coincideBusqueda, paginar } from '@/lib/listas';
import { type EstudianteRegistrado } from '@/types';

export interface CasoPropioDocente {
  id: string;
  codigo: string;
  titulo: string;
  activo: boolean;
  creadoEn: string;
}

const ESTUDIANTES_POR_PAGINA = 10;
const CASOS_POR_PAGINA = 10;
const UMBRAL_BUSQUEDA = 8;

/**
 * Estudiantes y casos propios en la ficha del docente para el Administrador: con búsqueda y
 * paginación local para soportar docentes con grupos numerosos o decenas de casos sin crecer la
 * página de forma desmedida.
 */
export function SeccionesFichaDocente({
  nombreDocente,
  estudiantes,
  casos,
  ahora,
}: {
  nombreDocente: string;
  estudiantes: EstudianteRegistrado[];
  casos: CasoPropioDocente[];
  ahora?: Date;
}) {
  const router = useRouter();
  const idBusquedaEstudiantes = useId();
  const idBusquedaCasos = useId();
  const [busquedaEstudiantes, setBusquedaEstudiantes] = useState('');
  const [paginaEstudiantes, setPaginaEstudiantes] = useState(1);
  const [busquedaCasos, setBusquedaCasos] = useState('');
  const [paginaCasos, setPaginaCasos] = useState(1);

  const estudiantesFiltrados = estudiantes.filter(e =>
    coincideBusqueda(busquedaEstudiantes, e.nombre, e.codigo, e.correo)
  );
  const paginaEst = paginar(estudiantesFiltrados, paginaEstudiantes, ESTUDIANTES_POR_PAGINA);

  const casosFiltrados = casos.filter(c => coincideBusqueda(busquedaCasos, c.titulo, c.codigo));
  const paginaCas = paginar(casosFiltrados, paginaCasos, CASOS_POR_PAGINA);

  const abrirFichaEstudiante = (evento: React.MouseEvent<HTMLTableRowElement>, ficha: Route) => {
    const objetivo = evento.target as Node;
    if (!evento.currentTarget.contains(objetivo)) return;
    if (objetivo instanceof Element && objetivo.closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    if (evento.ctrlKey || evento.metaKey) window.open(ficha, '_blank');
    else router.push(ficha);
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="estudiantes-titulo" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 id="estudiantes-titulo" className="text-xl font-bold tracking-[-0.015em]">
              Estudiantes
            </h2>
            {estudiantes.length > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                {estudiantesFiltrados.length !== estudiantes.length
                  ? `${estudiantesFiltrados.length} de ${estudiantes.length}`
                  : estudiantes.length}
              </span>
            )}
          </div>
          {estudiantes.length > UMBRAL_BUSQUEDA && (
            <div className="relative w-full sm:w-72">
              <label htmlFor={idBusquedaEstudiantes} className="sr-only">
                Buscar estudiante del docente
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={idBusquedaEstudiantes}
                type="search"
                autoComplete="off"
                placeholder="Buscar por nombre, código o correo"
                className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                value={busquedaEstudiantes}
                onChange={evento => {
                  setBusquedaEstudiantes(evento.target.value);
                  setPaginaEstudiantes(1);
                }}
                onKeyDown={evento => {
                  if (evento.key === 'Escape' && busquedaEstudiantes) {
                    evento.preventDefault();
                    setBusquedaEstudiantes('');
                    setPaginaEstudiantes(1);
                  }
                }}
              />
              {busquedaEstudiantes && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaEstudiantes('');
                    setPaginaEstudiantes(1);
                  }}
                  aria-label="Borrar búsqueda de estudiantes"
                  className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>

        {estudiantes.length === 0 ? (
          <EstadoVacio
            icono={UsersRound}
            titulo="Aún no ha registrado estudiantes"
            descripcion={`Cuando ${nombreDocente.split(' ')[0]} registre estudiantes con su correo institucional, su actividad aparecerá aquí.`}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Estudiantes de {nombreDocente}</caption>
                <thead className="border-b bg-muted/50 text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase ancho-condensado">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-semibold">
                      Estudiante
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">
                      Prácticas
                    </th>
                    <th scope="col" className="hidden px-5 py-3.5 font-semibold md:table-cell">
                      Retroalimentación
                    </th>
                    <th scope="col" className="hidden px-5 py-3.5 font-semibold sm:table-cell">
                      Nota promedio
                    </th>
                    <th scope="col" className="hidden px-5 py-3.5 font-semibold lg:table-cell">
                      Última práctica
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginaEst.visibles.map(estudiante => {
                    const ficha = `/estudiantes/${estudiante.id}` as const;
                    return (
                      <tr
                        key={estudiante.id}
                        onClick={evento => abrirFichaEstudiante(evento, ficha)}
                        className="group/fila cursor-pointer align-middle transition-colors even:bg-muted/30 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60"
                      >
                        <th scope="row" className="px-5 py-3.5 text-left font-normal">
                          <div className="flex items-center gap-3">
                            <AvatarCuenta
                              avatarId={estudiante.avatarId}
                              nombre={estudiante.nombre}
                              className="size-8 text-xs sm:size-9"
                            />
                            <div className="min-w-0">
                              <Link
                                href={ficha}
                                className="block rounded-sm font-semibold underline-offset-4 outline-hidden group-hover/fila:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                              >
                                {estudiante.nombre}
                              </Link>
                              <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                <span className="font-mono">{estudiante.codigo}</span>
                                {estudiante.correo && (
                                  <span className="max-w-[14rem] truncate">
                                    {estudiante.correo}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </th>
                        <td className="px-5 py-3.5 tabular-nums">
                          <span className="block font-medium text-foreground">
                            {contarPracticas(estudiante.metricas.sesiones)}
                          </span>
                          {estudiante.metricas.segundosPractica > 0 && (
                            <span className="block text-xs text-muted-foreground">
                              {formatearTiempoPractica(estudiante.metricas.segundosPractica)}
                            </span>
                          )}
                          {estudiante.metricas.enCurso > 0 && (
                            <InsigniaEstado
                              className="mt-1"
                              estado={{ texto: 'En curso', tono: 'en-curso' }}
                            />
                          )}
                          {estudiante.metricas.pendientesRetroalimentacion > 0 && (
                            <InsigniaEstado
                              className="mt-1 md:hidden"
                              estado={{
                                texto: `${estudiante.metricas.pendientesRetroalimentacion} por revisar`,
                                tono: 'pendiente',
                              }}
                            />
                          )}
                        </td>
                        <td className="hidden px-5 py-3.5 md:table-cell">
                          {estudiante.metricas.pendientesRetroalimentacion > 0 ? (
                            <InsigniaEstado
                              estado={{
                                texto: `${estudiante.metricas.pendientesRetroalimentacion} por revisar`,
                                tono: 'pendiente',
                              }}
                            />
                          ) : estudiante.metricas.sesiones > estudiante.metricas.enCurso ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-medium text-salvia-oscuro">
                              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                              Al día
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin prácticas aún</span>
                          )}
                        </td>
                        <td className="hidden px-5 py-3.5 tabular-nums sm:table-cell">
                          {estudiante.metricas.notaPromedio !== null ? (
                            <span className="text-base font-semibold text-foreground ancho-semiexpandido">
                              {formatearNota(estudiante.metricas.notaPromedio)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-5 py-3.5 lg:table-cell">
                          {estudiante.metricas.ultimaSesion ? (
                            <div className="flex flex-col gap-0.5 tabular-nums">
                              {ahora && (
                                <span className="text-sm font-medium text-foreground/85 first-letter:uppercase">
                                  {tiempoRelativo(estudiante.metricas.ultimaSesion, ahora)}
                                </span>
                              )}
                              <span
                                className={
                                  ahora
                                    ? 'text-xs text-muted-foreground'
                                    : 'text-sm text-muted-foreground'
                                }
                              >
                                {formatearDia(estudiante.metricas.ultimaSesion)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {paginaEst.visibles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4">
                        <EstadoVacio
                          variante="inline"
                          icono={SearchX}
                          titulo="Ningún estudiante coincide con la búsqueda"
                          descripcion="Prueba con otro nombre, código o correo."
                          accion={
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBusquedaEstudiantes('');
                                setPaginaEstudiantes(1);
                              }}
                            >
                              Limpiar búsqueda
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {(estudiantes.length > ESTUDIANTES_POR_PAGINA ||
              busquedaEstudiantes.trim().length > 0) && (
              <PaginacionLocal
                pagina={paginaEst}
                onCambiar={setPaginaEstudiantes}
                sustantivo={['estudiante', 'estudiantes']}
              />
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="casos-titulo" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 id="casos-titulo" className="text-xl font-bold tracking-[-0.015em]">
              Casos propios
            </h2>
            {casos.length > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                {casosFiltrados.length !== casos.length
                  ? `${casosFiltrados.length} de ${casos.length}`
                  : casos.length}
              </span>
            )}
          </div>
          {casos.length > UMBRAL_BUSQUEDA && (
            <div className="relative w-full sm:w-72">
              <label htmlFor={idBusquedaCasos} className="sr-only">
                Buscar caso propio
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={idBusquedaCasos}
                type="search"
                autoComplete="off"
                placeholder="Buscar por título o código"
                className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                value={busquedaCasos}
                onChange={evento => {
                  setBusquedaCasos(evento.target.value);
                  setPaginaCasos(1);
                }}
                onKeyDown={evento => {
                  if (evento.key === 'Escape' && busquedaCasos) {
                    evento.preventDefault();
                    setBusquedaCasos('');
                    setPaginaCasos(1);
                  }
                }}
              />
              {busquedaCasos && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaCasos('');
                    setPaginaCasos(1);
                  }}
                  aria-label="Borrar búsqueda de casos"
                  className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>

        {casos.length === 0 ? (
          <EstadoVacio
            icono={FileText}
            titulo="Aún no ha creado casos propios"
            descripcion="Los casos que diseñe a medida para sus clases aparecerán listados en esta sección."
          />
        ) : paginaCas.visibles.length === 0 ? (
          <EstadoVacio
            icono={SearchX}
            titulo="Ningún caso coincide con la búsqueda"
            descripcion="Prueba con otro título o código."
            accion={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setBusquedaCasos('');
                  setPaginaCasos(1);
                }}
              >
                Limpiar búsqueda
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="grid gap-3 sm:grid-cols-2">
              {paginaCas.visibles.map(caso => (
                <li
                  key={caso.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro"
                    >
                      <FileText className="size-4.5" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-semibold text-foreground">{caso.titulo}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular-nums">
                        <CodigoCaso codigo={caso.codigo} className="font-mono" />
                        <span aria-hidden>·</span>
                        <span>Creado el {formatearDia(caso.creadoEn)}</span>
                      </span>
                    </div>
                  </div>
                  <InsigniaEstado
                    estado={
                      caso.activo === false
                        ? { texto: 'Archivado', tono: 'neutro' }
                        : { texto: 'Activo', tono: 'listo' }
                    }
                  />
                </li>
              ))}
            </ul>
            {(casos.length > CASOS_POR_PAGINA || busquedaCasos.trim().length > 0) && (
              <PaginacionLocal
                pagina={paginaCas}
                onCambiar={setPaginaCasos}
                sustantivo={['caso', 'casos']}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
