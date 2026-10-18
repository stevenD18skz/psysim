import { FilePlus2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { BibliotecaCasos } from '@/components/casos/biblioteca-casos';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';

export const metadata: Metadata = {
  title: 'Casos',
};

/**
 * Biblioteca de casos: los seis de PsySim y los que el docente creó con el constructor guiado.
 * Desde aquí se asigna un caso, se edita uno propio o se crea uno nuevo.
 */
export default async function CasosPage() {
  await requerirDocente();
  const casos = await obtenerCatalogoEscenarios();
  const propios = casos.filter(c => c.propio);
  const dePsySim = casos.filter(c => !c.propio);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Casos"
        descripcion="Cada caso es un paciente con su historia y la competencia que entrena. Usa los de PsySim o crea los tuyos."
        acciones={
          <Button asChild variant="accion" size="lg">
            <Link href="/configuracion/casos/nuevo">
              <FilePlus2 aria-hidden />
              Crear caso
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="mis-casos" className="flex flex-col gap-4">
        <h2 id="mis-casos" className="text-xl font-bold tracking-[-0.015em]">
          Mis casos{' '}
          <span className="text-sm font-semibold text-muted-foreground">{propios.length}</span>
        </h2>
        <BibliotecaCasos
          casos={propios}
          vacio={
            <p className="rounded-xl border border-dashed border-input/50 px-5 py-6 text-sm text-muted-foreground">
              Aún no has creado casos. Con el constructor guiado defines al paciente, su motivo de
              consulta y cómo se comporta, sin escribir instrucciones técnicas.{' '}
              <Link
                href="/configuracion/casos/nuevo"
                className="font-medium text-foreground underline"
              >
                Crear el primero
              </Link>
            </p>
          }
        />
      </section>

      <section aria-labelledby="casos-psysim" className="flex flex-col gap-4">
        <h2 id="casos-psysim" className="text-xl font-bold tracking-[-0.015em]">
          Casos de PsySim{' '}
          <span className="text-sm font-semibold text-muted-foreground">{dePsySim.length}</span>
        </h2>
        <BibliotecaCasos casos={dePsySim} />
      </section>
    </div>
  );
}
