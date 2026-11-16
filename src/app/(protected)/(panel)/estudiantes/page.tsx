import { Activity, KeyRound, MessageSquareText, MonitorPlay, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';

import { BusquedaLista, QuitarFiltros, SelectorLista } from '@/components/comun/controles-lista';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { Paginacion } from '@/components/comun/paginacion';
import { BotonRegistrarEstudiante } from '@/components/estudiantes/boton-registrar';
import { ListaEstudiantes } from '@/components/estudiantes/lista-estudiantes';
import { obtenerTodosLosEstudiantes } from '@/lib/admin/queries';
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
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Estudiantes',
};

const POR_PAGINA = 25;

/**
 * Estudiantes del docente: los registra con su correo institucional (así entran con Google), les
 * asigna prácticas y ve quién practica ahora y qué espera su retroalimentación. El Administrador ve
 * los estudiantes de todos los docentes y puede filtrar por docente.
 */
export default async function EstudiantesPage({ searchParams }: PageProps<'/estudiantes'>) {
  const perfil = await requerirDocente();
  const esAdmin = perfil.rol === 'superadmin';
  const [parametros, estudiantes] = await Promise.all([
    searchParams,
    esAdmin ? obtenerTodosLosEstudiantes() : obtenerEstudiantes(),
  ]);

  const consulta = leerTexto(parametros.q);
  const filtro = leerOpcion(parametros.filtro, IDS_FILTRO_ESTUDIANTES, 'todos');
  const orden = leerOpcion(parametros.orden, IDS_ORDEN_ESTUDIANTES, 'nombre');
  const docente = esAdmin ? leerTexto(parametros.docente) : '';
  const docentesOpciones = esAdmin
    ? [
        ...new Map(
          estudiantes.flatMap(e => (e.docente ? [[e.docente.id, e.docente]] : []))
        ).values(),
      ].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    : [];
  const resultado = paginar(
    listarEstudiantes(estudiantes, { consulta, filtro, orden, docente }),
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
      codigos: suma.codigos + metricas.codigosPendientes,
    }),
    { sesiones: 0, enCurso: 0, pendientes: 0, codigos: 0 }
  );

  const conCuenta = estudiantes.filter(e => e.cuentaVinculada).length;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Estudiantes"
        descripcion="Regístralos con su correo institucional para asignarles prácticas. Entran con su cuenta de Google de la universidad, sin contraseña."
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
              {
                icono: UsersRound,
                etiqueta: 'Estudiantes',
                valor: estudiantes.length,
                detalle: `${conCuenta} con cuenta de Google`,
                ayuda:
                  'Estudiantes registrados. Los que figuran con cuenta ya entraron al menos una vez con su correo institucional.',
              },
              {
                icono: Activity,
                etiqueta: 'Practicando ahora',
                valor: totales.enCurso,
                detalle: totales.enCurso === 0 ? 'Nadie en el consultorio' : 'En el consultorio',
                tono: totales.enCurso > 0 ? 'activo' : undefined,
              },
              {
                icono: MessageSquareText,
                etiqueta: 'Por revisar',
                valor: totales.pendientes,
                detalle: totales.pendientes === 0 ? 'Al día' : 'Esperan retroalimentación',
                tono: totales.pendientes > 0 ? 'atencion' : undefined,
              },
              {
                icono: KeyRound,
                etiqueta: 'Códigos sin usar',
                valor: totales.codigos,
                detalle: totales.codigos === 0 ? 'Ninguno esperando' : 'Aún vigentes',
                ayuda: 'Códigos de un solo uso que el estudiante todavía no ha usado.',
              },
              {
                icono: MonitorPlay,
                etiqueta: 'Prácticas',
                valor: totales.sesiones,
                detalle: 'Entre todos tus estudiantes',
              },
            ]}
          />
          <div className="flex flex-col gap-4">
            <ListaEstudiantes
              estudiantes={resultado.visibles}
              vacio={
                consulta ? (
                  <>
                    Ningún estudiante coincide con{' '}
                    <span className="font-medium text-foreground">{consulta}</span>.
                  </>
                ) : (
                  'Ningún estudiante cumple este filtro.'
                )
              }
              controles={
                <div
                  className={cn(
                    'grid gap-3 sm:grid-cols-2 lg:items-end',
                    docentesOpciones.length > 0
                      ? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
                      : 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
                  )}
                >
                  <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs font-medium text-muted-foreground">Buscar</span>
                    <BusquedaLista
                      etiqueta="Buscar estudiante"
                      placeholder="Código, nombre o correo"
                    />
                  </div>
                  {docentesOpciones.length > 0 && (
                    <SelectorLista
                      etiqueta="Docente"
                      parametro="docente"
                      defecto=""
                      opciones={[
                        { valor: '', etiqueta: 'Todos los docentes' },
                        ...docentesOpciones.map(d => ({ valor: d.id, etiqueta: d.nombre })),
                      ]}
                    />
                  )}
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
                  <QuitarFiltros claves={['q', 'filtro', 'docente']} />
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
