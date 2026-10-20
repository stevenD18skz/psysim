import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { BotonImprimir } from '@/components/estudiantes/boton-imprimir';
import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { requerirDocente } from '@/lib/auth/dal';
import { codigoVisibleCaso } from '@/lib/escenarios/etiquetas';
import {
  formatearDia,
  formatearFechaHora,
  formatearNota,
  formatearTiempoPractica,
} from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiante } from '@/lib/estudiantes/queries';
import { duracionSesion, estadoCortoSesion } from '@/lib/sesiones/estados';
import { obtenerInformeDeEstudiante } from '@/lib/sesiones/queries';

export async function generateMetadata({
  params,
}: PageProps<'/estudiantes/[id]/notas'>): Promise<Metadata> {
  const { id } = await params;
  const estudiante = z.uuid().safeParse(id).success ? await obtenerEstudiante(id) : null;
  // El navegador usa el título como nombre del archivo al guardar en PDF.
  return { title: estudiante ? `Notas de ${estudiante.nombre}` : 'Notas del estudiante' };
}

/**
 * Informe de notas del estudiante para imprimir o guardar como PDF: indicadores generales, una
 * fila por sesión y la observación general del docente. Solo incluye la retroalimentación ya
 * publicada, igual que la nota promedio. La hoja usa colores fijos (no los del tema) para que
 * se vea igual en el modo oscuro y en el papel.
 */
export default async function NotasEstudiantePage({
  params,
}: PageProps<'/estudiantes/[id]/notas'>) {
  const docente = await requerirDocente();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const estudiante = await obtenerEstudiante(id);
  if (!estudiante) notFound();

  const sesiones = await obtenerInformeDeEstudiante(id);
  const { metricas } = estudiante;
  const publicadas = sesiones.filter(s => s.retroalimentacion?.publicada).length;
  const conObservacion = sesiones.filter(s => s.comentarioGeneral !== null);

  const indicadores = [
    { etiqueta: 'Nota promedio', valor: formatearNota(metricas.notaPromedio), destacado: true },
    {
      etiqueta: 'Prácticas',
      valor: String(metricas.sesiones),
      detalle: `${metricas.finalizadas} finalizadas`,
    },
    {
      etiqueta: 'Tiempo de práctica',
      valor: formatearTiempoPractica(metricas.segundosPractica),
    },
    {
      etiqueta: 'Intervenciones',
      valor: metricas.intervenciones.toLocaleString('es-CO'),
    },
  ];

  return (
    <div className="min-h-svh bg-neutral-100 print:min-h-0 print:bg-white">
      {/* Márgenes de la hoja al imprimir. */}
      <style>{'@page { size: A4; margin: 14mm; }'}</style>

      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href={`/estudiantes/${estudiante.id}`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver a la ficha
          </Link>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Vista previa del informe. En el diálogo de impresión elige «Guardar como PDF».
          </p>
          <div className="ml-auto">
            <BotonImprimir />
          </div>
        </div>
      </div>

      <main className="mx-auto my-6 max-w-[210mm] bg-white p-6 text-neutral-900 shadow-sm ring-1 ring-neutral-200 sm:p-10 print:my-0 print:max-w-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex items-start gap-4 border-b-2 border-[#3a2418] pb-5">
          <LogoUnivalle className="h-16" />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold text-[#3a2418]">
              PsySim · Práctica de entrevista clínica
            </p>
            <h1 className="text-2xl font-bold tracking-[-0.02em]">Informe de notas</h1>
          </div>
          <p className="text-right text-xs text-neutral-600">
            Emitido el {formatearDia(new Date().toISOString())}
            <br />
            por {docente.nombre}
          </p>
        </header>

        <section aria-label="Estudiante" className="mt-6 flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{estudiante.nombre}</h2>
          <p className="flex flex-wrap gap-x-4 text-sm text-neutral-600">
            <span>
              Código: <span className="font-mono text-neutral-900">{estudiante.codigo}</span>
            </span>
            {estudiante.correo && <span>{estudiante.correo}</span>}
          </p>
        </section>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          {indicadores.map(({ etiqueta, valor, destacado, detalle }) => (
            <div
              key={etiqueta}
              className={`flex flex-col gap-0.5 rounded-lg border p-3 ${
                destacado ? 'border-nogal/30 bg-lino' : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <dt className="text-xs font-medium text-neutral-600">{etiqueta}</dt>
              <dd className="text-xl font-semibold tabular-nums">{valor}</dd>
              {detalle && <dd className="text-xs text-neutral-600">{detalle}</dd>}
            </div>
          ))}
        </dl>

        <section aria-labelledby="resumen-titulo" className="mt-8">
          <h2 id="resumen-titulo" className="text-base font-semibold">
            Resumen por práctica
          </h2>
          {sesiones.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-600">
              Aún no ha hecho ninguna práctica.
            </p>
          ) : (
            // En pantallas estrechas la tabla se desplaza dentro de su caja (antes desbordaba la
            // página); en papel ocupa el ancho completo.
            // La caja desplazable es enfocable para que también se recorra con el teclado.
            <div
              className="relative mt-3 overflow-x-auto print:overflow-visible"
              tabIndex={0}
              role="region"
              aria-labelledby="resumen-titulo"
            >
              <table
                aria-labelledby="resumen-titulo"
                className="w-full min-w-[34rem] border-collapse text-sm print:min-w-0"
              >
                <thead>
                  <tr className="border-b border-neutral-300 text-left text-xs text-neutral-600">
                    <th scope="col" className="py-2 pr-2 font-medium">
                      N.º
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Fecha
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Caso
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Duración
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Estado
                    </th>
                    <th scope="col" className="py-2 pl-2 text-right font-medium">
                      Nota
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.map((sesion, indice) => {
                    const duracion = duracionSesion(sesion);
                    const publicada = sesion.retroalimentacion?.publicada ?? false;
                    return (
                      <tr
                        key={sesion.id}
                        className="break-inside-avoid border-b border-neutral-200 align-top"
                      >
                        <td className="py-2 pr-2 text-neutral-600 tabular-nums">{indice + 1}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {formatearFechaHora(sesion.inicio)}
                        </td>
                        <td className="px-2 py-2">
                          <CodigoCaso
                            codigo={sesion.escenario.codigo}
                            className="font-mono text-xs text-neutral-600"
                          />{' '}
                          {sesion.escenario.titulo}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                          {duracion === null ? '—' : formatearTiempoPractica(duracion)}
                        </td>
                        <td className="px-2 py-2">{estadoCortoSesion(sesion)}</td>
                        <td className="py-2 pl-2 text-right whitespace-nowrap tabular-nums">
                          {publicada ? (
                            <span className="font-semibold">
                              {formatearNota(sesion.retroalimentacion?.nota ?? null)}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-500">
                              {sesion.estado === 'en_curso' ? 'En curso' : 'Sin publicar'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {conObservacion.length > 0 && (
          <section aria-labelledby="observaciones-titulo" className="mt-8">
            <h2 id="observaciones-titulo" className="text-base font-semibold">
              Observación general del docente
            </h2>
            <ol className="mt-3 flex flex-col gap-4">
              {conObservacion.map(sesion => (
                <li
                  key={sesion.id}
                  className="break-inside-avoid rounded-lg border border-neutral-200 p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <h3 className="font-medium">
                      {codigoVisibleCaso(sesion.escenario.codigo)} · {sesion.escenario.titulo}
                    </h3>
                    <span className="text-xs text-neutral-600">{formatearDia(sesion.inicio)}</span>
                    <span className="ml-auto text-sm font-semibold tabular-nums">
                      Nota {formatearNota(sesion.retroalimentacion?.nota ?? null)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-neutral-800">
                    {sesion.comentarioGeneral}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="mt-10 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
          {sesiones.length === 1 ? '1 práctica' : `${sesiones.length} prácticas`}, {publicadas} con
          retroalimentación publicada. La nota promedio y las observaciones solo incluyen
          retroalimentación publicada. Informe generado con PsySim.
        </footer>
      </main>
    </div>
  );
}
