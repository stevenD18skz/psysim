'use client';

import { ArrowRight, ChevronRight, KeyRound, MailPlus, Search } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { AccionesEstudiante } from '@/components/estudiantes/acciones-estudiante';
import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  contarSesiones,
  filtrarEstudiantes,
  formatearDia,
  formatearNota,
} from '@/lib/estudiantes/estudiantes';
import { type EstudianteRegistrado } from '@/types';

/** Tabla de estudiantes con búsqueda por código o nombre. */
export function ListaEstudiantes({ estudiantes }: { estudiantes: EstudianteRegistrado[] }) {
  const id = useId();
  const router = useRouter();
  const [termino, setTermino] = useState('');
  const visibles = filtrarEstudiantes(estudiantes, termino, Infinity);

  /**
   * Abre la ficha al pulsar en cualquier parte de la fila, salvo en sus botones y enlaces, en lo
   * que renderizan por portal (menús y diálogos, cuyos eventos suben por el árbol de React) o al
   * seleccionar texto. Con Ctrl/⌘ la abre en otra pestaña, como un enlace.
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
            Estudiantes registrados con sus sesiones y retroalimentación
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
                Retroalimentación
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                Nota promedio
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
            {visibles.map(estudiante => {
              const {
                id: estudianteId,
                codigo,
                nombre,
                correo,
                cuentaVinculada,
                metricas,
              } = estudiante;
              const ficha = `/estudiantes/${estudianteId}` as const;
              return (
                <tr
                  key={estudianteId}
                  data-testid={`fila-${codigo}`}
                  onClick={evento => abrirFicha(evento, ficha)}
                  className="group/fila cursor-pointer align-middle transition-colors hover:bg-muted/50 has-[a:focus-visible]:bg-muted/50"
                >
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    {/* El enlace sigue ahí para el teclado y los lectores de pantalla; el clic en cualquier punto de la fila hace lo mismo. */}
                    <Link
                      href={ficha}
                      className="block rounded-sm font-medium outline-none group-hover/fila:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {nombre}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{codigo}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {correo ?? 'Sin correo: no puede recibir códigos'}
                    </span>
                  </th>
                  <td className="px-4 py-3 tabular-nums">
                    {contarSesiones(metricas.sesiones)}
                    {metricas.enCurso > 0 && (
                      <InsigniaEstado
                        className="mt-1"
                        estado={{ texto: 'En progreso', tono: 'en-curso' }}
                      />
                    )}
                    {metricas.codigosPendientes > 0 && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <KeyRound className="size-3" aria-hidden />
                        {metricas.codigosPendientes}{' '}
                        {metricas.codigosPendientes === 1 ? 'código sin usar' : 'códigos sin usar'}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {metricas.pendientesRetroalimentacion > 0 ? (
                      <InsigniaEstado
                        estado={{
                          texto: `${metricas.pendientesRetroalimentacion} por revisar`,
                          tono: 'pendiente',
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {metricas.sesiones > metricas.enCurso ? 'Al día' : '—'}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 font-medium tabular-nums lg:table-cell">
                    {formatearNota(metricas.notaPromedio)}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {metricas.ultimaSesion ? formatearDia(metricas.ultimaSesion) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {cuentaVinculada ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/configuracion?estudiante=${codigo}`}>
                            Asignar
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      ) : (
                        <DialogoEstudiante
                          estudiante={estudiante}
                          onGuardado={() => router.refresh()}
                          disparador={
                            <Button size="sm" variant="outline">
                              <MailPlus aria-hidden />
                              Agregar correo
                            </Button>
                          }
                        />
                      )}
                      <AccionesEstudiante estudiante={estudiante} />
                      <ChevronRight
                        className="size-4 text-muted-foreground transition-transform group-hover/fila:translate-x-0.5 group-hover/fila:text-foreground"
                        aria-hidden
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
