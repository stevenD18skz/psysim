'use client';

import { CheckCircle2, ClipboardPlus, KeyRound, MailPlus } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId } from 'react';

import { AccionesEstudiante } from '@/components/estudiantes/acciones-estudiante';
import { DialogoEstudiante } from '@/components/estudiantes/dialogo-estudiante';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import {
  formatearDia,
  formatearNota,
  formatearTiempoPractica,
} from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import { type EstudianteRegistrado } from '@/types';

/**
 * Tabla de estudiantes (una página: la búsqueda, los filtros y el orden los aplica la página en el
 * servidor y viven en la URL).
 */
export function ListaEstudiantes({
  estudiantes,
  totalFiltrados,
  totalEstudiantes,
  ahora,
  vacio,
  controles,
}: {
  estudiantes: EstudianteRegistrado[];
  totalFiltrados?: number;
  totalEstudiantes?: number;
  ahora?: Date;
  /** Mensaje cuando ningún estudiante coincide con los filtros. */
  vacio: React.ReactNode;
  /** Búsqueda, filtros y orden, junto al título. */
  controles?: React.ReactNode;
}) {
  const id = useId();
  const router = useRouter();
  const visibles = estudiantes;
  const mostrandoTotal = totalFiltrados ?? visibles.length;
  const filtrado = totalEstudiantes !== undefined && mostrandoTotal !== totalEstudiantes;

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
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`${id}-titulo`} className="text-xl font-bold tracking-[-0.015em]">
            Registro
          </h2>
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {filtrado ? `${mostrandoTotal} de ${totalEstudiantes}` : mostrandoTotal}
          </span>
        </div>
        {controles}
      </div>

      <div className="relative overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Estudiantes registrados con sus prácticas y retroalimentación
          </caption>
          <thead className="border-b bg-muted/50 text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase ancho-condensado">
            <tr>
              <th scope="col" className="px-5 py-4 font-semibold">
                Estudiante
              </th>
              <th scope="col" className="px-5 py-4 font-semibold">
                Prácticas
              </th>
              <th scope="col" className="hidden px-5 py-4 font-semibold md:table-cell">
                Retroalimentación
              </th>
              <th scope="col" className="hidden px-5 py-4 font-semibold lg:table-cell">
                Nota promedio
              </th>
              <th scope="col" className="hidden px-5 py-4 font-semibold sm:table-cell">
                Última práctica
              </th>
              <th scope="col" className="px-5 py-4">
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
                avatarId,
                correo,
                cuentaVinculada,
                metricas,
                docente,
              } = estudiante;
              const ficha = `/estudiantes/${estudianteId}` as const;
              return (
                <tr
                  key={estudianteId}
                  data-testid={`fila-${codigo}`}
                  onClick={evento => abrirFicha(evento, ficha)}
                  className="group/fila cursor-pointer align-middle transition-colors even:bg-muted/30 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60"
                >
                  <th scope="row" className="px-5 py-4 text-left font-normal">
                    <div className="flex items-center gap-3.5">
                      <AvatarCuenta
                        avatarId={avatarId}
                        nombre={nombre}
                        className="size-8 text-xs sm:size-10 sm:text-sm"
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {/* El enlace sigue ahí para el teclado y los lectores de pantalla; el clic en cualquier punto de la fila hace lo mismo. */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={ficha}
                            className="block min-h-6 rounded-sm font-semibold underline-offset-4 outline-hidden group-hover/fila:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                          >
                            {nombre}
                          </Link>
                          {!cuentaVinculada && (
                            <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
                              {correo ? 'Sin entrar' : 'Sin correo'}
                            </span>
                          )}
                        </div>
                        <span className="flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
                          <span className="font-mono">{codigo}</span>
                          <span className="max-w-[16rem] truncate">
                            {correo ?? 'Agrega su correo institucional para asignarle prácticas'}
                          </span>
                        </span>
                        {docente && (
                          <span className="block truncate text-xs text-muted-foreground">
                            Docente:{' '}
                            <span className="font-medium text-foreground">{docente.nombre}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                  <td className="px-5 py-4 tabular-nums">
                    <span className="block font-medium text-foreground">
                      {metricas.sesiones === 1 ? '1 práctica' : `${metricas.sesiones} prácticas`}
                    </span>
                    {metricas.segundosPractica > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {formatearTiempoPractica(metricas.segundosPractica)} acumulados
                      </span>
                    )}
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
                  <td className="hidden px-5 py-4 md:table-cell">
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
                  <td className="hidden px-5 py-4 tabular-nums lg:table-cell">
                    {metricas.notaPromedio !== null ? (
                      <span className="text-base font-semibold text-foreground ancho-semiexpandido">
                        {formatearNota(metricas.notaPromedio)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    {metricas.ultimaSesion ? (
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        {ahora && (
                          <span className="text-sm font-medium text-foreground/85 first-letter:uppercase">
                            {tiempoRelativo(metricas.ultimaSesion, ahora)}
                          </span>
                        )}
                        <span
                          className={
                            ahora
                              ? 'text-xs text-muted-foreground'
                              : 'text-sm text-muted-foreground'
                          }
                        >
                          {formatearDia(metricas.ultimaSesion)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {cuentaVinculada ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/configuracion?estudiante=${codigo}`}>
                            Asignar
                            <ClipboardPlus aria-hidden />
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
