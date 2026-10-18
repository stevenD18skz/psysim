import { FilePlus2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { BibliotecaCasos, type UsoCaso } from '@/components/casos/biblioteca-casos';
import { BusquedaLista, QuitarFiltros, SelectorLista } from '@/components/comun/controles-lista';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Button } from '@/components/ui/button';
import { requerirDocente } from '@/lib/auth/dal';
import { ETIQUETA_CATEGORIA, ETIQUETA_DIFICULTAD } from '@/lib/escenarios/etiquetas';
import { obtenerCatalogoEscenarios } from '@/lib/escenarios/queries';
import { coincideBusqueda, leerOpcion, leerTexto } from '@/lib/listas';
import { estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerAsignacionesPorCaso, obtenerSesionesDelDocente } from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Casos',
};

const CATEGORIAS = ['', 'clinico', 'cotidiano'] as const;
const NIVELES = ['', 'basico', 'intermedio', 'avanzado'] as const;

/**
 * Biblioteca de casos: los seis de PsySim y los que el docente creó con el constructor guiado.
 * Desde aquí se asigna un caso, se edita uno propio o se crea uno nuevo. Con muchos casos propios
 * se buscan y se filtran por categoría y nivel; cada ficha dice cuánto se ha usado.
 */
export default async function CasosPage({ searchParams }: PageProps<'/configuracion/casos'>) {
  await requerirDocente();
  const [parametros, casos, asignaciones, sesiones] = await Promise.all([
    searchParams,
    obtenerCatalogoEscenarios(),
    obtenerAsignacionesPorCaso(),
    obtenerSesionesDelDocente(),
  ]);

  const consulta = leerTexto(parametros.q);
  const categoria = leerOpcion(parametros.categoria, CATEGORIAS, '');
  const nivel = leerOpcion(parametros.nivel, NIVELES, '');
  const visibles = casos.filter(
    c =>
      (!categoria || c.categoria === categoria) &&
      (!nivel || c.dificultad === nivel) &&
      coincideBusqueda(consulta, c.titulo, c.codigo, c.npc.nombre, c.competenciaCentral)
  );
  const propios = visibles.filter(c => c.propio);
  const dePsySim = visibles.filter(c => !c.propio);
  const hayFiltros = Boolean(consulta || categoria || nivel);

  const porRevisar = new Map<string, number>();
  for (const s of sesiones.filter(estaPorRevisar)) {
    porRevisar.set(s.escenario.codigo, (porRevisar.get(s.escenario.codigo) ?? 0) + 1);
  }
  const uso: Record<string, UsoCaso> = Object.fromEntries(
    casos.map(c => [
      c.id,
      { asignaciones: asignaciones.get(c.id) ?? 0, porRevisar: porRevisar.get(c.codigo) ?? 0 },
    ])
  );
  const totalPropios = casos.filter(c => c.propio).length;

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

      <div className="-mt-4 grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-medium text-muted-foreground">Buscar</span>
          <BusquedaLista etiqueta="Buscar caso" placeholder="Título, paciente o competencia" />
        </div>
        <SelectorLista
          etiqueta="Categoría"
          parametro="categoria"
          defecto=""
          opciones={[
            { valor: '', etiqueta: 'Todas' },
            { valor: 'clinico', etiqueta: ETIQUETA_CATEGORIA.clinico },
            { valor: 'cotidiano', etiqueta: ETIQUETA_CATEGORIA.cotidiano },
          ]}
        />
        <SelectorLista
          etiqueta="Nivel"
          parametro="nivel"
          defecto=""
          opciones={[
            { valor: '', etiqueta: 'Todos' },
            { valor: 'basico', etiqueta: ETIQUETA_DIFICULTAD.basico },
            { valor: 'intermedio', etiqueta: ETIQUETA_DIFICULTAD.intermedio },
            { valor: 'avanzado', etiqueta: ETIQUETA_DIFICULTAD.avanzado },
          ]}
        />
        <QuitarFiltros claves={['q', 'categoria', 'nivel']} />
      </div>

      {hayFiltros && visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input/50 px-5 py-8 text-center text-muted-foreground">
          Ningún caso coincide con la búsqueda. Prueba con otras palabras o quita los filtros.
        </p>
      ) : (
        <>
          {(!hayFiltros || propios.length > 0) && (
            <section aria-labelledby="mis-casos" className="flex flex-col gap-4">
              <h2 id="mis-casos" className="text-xl font-bold tracking-[-0.015em]">
                Mis casos{' '}
                <span className="text-sm font-semibold text-muted-foreground">
                  {hayFiltros ? `${propios.length} de ${totalPropios}` : totalPropios}
                </span>
              </h2>
              <BibliotecaCasos
                casos={propios}
                uso={uso}
                vacio={
                  <p className="rounded-xl border border-dashed border-input/50 px-5 py-6 text-sm text-muted-foreground">
                    Aún no has creado casos. Con el constructor guiado defines al paciente, su
                    motivo de consulta, cómo se comporta y lo que guarda, sin escribir instrucciones
                    técnicas.{' '}
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
          )}

          {dePsySim.length > 0 && (
            <section aria-labelledby="casos-psysim" className="flex flex-col gap-4">
              <h2 id="casos-psysim" className="text-xl font-bold tracking-[-0.015em]">
                Casos de PsySim{' '}
                <span className="text-sm font-semibold text-muted-foreground">
                  {dePsySim.length}
                </span>
              </h2>
              <BibliotecaCasos casos={dePsySim} uso={uso} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
