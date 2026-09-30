import type { Metadata } from 'next';

import { ConfiguradorSesion } from '@/components/configuracion/configurador-sesion';
import { requerirDocente } from '@/lib/auth/dal';
import {
  obtenerCatalogoEscenarios,
  obtenerConfiguracionesGuardadas,
} from '@/lib/escenarios/queries';

export const metadata: Metadata = {
  title: 'Configuración',
};

export default async function ConfiguracionPage() {
  const perfil = await requerirDocente();
  const [escenarios, configuraciones] = await Promise.all([
    obtenerCatalogoEscenarios(),
    obtenerConfiguracionesGuardadas(),
  ]);

  const primerNombre = perfil.nombre.split(' ')[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Nueva sesión</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Prepara la simulación</h1>
        <p className="max-w-2xl text-muted-foreground">
          Hola, {primerNombre}. Elige un escenario, ajusta al paciente virtual e ingresa los datos
          del estudiante que va a practicar.
        </p>
      </header>

      {escenarios.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          No hay escenarios activos por ahora. Contacta al administrador de la plataforma.
        </p>
      ) : (
        <ConfiguradorSesion escenarios={escenarios} configuracionesIniciales={configuraciones} />
      )}
    </div>
  );
}
