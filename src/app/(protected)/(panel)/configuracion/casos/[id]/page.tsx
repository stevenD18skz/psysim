import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ConstructorCaso } from '@/components/casos/constructor-caso';
import { EncabezadoCaso } from '@/components/casos/encabezado-caso';
import { requerirDocente } from '@/lib/auth/dal';
import { valoresDeCaso } from '@/lib/casos/valores';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';

export const metadata: Metadata = {
  title: 'Editar caso',
};

export default async function EditarCasoPage({ params }: PageProps<'/configuracion/casos/[id]'>) {
  await requerirDocente();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const catalogo = await obtenerCatalogoEscenarios();
  const caso = catalogo.find(e => e.id === id && e.propio);
  if (!caso) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <EncabezadoCaso
        sobretitulo="Mis casos"
        titulo={`Editar «${caso.titulo}»`}
        descripcion="Los cambios aplican a las sesiones nuevas. Las sesiones ya realizadas conservan el prompt que usaron."
      />
      <ConstructorCaso casoId={caso.id} valoresIniciales={valoresDeCaso(caso)} />
    </div>
  );
}
