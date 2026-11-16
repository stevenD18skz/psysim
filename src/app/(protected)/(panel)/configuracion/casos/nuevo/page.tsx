import type { Metadata } from 'next';
import { z } from 'zod';

import { ConstructorCaso } from '@/components/casos/constructor-caso';
import { EncabezadoCaso } from '@/components/casos/encabezado-caso';
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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 sm:px-6">
      <EncabezadoCaso
        titulo={
          casoOrigen ? (
            <>
              <span className="text-muted-foreground">Nuevo caso a partir de</span>{' '}
              {casoOrigen.titulo}
            </>
          ) : (
            'Crear caso'
          )
        }
        descripcion="Completa los campos y el comportamiento del paciente se arma solo. Puedes partir de un caso previo, variar su nivel de dificultad y probarlo antes de guardar."
      />
      <ConstructorCaso
        key={`${casoOrigen?.id ?? 'nuevo'}:${nivelParam}`}
        catalogo={catalogo}
        casoOrigenInicial={casoOrigen}
        valoresIniciales={valoresIniciales}
      />
    </div>
  );
}
