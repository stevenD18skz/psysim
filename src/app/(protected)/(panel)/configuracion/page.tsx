import type { Metadata } from 'next';

import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { ConfiguradorSesion } from '@/components/configuracion/configurador-sesion';
import { requerirDocente } from '@/lib/auth/dal';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';
import { buscarPorCodigo } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';

export const metadata: Metadata = {
  title: 'Asignar práctica',
};

export default async function ConfiguracionPage({ searchParams }: PageProps<'/configuracion'>) {
  await requerirDocente();
  const [escenarios, estudiantes, { caso, estudiante }] = await Promise.all([
    obtenerCatalogoEscenarios(),
    obtenerEstudiantes(),
    searchParams,
  ]);
  // `?estudiante=<código>` llega desde la ficha o la lista de estudiantes ("Asignar práctica").
  const estudianteInicial =
    typeof estudiante === 'string' ? (buscarPorCodigo(estudiantes, estudiante) ?? null) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Asignar práctica"
        descripcion="Elige el caso y a quién se lo asignas. Te damos un código de un solo uso para que practique desde su computador."
      />

      {escenarios.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input/50 p-8 text-center text-muted-foreground">
          No hay casos disponibles por ahora. Crea uno propio o avisa al administrador.
        </p>
      ) : (
        <ConfiguradorSesion
          // `key` reinicia el formulario al llegar con otro caso o estudiante preseleccionado.
          key={`${typeof caso === 'string' ? caso : '-'}:${estudianteInicial?.id ?? '-'}`}
          escenarios={escenarios}
          casoInicialId={typeof caso === 'string' ? caso : null}
          estudiantes={estudiantes}
          estudianteInicial={estudianteInicial}
        />
      )}
    </div>
  );
}
