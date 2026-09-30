import type { Metadata } from 'next';

import { requerirDocente } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'Simulación',
};

export default async function SimulacionPage() {
  await requerirDocente();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Simulación</h1>
      <p className="text-muted-foreground">
        Aquí se ejecutará la simulación 3D con el paciente virtual.
      </p>
      <p className="mt-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Esta sección está en construcción.
      </p>
    </section>
  );
}
