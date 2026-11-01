'use client';

import { ArrowRight, ChevronRight, KeyRound, MailPlus } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId } from 'react';

import { AccionesEstudiante } from '@/components/estudiantes/acciones-estudiante';
import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { formatearDia, formatearNota } from '@/lib/estudiantes/estudiantes';
import { type EstudianteRegistrado } from '@/types';

/**
 * Tabla de estudiantes (una página: la búsqueda, los filtros y el orden los aplica la página en el
 * servidor y viven en la URL).
 */
export function ListaEstudiantes({
  estudiantes,
  vacio,
  controles,
}: {
  estudiantes: EstudianteRegistrado[];
  /** Mensaje cuando ningún estudiante coincide con los filtros. */
  vacio: string;
  /** Búsqueda, filtros y orden, junto al título. */
  controles?: React.ReactNode;
}) {
  const id = useId();
  const router = useRouter();
  const visibles = estudiantes;

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
      <div className="flex flex-col gap-3">
        <h2 id={`${id}-titulo`} className="text-xl font-semibold tracking-tight">
          Registro
        </h2>
        {controles}
      </div>

      <div className="relative overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Estudiantes registrados con sus prácticas y retroalimentación
          </caption>
          <thead className="border-b bg-muted/50 text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase ancho-condensado">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Estudiante
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Prácticas
              </th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">
                Retroalimentación
              </th>
              <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">
                Nota promedio
              </th>
              <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                Última práctica
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
                      className="block min-h-6 rounded-sm font-medium outline-hidden group-hover/fila:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {nombre}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{codigo}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {correo ?? 'Sin correo: no puede recibir códigos'}
                    </span>
                  </th>
                  <td className="px-4 py-3 tabular-nums">
                    {metricas.sesiones === 1 ? '1 práctica' : `${metricas.sesiones} prácticas`}
                    {metricas.enCurso > 0 && (
                      <InsigniaEstado
                        className="mt-1"
                        estado={{ texto: 'Practicando ahora', tono: 'en-curso' }}
                      />
                    )}
                    {/* En pantallas pequeñas la columna de retroalimentación no cabe: lo pendiente
                        se muestra aquí. */}
                    {metricas.pendientesRetroalimentacion > 0 && (
                      <InsigniaEstado
                        className="mt-1 md:hidden"
                        estado={{
                          texto: `${metricas.pendientesRetroalimentacion} por revisar`,
                          tono: 'pendiente',
                        }}
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
                  {vacio}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
