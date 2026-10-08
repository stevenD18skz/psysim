import { ClipboardCheck, MonitorPlay, Radio, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';

import { BotonRegistrarEstudiante } from '@/components/estudiantes/boton-registrar';
import { ListaEstudiantes } from '@/components/estudiantes/lista-estudiantes';
import { requerirDocente } from '@/lib/auth/dal';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';

export const metadata: Metadata = {
  title: 'Estudiantes',
};

/**
 * Gestión de estudiantes del docente: los registra con su correo institucional (así entran con
 * Google), les asigna simulaciones con un código de acceso y ve qué sesiones están en progreso o
 * esperan su retroalimentación.
 */
export default async function EstudiantesPage() {
  await requerirDocente();
  const estudiantes = await obtenerEstudiantes();

  const totales = estudiantes.reduce(
    (suma, { metricas }) => ({
      sesiones: suma.sesiones + metricas.sesiones,
      enCurso: suma.enCurso + metricas.enCurso,
      pendientes: suma.pendientes + metricas.pendientesRetroalimentacion,
    }),
    { sesiones: 0, enCurso: 0, pendientes: 0 }
  );

  const indicadores = [
    { icono: UsersRound, etiqueta: 'Estudiantes', valor: estudiantes.length },
    { icono: Radio, etiqueta: 'En progreso ahora', valor: totales.enCurso },
    { icono: ClipboardCheck, etiqueta: 'Por revisar', valor: totales.pendientes },
    { icono: MonitorPlay, etiqueta: 'Sesiones', valor: totales.sesiones },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">Seguimiento</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Estudiantes</h1>
          <p className="max-w-2xl text-muted-foreground">
            Registra a tus estudiantes con su correo institucional, asígnales simulaciones con un
            código de acceso y revisa sus sesiones para darles retroalimentación.
          </p>
        </div>
        {estudiantes.length > 0 && <BotonRegistrarEstudiante />}
      </header>

      {estudiantes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <UsersRound className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Aún no hay estudiantes registrados</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Regístralos con su código, nombre y correo @correounivalle.edu.co. Entrarán con
              «Continuar con Google» y podrás enviarles códigos de acceso.
            </p>
          </div>
          <BotonRegistrarEstudiante />
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
                <dd className="font-heading text-2xl font-semibold tabular-nums">
                  {valor.toLocaleString('es-CO')}
                </dd>
              </div>
            ))}
          </dl>
          <ListaEstudiantes estudiantes={estudiantes} />
        </>
      )}
    </div>
  );
}
