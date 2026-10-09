import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LogIn,
  Mail,
  MonitorPlay,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { AccionesDocente } from '@/components/admin/acciones-docente';
import { Indicadores } from '@/components/comun/indicadores';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { describirAcceso } from '@/lib/admin/docentes';
import { obtenerFichaDocente } from '@/lib/admin/queries';
import { requerirSuperadmin } from '@/lib/auth/dal';
import { contarSesiones, formatearDia, formatearNota } from '@/lib/estudiantes/estudiantes';

export const metadata: Metadata = {
  title: 'Docente',
};

/**
 * Ficha de un docente para el Administrador: cómo entra, su actividad, sus estudiantes (con sus
 * métricas) y sus casos propios. Es de solo lectura: las conversaciones y la retroalimentación
 * siguen siendo del docente.
 */
export default async function DocentePage({ params }: PageProps<'/admin/docentes/[id]'>) {
  const perfil = await requerirSuperadmin();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const ficha = await obtenerFichaDocente(id);
  if (!ficha) notFound();
  const { docente, estudiantes, casos } = ficha;
  const { metricas } = docente;

  const datos = [
    { icono: Mail, etiqueta: 'Correo', valor: docente.correo },
    { icono: LogIn, etiqueta: 'Acceso', valor: describirAcceso(docente) },
    {
      icono: CalendarDays,
      etiqueta: 'Último ingreso',
      valor: docente.ultimoAcceso ? formatearDia(docente.ultimoAcceso) : 'Nunca',
    },
    { icono: CalendarDays, etiqueta: 'Cuenta creada', valor: formatearDia(docente.creadoEn) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Docentes
        </Link>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <InsigniaEstado
                estado={
                  docente.activo
                    ? { texto: 'Activa', tono: 'listo' }
                    : { texto: 'Desactivada', tono: 'neutro' }
                }
              />
              {docente.rol === 'superadmin' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  Administrador
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{docente.nombre}</h1>
            <p className="font-mono text-sm text-muted-foreground">{docente.codigoInstitucional}</p>
          </div>
          <AccionesDocente docente={docente} esPropio={docente.id === perfil.id} enFicha />
        </header>
      </div>

      <dl className="grid gap-x-6 gap-y-4 rounded-2xl border bg-card p-5 shadow-xs sm:grid-cols-2">
        {datos.map(({ icono: Icono, etiqueta, valor }) => (
          <div key={etiqueta} className="flex items-start gap-3">
            <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex min-w-0 flex-col">
              <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
              <dd className="font-medium break-words">{valor}</dd>
            </div>
          </div>
        ))}
      </dl>

      <Indicadores
        indicadores={[
          { icono: UsersRound, etiqueta: 'Estudiantes', valor: metricas.estudiantes },
          { icono: MonitorPlay, etiqueta: 'Sesiones', valor: metricas.sesiones },
          {
            icono: ClipboardCheck,
            etiqueta: 'Por revisar',
            valor: metricas.pendientesRetroalimentacion,
          },
          { icono: FileText, etiqueta: 'Casos propios', valor: metricas.casosPropios },
        ]}
      />

      <section aria-labelledby="estudiantes-titulo" className="flex flex-col gap-4">
        <h2 id="estudiantes-titulo" className="text-xl font-semibold tracking-tight">
          Estudiantes
        </h2>
        {estudiantes.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aún no ha registrado estudiantes.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
            <table className="w-full text-sm">
              <caption className="sr-only">Estudiantes de {docente.nombre}</caption>
              <thead className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estudiante
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Sesiones
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                    Nota promedio
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                    Última sesión
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {estudiantes.map(estudiante => (
                  <tr key={estudiante.id}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <span className="block font-medium">{estudiante.nombre}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {estudiante.codigo}
                      </span>
                    </th>
                    <td className="px-4 py-3 tabular-nums">
                      {contarSesiones(estudiante.metricas.sesiones)}
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
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="casos-titulo" className="flex flex-col gap-4">
        <h2 id="casos-titulo" className="text-xl font-semibold tracking-tight">
          Casos propios
        </h2>
        {casos.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aún no ha creado casos propios.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {casos.map(caso => (
              <li
                key={caso.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs"
              >
                <FileText className="size-5 shrink-0 text-primary" aria-hidden />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{caso.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    {caso.codigo} · {formatearDia(caso.creadoEn)}
                    {!caso.activo && ' · archivado'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
