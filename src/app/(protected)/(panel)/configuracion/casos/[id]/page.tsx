import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ConstructorCaso } from '@/components/casos/constructor-caso';
import { EncabezadoCaso } from '@/components/casos/encabezado-caso';
import { ContenedorHero, SOMBRA_SOBRE_NOGAL } from '@/components/comun/encabezado-pagina';
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
    <div className="flex flex-1 flex-col">
      <EncabezadoCaso
        titulo={
          <>
            <span className="text-sidebar-muted">Editar</span> {caso.titulo}
          </>
        }
        descripcion="Los cambios valen para las prácticas que asignes desde ahora. Las ya asignadas conservan su copia del caso."
      />
      <ContenedorHero>
        <div
          className={`rounded-2xl border border-border/80 bg-background p-5 sm:p-7 ${SOMBRA_SOBRE_NOGAL}`}
        >
          <ConstructorCaso casoId={caso.id} valoresIniciales={valoresDeCaso(caso)} />
        </div>
      </ContenedorHero>
    </div>
  );
}
