import { ClipboardCheck, MonitorPlay, UserCheck, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';

import { BotonNuevoDocente } from '@/components/admin/boton-nuevo-docente';
import { ListaDocentes } from '@/components/admin/lista-docentes';
import { Indicadores } from '@/components/comun/indicadores';
import { requerirSuperadmin } from '@/lib/auth/dal';
import { obtenerDocentes } from '@/lib/admin/queries';

export const metadata: Metadata = {
  title: 'Docentes',
};

/**
 * Panel del Administrador: crea las cuentas de los docentes (con Google o contraseña temporal),
 * las edita, las desactiva o las elimina, y ve la actividad de cada uno.
 */
export default async function AdminPage() {
  const perfil = await requerirSuperadmin();
  const docentes = await obtenerDocentes();

  const totales = docentes.reduce(
    (suma, { activo, metricas }) => ({
      activos: suma.activos + (activo ? 1 : 0),
      estudiantes: suma.estudiantes + metricas.estudiantes,
      sesiones: suma.sesiones + metricas.sesiones,
      pendientes: suma.pendientes + metricas.pendientesRetroalimentacion,
    }),
    { activos: 0, estudiantes: 0, sesiones: 0, pendientes: 0 }
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">Administración</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Docentes</h1>
          <p className="max-w-2xl text-muted-foreground">
            Crea las cuentas de los docentes, decide cómo entran y sigue su actividad. Un
            Administrador también puede preparar simulaciones como cualquier docente.
          </p>
        </div>
        <BotonNuevoDocente />
      </header>

      <Indicadores
        indicadores={[
          { icono: UserCheck, etiqueta: 'Cuentas activas', valor: totales.activos },
          { icono: UsersRound, etiqueta: 'Estudiantes', valor: totales.estudiantes },
          { icono: MonitorPlay, etiqueta: 'Sesiones', valor: totales.sesiones },
          { icono: ClipboardCheck, etiqueta: 'Por revisar', valor: totales.pendientes },
        ]}
      />

      <ListaDocentes docentes={docentes} idPropio={perfil.id} />
    </div>
  );
}
