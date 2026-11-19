import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Mail,
  MailPlus,
  MessageSquareText,
  MonitorPlay,
  Pencil,
  Printer,
  SearchX,
} from 'lucide-react';
import type { Metadata } from 'next';
import { type Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ListaCodigos } from '@/components/asignaciones/lista-codigos';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { Indicadores } from '@/components/comun/indicadores';
import { Paginacion } from '@/components/comun/paginacion';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { AccionesEstudiante } from '@/components/estudiantes/acciones-estudiante';
import { EditarEstudiante } from '@/components/estudiantes/editar-estudiante';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { ListaSesiones } from '@/components/sesiones/lista-sesiones';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { obtenerFichaEstudianteAdmin } from '@/lib/admin/queries';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearNota, formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { obtenerEstudiante } from '@/lib/estudiantes/queries';
import { conParametros, leerOpcion, leerPagina, paginar } from '@/lib/listas';
import {
  FILTROS_PRACTICAS,
  type FiltroPracticas,
  IDS_FILTRO_PRACTICAS,
} from '@/lib/sesiones/estados';
import {
  obtenerAsignacionesDeEstudiante,
  obtenerSesionesDeEstudiante,
} from '@/lib/sesiones/queries';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Estudiante',
};

/**
 * Ficha del estudiante para el docente: sus datos y cuenta, sus prácticas con el estado de cada una
 * y el acceso a la revisión, y los códigos de acceso (los que no ha usado se pueden compartir de
 * nuevo o anular). Eliminar queda en el menú «⋯», lejos de la acción principal.
 */
export default async function EstudiantePage({
  params,
  searchParams,
}: PageProps<'/estudiantes/[id]'>) {
  const perfil = await requerirDocente();
  const esAdmin = perfil.rol === 'superadmin';

  const [{ id }, parametros] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const ficha = esAdmin ? await obtenerFichaEstudianteAdmin(id) : null;
  const estudiante = ficha ? ficha.estudiante : await obtenerEstudiante(id);
  if (!estudiante) notFound();

  const [sesiones, asignaciones] = ficha
    ? [ficha.sesiones, ficha.asignaciones]
    : await Promise.all([obtenerSesionesDeEstudiante(id), obtenerAsignacionesDeEstudiante(id)]);
  const { metricas } = estudiante;

  // Prácticas filtradas por estado y paginadas: tras un semestre pueden ser decenas.
  const filtro = leerOpcion(parametros.estado, IDS_FILTRO_PRACTICAS, 'todas');
  const conteos = Object.fromEntries(
    FILTROS_PRACTICAS.map(f => [f.valor, sesiones.filter(f.predicado).length])
  ) as Record<FiltroPracticas, number>;
  const predicado = FILTROS_PRACTICAS.find(f => f.valor === filtro)!.predicado;
  const pagina = paginar(sesiones.filter(predicado), leerPagina(parametros.pagina), 10);
  const ruta = `/estudiantes/${estudiante.id}`;
  const actuales = Object.fromEntries(
    Object.entries(parametros).flatMap(([clave, valor]) =>
      typeof valor === 'string' ? [[clave, valor]] : []
    )
  );
  const url = (cambios: Record<string, string | number | null>) =>
    conParametros(ruta, actuales, cambios, { estado: 'todas' });
  const ahora = new Date();
  const primerNombre = estudiante.nombre.split(' ')[0] ?? estudiante.nombre;
  const codigosVigentes = asignaciones.filter(a => a.estado === 'pendiente').length;
  const promedioSegundos =
    metricas.sesiones > 0 ? Math.round(metricas.segundosPractica / metricas.sesiones) : 0;
  const promedioIntervenciones =
    metricas.sesiones > 0 ? Math.round(metricas.intervenciones / metricas.sesiones) : 0;

  return (
    <div className="flex flex-1 flex-col">
      <RefrescoAutomatico activo={metricas.enCurso > 0} />

      <EncabezadoPagina
        volver={{ href: '/estudiantes', etiqueta: 'Estudiantes' }}
        titulo={
          <span className="flex items-center gap-3 sm:gap-4">
            <AvatarCuenta
              avatarId={estudiante.avatarId}
              nombre={estudiante.nombre}
              className="size-10 text-sm sm:size-12 sm:text-base"
            />
            {estudiante.nombre}
          </span>
        }
        acciones={
          <>
            <Button asChild size="lg" variant="outline">
              <Link href={`/estudiantes/${estudiante.id}/notas`} target="_blank">
                <Printer aria-hidden />
                Imprimir notas
              </Link>
            </Button>
            <EditarEstudiante
              estudiante={estudiante}
              etiqueta={estudiante.correo ? 'Editar' : 'Agregar correo'}
              icono={<Pencil aria-hidden />}
            />
            {estudiante.cuentaVinculada && (
              <Button asChild size="lg" variant="accion">
                <Link href={`/configuracion?estudiante=${estudiante.codigo}`}>
                  Asignar práctica
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
            <AccionesEstudiante estudiante={estudiante} enFicha />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-sidebar-muted">
          {metricas.enCurso > 0 ? (
            <InsigniaEstado estado={{ texto: 'Practicando ahora', tono: 'en-curso' }} />
          ) : metricas.pendientesRetroalimentacion > 0 ? (
            <InsigniaEstado
              estado={{
                texto: `${metricas.pendientesRetroalimentacion} por revisar`,
                tono: 'pendiente',
              }}
            />
          ) : metricas.sesiones > 0 ? (
            <InsigniaEstado estado={{ texto: 'Al día', tono: 'listo' }} />
          ) : null}
          <span className="font-mono text-sidebar-foreground">{estudiante.codigo}</span>
          <span className="flex items-center gap-1.5">
            <Mail className="size-4 text-laton-texto" aria-hidden />
            {estudiante.correo ?? 'Sin correo institucional'}
          </span>
          {estudiante.docente && (
            <span>
              · Docente:{' '}
              <Link
                href={`/admin/docentes/${estudiante.docente.id}`}
                className="font-medium text-laton-texto underline-offset-4 hover:text-sidebar-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid"
              >
                {estudiante.docente.nombre}
              </Link>
            </span>
          )}
          <span>
            ·{' '}
            {estudiante.cuentaVinculada
              ? 'Entra con Google'
              : estudiante.correo
                ? 'Aún no ha entrado con Google'
                : 'Sin cuenta vinculada'}
          </span>
        </div>
      </EncabezadoPagina>

      <ContenedorHero>
        <Indicadores
          className={SOMBRA_SOBRE_NOGAL}
          indicadores={[
            {
              icono: MonitorPlay,
              etiqueta: 'Prácticas',
              valor: metricas.sesiones,
              detalle:
                metricas.enCurso > 0
                  ? `${metricas.enCurso} en curso ahora`
                  : metricas.pendientesRetroalimentacion > 0
                    ? `${metricas.pendientesRetroalimentacion} por revisar`
                    : metricas.sesiones === 0
                      ? 'Sin prácticas aún'
                      : `${metricas.finalizadas} terminadas`,
              tono:
                metricas.enCurso > 0
                  ? 'activo'
                  : metricas.pendientesRetroalimentacion > 0
                    ? 'atencion'
                    : undefined,
            },
            {
              icono: Clock,
              etiqueta: 'Tiempo de práctica',
              valor: formatearTiempoPractica(metricas.segundosPractica),
              detalle:
                promedioSegundos > 0
                  ? `${formatearTiempoPractica(promedioSegundos)} por práctica`
                  : 'Sin tiempo registrado',
            },
            {
              icono: MessageSquareText,
              etiqueta: 'Intervenciones',
              valor: metricas.intervenciones,
              detalle:
                promedioIntervenciones > 0
                  ? `~${promedioIntervenciones} por práctica`
                  : 'Mensajes al paciente',
            },
            {
              icono: ClipboardCheck,
              etiqueta: 'Nota promedio',
              valor: formatearNota(metricas.notaPromedio),
              detalle:
                conteos.publicadas > 0
                  ? `${conteos.publicadas} ${conteos.publicadas === 1 ? 'revisión publicada' : 'revisiones publicadas'}`
                  : 'Sin notas publicadas',
            },
          ]}
        />

        {!estudiante.cuentaVinculada && (
          <div className="flex flex-col gap-3 rounded-2xl border border-ambar/35 bg-ambar-suave/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-ambar-suave text-ambar"
              >
                <MailPlus className="size-4.5" />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {estudiante.correo
                    ? `${primerNombre} aún no ha vinculado su cuenta`
                    : `Falta el correo institucional de ${primerNombre}`}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {estudiante.correo
                    ? 'Asegúrate de que su correo @correounivalle.edu.co sea correcto; una vez vinculado podrás asignarle códigos.'
                    : 'Agrega su correo @correounivalle.edu.co para crear su acceso con Google y poder asignarle prácticas.'}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <EditarEstudiante
                estudiante={estudiante}
                etiqueta={estudiante.correo ? 'Revisar correo' : 'Agregar correo'}
                icono={<MailPlus aria-hidden />}
              />
            </div>
          </div>
        )}

        <section aria-labelledby="sesiones-titulo" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="sesiones-titulo" className="text-xl font-bold tracking-[-0.015em]">
              Prácticas
            </h2>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {sesiones.length}
            </span>
          </div>
          {sesiones.length > 0 && (
            <PistaSegmentada
              elemento="nav"
              aria-label="Filtrar prácticas por estado"
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
              claseIndicador="rounded-lg bg-nogal"
            >
              {FILTROS_PRACTICAS.map(f => {
                const activo = f.valor === filtro;
                return (
                  <Link
                    key={f.valor}
                    href={url({ estado: f.valor }) as Route}
                    scroll={false}
                    aria-current={activo ? 'page' : undefined}
                    className={cn(
                      'flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-300 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                      activo
                        ? 'bg-nogal text-lino'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {f.etiqueta}
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-xs tabular-nums',
                        activo ? 'bg-lino/15 text-lino' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {conteos[f.valor]}
                    </span>
                  </Link>
                );
              })}
            </PistaSegmentada>
          )}
          <ListaSesiones
            sesiones={pagina.visibles}
            para="docente"
            ahora={ahora}
            enlace={sesion => `/sesiones/${sesion.id}`}
            vacio={
              sesiones.length === 0 ? (
                <EstadoVacio
                  icono={ClipboardList}
                  tono="salvia"
                  titulo={`${primerNombre} aún no ha hecho prácticas`}
                  descripcion="Cuando use un código de acceso y converse con el paciente, cada entrevista aparecerá aquí con su duración, estado y acceso directo a la revisión."
                  accion={
                    estudiante.cuentaVinculada ? (
                      <Button asChild variant="outline">
                        <Link href={`/configuracion?estudiante=${estudiante.codigo}`}>
                          Asignar primera práctica
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <EstadoVacio
                  icono={SearchX}
                  titulo="Ninguna práctica en este estado"
                  descripcion={`No hay entrevistas de ${primerNombre} bajo el filtro seleccionado.`}
                  accion={
                    <Button asChild size="sm" variant="outline">
                      <Link href={url({ estado: 'todas' }) as Route}>Ver todas las prácticas</Link>
                    </Button>
                  }
                />
              )
            }
          />
          {pagina.totalPaginas > 1 && (
            <Paginacion
              pagina={pagina}
              enlace={n => url({ pagina: n })}
              sustantivo={['práctica', 'prácticas']}
            />
          )}
        </section>

        <section aria-labelledby="codigos-titulo" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="codigos-titulo" className="text-xl font-bold tracking-[-0.015em]">
                Códigos de acceso
              </h2>
              {asignaciones.length > 0 && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                  {codigosVigentes > 0 ? `${codigosVigentes} vigentes` : asignaciones.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Cada código sirve una sola vez y solo con la cuenta de {primerNombre}.
            </p>
          </div>
          <ListaCodigos
            asignaciones={asignaciones}
            estudiante={{
              nombre: estudiante.nombre,
              correo: estudiante.correo,
              codigo: estudiante.codigo,
              cuentaVinculada: estudiante.cuentaVinculada,
            }}
            ahora={ahora}
          />
        </section>
      </ContenedorHero>
    </div>
  );
}
