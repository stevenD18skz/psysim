import type { Metadata } from 'next';

import { BotonNuevoDocente } from '@/components/admin/boton-nuevo-docente';
import { ListaDocentes } from '@/components/admin/lista-docentes';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Docentes"
        descripcion="Crea las cuentas de los docentes, decide cómo entran y sigue su actividad. Como administrador, también trabajas como docente."
        acciones={<BotonNuevoDocente />}
      />

      <Indicadores
        indicadores={[
          { etiqueta: 'Cuentas activas', valor: totales.activos },
          { etiqueta: 'Estudiantes', valor: totales.estudiantes },
          { etiqueta: 'Prácticas', valor: totales.sesiones },
          { etiqueta: 'Por revisar', valor: totales.pendientes },
        ]}
      />

      <ListaDocentes docentes={docentes} idPropio={perfil.id} />
    </div>
  );
}
