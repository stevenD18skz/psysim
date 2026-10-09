import { ArrowLeft, ArrowRight, Clock, Mail, MessageSquareText, Pencil, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ListaCodigos } from '@/components/asignaciones/lista-codigos';
import { AccionesEstudiante } from '@/components/estudiantes/acciones-estudiante';
import { EditarEstudiante } from '@/components/estudiantes/editar-estudiante';
import { ListaSesiones } from '@/components/sesiones/lista-sesiones';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearNota, formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiante } from '@/lib/estudiantes/queries';
import {
  obtenerAsignacionesDeEstudiante,
  obtenerSesionesDeEstudiante,
} from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Estudiante',
};

/**
 * Ficha del estudiante para el docente: sus datos y cuenta, los códigos de acceso que le generó
 * (con la opción de anular los que no ha usado) y sus sesiones, con el estado de cada una y el
 * acceso a la revisión.
 */
export default async function EstudiantePage({ params }: PageProps<'/estudiantes/[id]'>) {
  await requerirDocente();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const estudiante = await obtenerEstudiante(id);
  if (!estudiante) notFound();

  const [sesiones, asignaciones] = await Promise.all([
    obtenerSesionesDeEstudiante(id),
    obtenerAsignacionesDeEstudiante(id),
  ]);
  const { metricas } = estudiante;

  const indicadores = [
    {
      icono: MessageSquareText,
      etiqueta: 'Intervenciones',
      valor: metricas.intervenciones.toLocaleString('es-CO'),
    },
    {
      icono: Clock,
      etiqueta: 'Tiempo de práctica',
      valor: formatearTiempoPractica(metricas.segundosPractica),
    },
    { icono: Star, etiqueta: 'Nota promedio', valor: formatearNota(metricas.notaPromedio) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <RefrescoAutomatico activo={metricas.enCurso > 0} />

      <div className="flex flex-col gap-4">
        <Link
          href="/estudiantes"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Estudiantes
        </Link>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {estudiante.nombre}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{estudiante.codigo}</span>
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" aria-hidden />
                {estudiante.correo ?? 'Sin correo institucional'}
              </span>
              <span>
                {estudiante.cuentaVinculada
                  ? '· Entra con Google'
                  : '· Sin cuenta: agrega su correo para enviarle códigos'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EditarEstudiante
              estudiante={estudiante}
              etiqueta={estudiante.correo ? 'Editar' : 'Agregar correo'}
              icono={<Pencil aria-hidden />}
            />
            {estudiante.cuentaVinculada && (
              <Button asChild size="lg">
                <Link href={`/configuracion?estudiante=${estudiante.codigo}`}>
                  Asignar simulación
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
            <AccionesEstudiante estudiante={estudiante} enFicha />
          </div>
        </header>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {indicadores.map(({ icono: Icono, etiqueta, valor }) => (
          <div
            key={etiqueta}
            className="flex flex-col gap-1 rounded-2xl border bg-card p-4 shadow-xs"
          >
            <dt className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Icono className="size-4 text-primary" aria-hidden />
              {etiqueta}
            </dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="sesiones-titulo" className="flex flex-col gap-4">
        <h2 id="sesiones-titulo" className="text-xl font-semibold tracking-tight">
          Sesiones
        </h2>
        <ListaSesiones
          sesiones={sesiones}
          para="docente"
          enlace={sesion => `/sesiones/${sesion.id}`}
          vacio="Aún no ha hecho ninguna simulación. Aparecerá aquí en cuanto use un código de acceso."
        />
      </section>

      <section aria-labelledby="codigos-titulo" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="codigos-titulo" className="text-xl font-semibold tracking-tight">
            Códigos de acceso
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada código sirve una sola vez y solo con la cuenta de este estudiante.
          </p>
        </div>
        <ListaCodigos asignaciones={asignaciones} />
      </section>
    </div>
  );
}
