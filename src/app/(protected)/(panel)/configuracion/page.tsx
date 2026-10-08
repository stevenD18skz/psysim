import type { Metadata } from 'next';

import { ConfiguradorSesion } from '@/components/configuracion/configurador-sesion';
import { requerirDocente } from '@/lib/auth/dal';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';
import { buscarPorCodigo } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';

export const metadata: Metadata = {
  title: 'Configuración',
};

export default async function ConfiguracionPage({ searchParams }: PageProps<'/configuracion'>) {
  const perfil = await requerirDocente();
  const [escenarios, estudiantes, { caso, estudiante }] = await Promise.all([
    obtenerCatalogoEscenarios(),
    obtenerEstudiantes(),
    searchParams,
  ]);
  // `?estudiante=<código>` llega desde la página de estudiantes ("Nueva sesión").
  const estudianteInicial =
    typeof estudiante === 'string' ? (buscarPorCodigo(estudiantes, estudiante) ?? null) : null;

  const primerNombre = perfil.nombre.split(' ')[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Nueva sesión</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Prepara la simulación</h1>
        <p className="max-w-2xl text-muted-foreground">
          Hola, {primerNombre}. Elige un escenario o un caso tuyo, ajusta al paciente virtual y
          genera un código de acceso para el estudiante: lo hará desde su equipo, con su cuenta.
        </p>
      </header>

      {escenarios.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          No hay escenarios activos por ahora. Contacta al administrador de la plataforma.
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
