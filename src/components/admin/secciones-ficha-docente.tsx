'use client';

import { FileText, Search, SearchX, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { EstadoVacio } from '@/components/comun/estado-vacio';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contarPracticas, formatearDia, formatearNota } from '@/lib/estudiantes/estudiantes';
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
 * Estudiantes y casos propios del docente con búsqueda rápida y paginación independiente para que
 * la ficha siga siendo ágil aunque supere los 100 registros.
 */
export function SeccionesFichaDocente({
  nombreDocente,
  estudiantes,
  casos,
}: {
  nombreDocente: string;
  estudiantes: readonly EstudianteRegistrado[];
  casos: readonly CasoPropioDocente[];
}) {
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

  return (
    <>
      <section aria-labelledby="estudiantes-titulo" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 id="estudiantes-titulo" className="text-xl font-semibold tracking-tight">
              Estudiantes
            </h2>
            {estudiantes.length > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                {estudiantes.length}
              </span>
            )}
          </div>
          {estudiantes.length > UMBRAL_BUSQUEDA && (
            <div className="relative w-full sm:w-72">
              <label htmlFor={idBusquedaEstudiantes} className="sr-only">
                Buscar estudiante
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
                className="pl-9"
                value={busquedaEstudiantes}
                onChange={evento => {
                  setBusquedaEstudiantes(evento.target.value);
                  setPaginaEstudiantes(1);
                }}
              />
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
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
              <table className="w-full text-sm">
                <caption className="sr-only">Estudiantes de {nombreDocente}</caption>
                <thead className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Estudiante
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Prácticas
                    </th>
                    <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                      Nota promedio
                    </th>
                    <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                      Última práctica
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginaEst.visibles.map(estudiante => (
                    <tr
                      key={estudiante.id}
                      className="transition-colors even:bg-muted/30 hover:bg-muted/60"
                    >
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <div className="flex items-center gap-3">
                          <AvatarCuenta
                            avatarId={estudiante.avatarId}
                            nombre={estudiante.nombre}
                            className="size-8 text-xs"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/estudiantes/${estudiante.id}`}
                              className="block font-medium underline-offset-4 hover:underline"
                            >
                              {estudiante.nombre}
                            </Link>
                            <span className="font-mono text-xs text-muted-foreground">
                              {estudiante.codigo}
                            </span>
                            {estudiante.correo && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {estudiante.correo}
                              </span>
                            )}
                          </div>
                        </div>
                      </th>
                      <td className="px-4 py-3 tabular-nums">
                        {contarPracticas(estudiante.metricas.sesiones)}
                        {estudiante.metricas.pendientesRetroalimentacion > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            {estudiante.metricas.pendientesRetroalimentacion} por revisar
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 font-medium tabular-nums sm:table-cell">
                        {formatearNota(estudiante.metricas.notaPromedio)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {estudiante.metricas.ultimaSesion
                          ? formatearDia(estudiante.metricas.ultimaSesion)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  {paginaEst.visibles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4">
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
            <h2 id="casos-titulo" className="text-xl font-semibold tracking-tight">
              Casos propios
            </h2>
            {casos.length > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                {casos.length}
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
                className="pl-9"
                value={busquedaCasos}
                onChange={evento => {
                  setBusquedaCasos(evento.target.value);
                  setPaginaCasos(1);
                }}
              />
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
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs"
                >
                  <FileText className="size-5 shrink-0 text-primary" aria-hidden />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{caso.titulo}</span>
                    <span className="text-xs text-muted-foreground">
                      {caso.codigo} · {formatearDia(caso.creadoEn)}
                      {caso.activo === false && ' · archivado'}
                    </span>
                  </div>
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
    </>
  );
}
