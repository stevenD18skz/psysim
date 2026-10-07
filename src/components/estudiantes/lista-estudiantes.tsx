'use client';

import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  contarSesiones,
  filtrarEstudiantes,
  formatearDia,
  formatearTiempoPractica,
} from '@/lib/estudiantes/estudiantes';
import { type EstudianteRegistrado } from '@/types';

/** Tabla de estudiantes con búsqueda por código o nombre. */
export function ListaEstudiantes({ estudiantes }: { estudiantes: EstudianteRegistrado[] }) {
  const id = useId();
  const [termino, setTermino] = useState('');
  const visibles = filtrarEstudiantes(estudiantes, termino, Infinity);

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <h2 id={`${id}-titulo`} className="text-xl font-semibold tracking-tight">
          Registro
        </h2>
        <div className="relative sm:ml-auto sm:w-80">
          <label htmlFor={id} className="sr-only">
            Buscar estudiante
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={id}
            type="search"
            autoComplete="off"
            placeholder="Buscar por código o nombre"
            className="pl-9"
            value={termino}
            onChange={evento => setTermino(evento.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Estudiantes registrados con sus sesiones y tiempo de práctica
          </caption>
          <thead className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Estudiante
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Sesiones
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                Práctica
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                Casos
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                Intervenciones
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                Última sesión
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibles.map(({ id: estudianteId, codigo, nombre, metricas }) => (
              <tr key={estudianteId} className="align-middle">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <span className="block font-medium">{nombre}</span>
                  <span className="font-mono text-xs text-muted-foreground">{codigo}</span>
                </th>
                <td className="px-4 py-3 tabular-nums">
                  {contarSesiones(metricas.sesiones)}
                  {metricas.finalizadas > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {metricas.finalizadas}{' '}
                      {metricas.finalizadas === 1 ? 'finalizada' : 'finalizadas'}
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 tabular-nums md:table-cell">
                  {formatearTiempoPractica(metricas.segundosPractica)}
                </td>
                <td className="hidden px-4 py-3 tabular-nums lg:table-cell">{metricas.casos}</td>
                <td className="hidden px-4 py-3 tabular-nums lg:table-cell">
                  {metricas.intervenciones.toLocaleString('es-CO')}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {metricas.ultimaSesion ? formatearDia(metricas.ultimaSesion) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/configuracion?estudiante=${codigo}`}>
                      Nueva sesión
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Ningún estudiante coincide con «{termino.trim()}».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
