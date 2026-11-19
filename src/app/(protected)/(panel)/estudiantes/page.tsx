import {
  ArrowRight,
  ClipboardList,
  KeyRound,
  Mail,
  MessageSquareText,
  MonitorPlay,
  SearchX,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { BusquedaLista, QuitarFiltros, SelectorLista } from '@/components/comun/controles-lista';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { Indicadores } from '@/components/comun/indicadores';
import { Paginacion } from '@/components/comun/paginacion';
import { BotonRegistrarEstudiante } from '@/components/estudiantes/boton-registrar';
import { ListaEstudiantes } from '@/components/estudiantes/lista-estudiantes';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
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
  const ahora = new Date();
  const hayFiltros = Boolean(consulta || filtro !== 'todos' || docente);

  const subbarra =
    estudiantes.length > 0 ? (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Accesos rápidos" className="flex flex-wrap items-center gap-1.5">
          {[
            { href: '/configuracion', texto: 'Asignar práctica' },
            { href: '/sesiones', texto: 'Revisiones' },
          ].map(enlace => (
            <Link
              key={enlace.href}
              href={enlace.href as '/configuracion' | '/sesiones'}
              className="group inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-sidebar-accent/55 px-3 py-1 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-laton-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {enlace.texto}
              <ArrowRight
                className="size-3.5 text-laton-texto transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </nav>
        <span className="text-xs text-sidebar-muted tabular-nums">
          {conCuenta} con cuenta · {estudiantes.length - conCuenta} sin entrar aún
        </span>
      </div>
    ) : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <RefrescoAutomatico activo={totales.enCurso > 0} segundos={30} />
      <EncabezadoPagina
        titulo="Estudiantes"
        descripcion="Regístralos con su correo institucional para asignarles prácticas. Entran con su cuenta de Google de la universidad, sin contraseña."
        acciones={estudiantes.length > 0 ? <BotonRegistrarEstudiante /> : undefined}
        subbarra={subbarra}
      />

      <ContenedorHero>
        {estudiantes.length === 0 ? (
          <EstadoVacio
            icono={UsersRound}
            tono="salvia"
            elevado
            titulo="Aquí vivirán tus estudiantes"
            descripcion="Registra a tu grupo con su código y correo @correounivalle.edu.co para empezar a asignarles prácticas clínicas y seguir su avance."
            accion={<BotonRegistrarEstudiante />}
            pasos={[
              {
                icono: Mail,
                titulo: 'Correo institucional',
                texto: 'Solo necesitas su código, nombre completo y correo @correounivalle.edu.co.',
              },
              {
                icono: UserCheck,
                titulo: 'Ingreso con Google',
                texto: 'Entran directamente con su cuenta de la universidad, sin crear contraseña.',
              },
              {
                icono: ClipboardList,
                titulo: 'Seguimiento en un lugar',
                texto: 'Asigna casos con código único, lee transcripciones e imprime sus notas.',
              },
            ]}
          />
        ) : (
          <>
            <Indicadores
              className={SOMBRA_SOBRE_NOGAL}
              indicadores={[
                {
                  icono: UsersRound,
                  etiqueta: 'Estudiantes',
                  valor: estudiantes.length,
                  detalle: `${conCuenta} con cuenta de Google`,
                  ayuda:
                    'Estudiantes registrados. Los que figuran con cuenta ya pueden recibir códigos con su correo institucional.',
                },
                {
                  icono: IndicadorEnVivo,
                  etiqueta: 'Practicando ahora',
                  valor: totales.enCurso,
                  detalle: totales.enCurso === 0 ? 'Nadie en el consultorio' : 'En el consultorio',
                  tono: totales.enCurso > 0 ? 'activo' : undefined,
                  ayuda:
                    'Estudiantes conversando con el paciente en este momento. La vista se actualiza sola cada 30 segundos.',
                },
                {
                  icono: MessageSquareText,
                  etiqueta: 'Por revisar',
                  valor: totales.pendientes,
                  detalle: totales.pendientes === 0 ? 'Al día' : 'Esperan retroalimentación',
                  tono: totales.pendientes > 0 ? 'atencion' : undefined,
                  ayuda:
                    'Prácticas terminadas (o con al menos 3 intervenciones) pendientes de retroalimentación.',
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
                  detalle: esAdmin ? 'En toda la plataforma' : 'Entre todos tus estudiantes',
                },
              ]}
            />
            <div className="flex flex-col gap-4">
              <ListaEstudiantes
                estudiantes={resultado.visibles}
                totalFiltrados={resultado.total}
                totalEstudiantes={estudiantes.length}
                ahora={ahora}
                vacio={
                  <EstadoVacio
                    variante="inline"
                    icono={SearchX}
                    titulo={
                      consulta
                        ? 'Ningún estudiante coincide con tu búsqueda'
                        : 'Ningún estudiante cumple este filtro'
                    }
                    descripcion={
                      consulta ? (
                        <>
                          No encontramos resultados para{' '}
                          <span className="font-medium text-foreground">{consulta}</span>. Prueba
                          con otro nombre, código o correo, o quita los filtros activos.
                        </>
                      ) : (
                        'Cambia el criterio seleccionado o vuelve a mostrar todos los estudiantes.'
                      )
                    }
                    accion={
                      hayFiltros ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href="/estudiantes">Quitar filtros</Link>
                        </Button>
                      ) : undefined
                    }
                  />
                }
                controles={
                  <div
                    className={cn(
                      'grid gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-2 lg:items-end',
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
      </ContenedorHero>
    </div>
  );
}
