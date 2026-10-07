import { ArrowRight, Clock, MessageSquareText, MonitorPlay, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ListaEstudiantes } from '@/components/estudiantes/lista-estudiantes';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';

export const metadata: Metadata = {
  title: 'Estudiantes',
};

/**
 * Estudiantes registrados por el docente con sus métricas básicas. Se registran solos al iniciar
 * su primera sesión; desde aquí se prepara una nueva sesión para cualquiera de ellos.
 */
export default async function EstudiantesPage() {
  await requerirDocente();
  const estudiantes = await obtenerEstudiantes();

  const totales = estudiantes.reduce(
    (suma, { metricas }) => ({
      sesiones: suma.sesiones + metricas.sesiones,
      segundos: suma.segundos + metricas.segundosPractica,
      intervenciones: suma.intervenciones + metricas.intervenciones,
    }),
    { sesiones: 0, segundos: 0, intervenciones: 0 }
  );

  const indicadores = [
    { icono: UsersRound, etiqueta: 'Estudiantes', valor: String(estudiantes.length) },
    { icono: MonitorPlay, etiqueta: 'Sesiones', valor: String(totales.sesiones) },
    {
      icono: Clock,
      etiqueta: 'Tiempo de práctica',
      valor: formatearTiempoPractica(totales.segundos),
    },
    {
      icono: MessageSquareText,
      etiqueta: 'Intervenciones',
      valor: totales.intervenciones.toLocaleString('es-CO'),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Seguimiento</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Estudiantes</h1>
        <p className="max-w-2xl text-muted-foreground">
          Cada estudiante queda registrado al iniciar su primera sesión. Cuando vuelva a practicar,
          búscalo por su código o nombre al preparar la sesión.
        </p>
      </header>

      {estudiantes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <UsersRound className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Aún no hay estudiantes registrados</h2>
            <p className="text-sm text-muted-foreground">
              Aparecerán aquí en cuanto prepares su primera sesión.
            </p>
          </div>
          <Button asChild>
            <Link href="/configuracion">
              Preparar una sesión
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          <ListaEstudiantes estudiantes={estudiantes} />
        </>
      )}
    </div>
  );
}
