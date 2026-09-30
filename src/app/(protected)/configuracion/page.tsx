import type { Metadata } from 'next';

import { requerirDocente } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'Configuración',
};

export default async function ConfiguracionPage() {
  const perfil = await requerirDocente();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Configuración del escenario</h1>
      <p className="text-muted-foreground">
        Hola, {perfil.nombre}. Aquí podrás seleccionar el escenario clínico, ajustar el
        comportamiento del paciente virtual e ingresar los datos del estudiante.
      </p>
      <p className="mt-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Esta sección está en construcción.
      </p>
    </section>
  );
}
