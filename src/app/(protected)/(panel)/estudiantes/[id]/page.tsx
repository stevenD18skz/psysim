import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  GraduationCap,
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

import { BotonCopiar } from '@/components/asignaciones/boton-copiar';
import { ListaCodigos } from '@/components/asignaciones/lista-codigos';
import { PistaFaro } from '@/components/ayuda/pista-contextual';
import { CodigoCaso } from '@/components/casos/codigo-caso';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
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
import { tiempoRelativo } from '@/lib/fechas';
import { conParametros, leerOpcion, leerPagina, paginar } from '@/lib/listas';
import {
  estaPorRevisar,
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
  const sesionEnCurso = sesiones.find(s => s.estado === 'en_curso') ?? null;
  const pendientesRevision = sesiones.filter(estaPorRevisar);
  const pendienteMasAntigua = pendientesRevision.at(-1) ?? null;
  const textoCasos = `${metricas.casos} ${metricas.casos === 1 ? 'caso' : 'casos'}`;

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
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-sidebar-muted">
            {metricas.enCurso > 0 && (
              <InsigniaEstado estado={{ texto: 'Practicando ahora', tono: 'en-curso' }} />
            )}
            {metricas.pendientesRetroalimentacion > 0 && (
              <Link
                href={url({ estado: 'por-revisar' }) as Route}
                scroll={false}
                className="rounded-full transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid"
              >
                <InsigniaEstado
                  estado={{
                    texto: `${metricas.pendientesRetroalimentacion} por revisar`,
                    tono: 'pendiente',
                  }}
                />
              </Link>
            )}
            {metricas.enCurso === 0 &&
              metricas.pendientesRetroalimentacion === 0 &&
              metricas.sesiones > 0 && (
                <InsigniaEstado
                  estado={{ texto: 'Al día', tono: 'listo' }}
                  className="ring-1 ring-lino/25"
                />
              )}
            {estudiante.cuentaVinculada ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-lino/20 bg-sidebar-accent px-2.5 py-0.5 text-xs font-medium text-sidebar-foreground">
                <CheckCircle2 className="size-3.5 text-laton-texto" aria-hidden />
                Cuenta de Google
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-ambar-suave px-2.5 py-0.5 text-xs font-medium text-ambar">
                {estudiante.correo ? 'Sin entrar aún' : 'Sin correo'}
              </span>
            )}
            {estudiante.docente && (
              <span className="inline-flex items-center gap-1.5 text-sm text-sidebar-muted">
                <GraduationCap className="size-4 text-laton-texto" aria-hidden />
                Docente:{' '}
                <Link
                  href={`/admin/docentes/${estudiante.docente.id}`}
                  className="font-medium text-laton-texto underline-offset-4 hover:text-sidebar-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid"
                >
                  {estudiante.docente.nombre}
                </Link>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-sidebar-muted">
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-sidebar-foreground">{estudiante.codigo}</span>
              <BotonCopiar
                texto={estudiante.codigo}
                etiqueta="Copiar código"
                soloIcono
                size="icon-sm"
                variant="ghost"
                className="size-9 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground sm:size-7"
              />
            </span>
            <span aria-hidden className="text-sidebar-muted/50">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5 break-all">
              <Mail className="size-4 shrink-0 text-laton-texto" aria-hidden />
              <span>{estudiante.correo ?? 'Sin correo institucional'}</span>
              {estudiante.correo && (
                <BotonCopiar
                  texto={estudiante.correo}
                  etiqueta="Copiar correo"
                  soloIcono
                  size="icon-sm"
                  variant="ghost"
                  className="size-9 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground sm:size-7"
                />
              )}
            </span>
            {metricas.ultimaSesion && (
              <>
                <span aria-hidden className="text-sidebar-muted/50">
                  ·
                </span>
                <span className="tabular-nums">
                  Última práctica {tiempoRelativo(metricas.ultimaSesion, ahora)}
                </span>
              </>
            )}
          </div>
        </div>
      </EncabezadoPagina>

      <ContenedorHero>
        <Indicadores
          className={SOMBRA_SOBRE_NOGAL}
          indicadores={[
            {
              icono: metricas.enCurso > 0 ? IndicadorEnVivo : MonitorPlay,
              etiqueta: 'Prácticas',
              valor: metricas.sesiones,
              detalle:
                metricas.enCurso > 0
                  ? `${metricas.enCurso} en curso · ${textoCasos}`
                  : metricas.pendientesRetroalimentacion > 0
                    ? `${metricas.pendientesRetroalimentacion} por revisar · ${textoCasos}`
                    : metricas.sesiones === 0
                      ? 'Sin prácticas aún'
                      : `${metricas.finalizadas} terminadas · ${textoCasos}`,
              ayuda:
                'Total de entrevistas registradas. Las terminadas (o con al menos 3 intervenciones) esperan tu retroalimentación.',
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
              ayuda:
                'Tiempo efectivo conversando en el consultorio 3D (descuenta pausas por inactividad).',
            },
            {
              icono: MessageSquareText,
              etiqueta: 'Intervenciones',
              valor: metricas.intervenciones,
              detalle:
                promedioIntervenciones > 0
                  ? `~${promedioIntervenciones} por práctica`
                  : 'Mensajes al paciente',
              ayuda:
                'Mensajes vigentes que envió el estudiante al paciente en todas sus entrevistas.',
            },
            {
              icono: ClipboardCheck,
              etiqueta: 'Nota promedio',
              valor: formatearNota(metricas.notaPromedio),
              detalle:
                conteos.publicadas > 0
                  ? `${conteos.publicadas} ${conteos.publicadas === 1 ? 'revisión publicada' : 'revisiones publicadas'}`
                  : conteos['por-revisar'] > 0
                    ? 'Pendiente de tu primera revisión'
                    : 'Sin notas publicadas',
              ayuda:
                'Promedio de las prácticas con retroalimentación publicada (escala 0,0 a 5,0). Los borradores no se incluyen.',
            },
          ]}
        />

        {sesionEnCurso && (
          <div className="flex flex-col gap-3 rounded-2xl border border-salvia/35 bg-salvia-suave/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro"
              >
                <IndicadorEnVivo className="size-4.5" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {sesionEnCurso.comenzada
                    ? `${primerNombre} está practicando en este momento`
                    : `${primerNombre} abrió una práctica y lee las instrucciones`}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  <CodigoCaso
                    codigo={sesionEnCurso.escenario.codigo}
                    className="font-mono text-xs font-medium text-foreground"
                  />
                  <span className="font-medium text-foreground/90">
                    {sesionEnCurso.escenario.titulo}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">
                    Inició {tiempoRelativo(sesionEnCurso.inicio, ahora)}
                  </span>
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={`/sesiones/${sesionEnCurso.id}`}>
                Ver estado
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        )}

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="sesiones-titulo" className="text-xl font-bold tracking-[-0.015em]">
                Prácticas
              </h2>
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                {sesiones.length}
              </span>
            </div>
            {pendienteMasAntigua && (
              <Link
                href={`/sesiones/${pendienteMasAntigua.id}`}
                className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-ambar underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
              >
                {pendientesRevision.length === 1 ? 'Revisar pendiente' : 'Revisar la más antigua'}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
          {sesiones.length > 0 && (
            <div className="w-full overflow-x-auto rounded-xl border bg-card p-1 sm:w-fit">
              <PistaSegmentada
                elemento="nav"
                aria-label="Filtrar prácticas por estado"
                className="flex gap-1"
                claseIndicador="rounded-lg bg-nogal"
              >
                {FILTROS_PRACTICAS.map(f => {
                  const activo = f.valor === filtro;
                  const esPendienteConItems = f.valor === 'por-revisar' && conteos[f.valor] > 0;
                  return (
                    <Link
                      key={f.valor}
                      href={url({ estado: f.valor }) as Route}
                      scroll={false}
                      aria-current={activo ? 'page' : undefined}
                      className={cn(
                        'flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-300 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid sm:min-h-9',
                        activo
                          ? 'bg-nogal text-lino'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {f.etiqueta}
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-xs tabular-nums',
                          activo
                            ? 'bg-lino/15 text-lino'
                            : esPendienteConItems
                              ? 'bg-ambar-suave font-semibold text-ambar'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {conteos[f.valor]}
                      </span>
                    </Link>
                  );
                })}
              </PistaSegmentada>
            </div>
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
                <span
                  className={cn(
                    'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                    codigosVigentes > 0
                      ? 'bg-ambar-suave text-ambar'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {codigosVigentes > 0
                    ? `${codigosVigentes} ${codigosVigentes === 1 ? 'vigente' : 'vigentes'}`
                    : asignaciones.length}
                </span>
              )}
              <PistaFaro
                id="ficha-estudiante-codigos"
                etiqueta="Modo presencial"
                titulo="Comparte códigos o entrega tu equipo"
                descripcion="Cada código vigente se copia en un clic y puedes reenviarlo o abrirlo en este computador en modo presencial. Arriba, en «Imprimir notas», también puedes guardar el informe oficial en PDF."
              />
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
