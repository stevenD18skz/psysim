import { UsersRound } from 'lucide-react';
import type { Metadata } from 'next';

import { BusquedaLista, QuitarFiltros, SelectorLista } from '@/components/comun/controles-lista';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { Paginacion } from '@/components/comun/paginacion';
import { BotonRegistrarEstudiante } from '@/components/estudiantes/boton-registrar';
import { ListaEstudiantes } from '@/components/estudiantes/lista-estudiantes';
import { requerirDocente } from '@/lib/auth/dal';
import {
  FILTROS_ESTUDIANTES,
  IDS_FILTRO_ESTUDIANTES,
  IDS_ORDEN_ESTUDIANTES,
  listarEstudiantes,
  ORDENES_ESTUDIANTES,
} from '@/lib/estudiantes/lista';
import { obtenerEstudiantes } from '@/lib/estudiantes/queries';
import { conParametros, leerOpcion, leerPagina, leerTexto, paginar } from '@/lib/listas';

export const metadata: Metadata = {
  title: 'Estudiantes',
};

const POR_PAGINA = 25;

/**
 * Estudiantes del docente: los registra con su correo institucional (así entran con Google), les
 * asigna prácticas y ve quién practica ahora y qué espera su retroalimentación. Con un curso
 * completo, se buscan, se filtran (por revisar, practicando, sin cuenta…), se ordenan y se paginan.
 */
export default async function EstudiantesPage({ searchParams }: PageProps<'/estudiantes'>) {
  await requerirDocente();
  const [parametros, estudiantes] = await Promise.all([searchParams, obtenerEstudiantes()]);

  const consulta = leerTexto(parametros.q);
  const filtro = leerOpcion(parametros.filtro, IDS_FILTRO_ESTUDIANTES, 'todos');
  const orden = leerOpcion(parametros.orden, IDS_ORDEN_ESTUDIANTES, 'nombre');
  const resultado = paginar(
    listarEstudiantes(estudiantes, { consulta, filtro, orden }),
    leerPagina(parametros.pagina),
    POR_PAGINA
  );
  const actuales = Object.fromEntries(
    Object.entries(parametros).flatMap(([clave, valor]) =>
      typeof valor === 'string' ? [[clave, valor]] : []
    )
  );

  const totales = estudiantes.reduce(
    (suma, { metricas }) => ({
      sesiones: suma.sesiones + metricas.sesiones,
      enCurso: suma.enCurso + metricas.enCurso,
      pendientes: suma.pendientes + metricas.pendientesRetroalimentacion,
    }),
    { sesiones: 0, enCurso: 0, pendientes: 0 }
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Estudiantes"
        descripcion="Regístralos con su correo institucional para asignarles prácticas. Entran con «Continuar con Google»."
        acciones={estudiantes.length > 0 ? <BotonRegistrarEstudiante /> : undefined}
      />

      {estudiantes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-input/50 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-salvia-suave text-salvia-oscuro">
            <UsersRound className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">Aún no tienes estudiantes</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Regístralos con su código, nombre y correo @correounivalle.edu.co. Después podrás
              asignarles prácticas.
            </p>
          </div>
          <BotonRegistrarEstudiante />
        </div>
      ) : (
        <>
          <Indicadores
            indicadores={[
              { etiqueta: 'Estudiantes', valor: estudiantes.length },
              { etiqueta: 'Practicando ahora', valor: totales.enCurso },
              { etiqueta: 'Por revisar', valor: totales.pendientes },
              { etiqueta: 'Prácticas', valor: totales.sesiones },
            ]}
          />
          <div className="flex flex-col gap-4">
            <ListaEstudiantes
              estudiantes={resultado.visibles}
              vacio={
                consulta
                  ? `Ningún estudiante coincide con «${consulta}».`
                  : 'Ningún estudiante cumple este filtro.'
              }
              controles={
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                  <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs font-medium text-muted-foreground">Buscar</span>
                    <BusquedaLista
                      etiqueta="Buscar estudiante"
                      placeholder="Código, nombre o correo"
                    />
                  </div>
                  <SelectorLista
                    etiqueta="Mostrar"
                    parametro="filtro"
                    defecto="todos"
                    opciones={FILTROS_ESTUDIANTES}
                  />
                  <SelectorLista
                    etiqueta="Ordenar por"
                    parametro="orden"
                    defecto="nombre"
                    opciones={ORDENES_ESTUDIANTES}
                  />
                  <QuitarFiltros claves={['q', 'filtro']} />
                </div>
              }
            />
            <Paginacion
              pagina={resultado}
              enlace={n =>
                conParametros(
                  '/estudiantes',
                  actuales,
                  { pagina: n },
                  {
                    filtro: 'todos',
                    orden: 'nombre',
                  }
                )
              }
              sustantivo={['estudiante', 'estudiantes']}
            />
          </div>
        </>
      )}
    </div>
  );
}
