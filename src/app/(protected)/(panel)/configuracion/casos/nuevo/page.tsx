import type { Metadata } from 'next';
import { z } from 'zod';

import { ConstructorCaso } from '@/components/casos/constructor-caso';
import { EncabezadoCaso } from '@/components/casos/encabezado-caso';
import { ContenedorHero, SOMBRA_SOBRE_NOGAL } from '@/components/comun/encabezado-pagina';
import { requerirDocente } from '@/lib/auth/dal';
import { valoresDesdePlantilla } from '@/lib/casos/valores';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';
import { leerOpcion } from '@/lib/listas';

export const metadata: Metadata = {
  title: 'Nuevo caso',
};

const NIVELES = ['', 'basico', 'intermedio', 'avanzado'] as const;

export default async function NuevoCasoPage({
  searchParams,
}: PageProps<'/configuracion/casos/nuevo'>) {
  await requerirDocente();
  const [parametros, catalogo] = await Promise.all([searchParams, obtenerCatalogoEscenarios()]);

  const desdeId =
    typeof parametros.desde === 'string' && z.uuid().safeParse(parametros.desde).success
      ? parametros.desde
      : null;
  const nivelParam = leerOpcion(parametros.nivel, NIVELES, '');
  const casoOrigen = desdeId ? (catalogo.find(c => c.id === desdeId) ?? null) : null;
  const valoresIniciales = casoOrigen
    ? valoresDesdePlantilla(casoOrigen, nivelParam || undefined)
    : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoCaso
        titulo={
          casoOrigen ? (
            <>
              <span className="text-sidebar-muted">Nuevo caso a partir de</span> {casoOrigen.titulo}
            </>
          ) : (
            'Crear caso'
          )
        }
        descripcion="Completa los campos y el comportamiento del paciente se arma solo. Puedes partir de un caso previo, variar su nivel de dificultad y probarlo antes de guardar."
      />
      <ContenedorHero>
        <div
          className={`rounded-2xl border border-border/80 bg-background p-5 sm:p-7 ${SOMBRA_SOBRE_NOGAL}`}
        >
          <ConstructorCaso
            key={`${casoOrigen?.id ?? 'nuevo'}:${nivelParam}`}
            catalogo={catalogo}
            casoOrigenInicial={casoOrigen}
            valoresIniciales={valoresIniciales}
          />
        </div>
      </ContenedorHero>
    </div>
  );
}
