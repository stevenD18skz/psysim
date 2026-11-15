import { ArrowRight, Bot, ClipboardList, ShieldCheck, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { CodigoCaso } from '@/components/casos/codigo-caso';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { type Indicador, Indicadores } from '@/components/comun/indicadores';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { leerConfiguracionIa } from '@/lib/admin/ia';
import { obtenerDocentes, obtenerTodosLosEstudiantes } from '@/lib/admin/queries';
import { requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { cierrePorInactividad, formatearHora, tiempoRelativo } from '@/lib/fechas';
import { duracionSesion, estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerCodigosPendientes, obtenerSesionesDelDocente } from '@/lib/sesiones/queries';
import { cn } from '@/lib/utils';
import {
  type CodigoPendiente,
  type DocenteAdmin,
  type EstudianteRegistrado,
  type SesionDocente,
} from '@/types';

export const metadata: Metadata = {
  title: 'Inicio',
};

const formatoHoraDelDia = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'America/Bogota',
});

function saludo(ahora: Date): string {
  const hora = Number(formatoHoraDelDia.format(ahora));
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * Bandeja del docente y vista ejecutiva del Administrador: lo primero que se ve al entrar responde
 * «¿cómo está la plataforma y qué tengo que hacer hoy?». Incluye indicadores clave con ayuda
 * contextual, las prácticas por revisar, quién practica ahora y los códigos pendientes de uso.
 */
export default async function InicioPage() {
  const perfil = await requerirUsuario();
  if (perfil.rol === 'estudiante') redirect(RUTA_INICIO.estudiante);

  const esAdmin = perfil.rol === 'superadmin';
  const [sesiones, codigos, docentes, estudiantesPlataforma] = await Promise.all([
    obtenerSesionesDelDocente(),
    obtenerCodigosPendientes(),
    esAdmin ? obtenerDocentes() : null,
    esAdmin ? obtenerTodosLosEstudiantes() : null,
  ]);

  const ahora = new Date();
  const porRevisar = sesiones
    .filter(estaPorRevisar)
    .sort((a, b) => (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio));
  const practicando = sesiones.filter(s => s.estado === 'en_curso');
  const primerNombre = perfil.nombre.split(' ')[0];

  const resumen =
    porRevisar.length === 0 && practicando.length === 0
      ? esAdmin
        ? 'Aquí tienes el pulso general de la plataforma y tu bandeja de prácticas.'
        : 'No tienes nada pendiente por ahora.'
      : [
          porRevisar.length > 0 &&
            `Tienes ${plural(porRevisar.length, 'práctica', 'prácticas')} por revisar`,
          practicando.length > 0 &&
            `${plural(practicando.length, 'estudiante practica', 'estudiantes practican')} ahora`,
        ]
          .filter(Boolean)
          .join(' y ') + '.';

  // Indicadores rápidos para el docente cuando no es administrador.
  const indicadoresDocente: Indicador[] = [
    {
      etiqueta: 'Por revisar',
      valor: porRevisar.length,
      detalle: porRevisar.length === 0 ? 'Al día' : 'Esperan tu evaluación',
      ayuda:
        'Prácticas terminadas o con al menos 3 mensajes del estudiante que aún no tienen tu retroalimentación publicada.',
    },
    {
      etiqueta: 'Practicando ahora',
      valor: practicando.length,
      detalle: practicando.length === 0 ? 'Sin prácticas activas' : 'En el consultorio',
      ayuda:
        'Estudiantes que están conversando con un paciente simulado en este instante. La página se actualiza sola cada 30 segundos.',
    },
    {
      etiqueta: 'Códigos vigentes',
      valor: codigos.length,
      detalle: codigos.length === 0 ? 'Ninguno esperando' : 'Sin canjear aún',
      ayuda:
        'Códigos de acceso de un solo uso que ya generaste y el estudiante todavía no ha usado para iniciar su práctica.',
    },
    {
      etiqueta: 'Total de prácticas',
      valor: sesiones.length,
      detalle: `${sesiones.filter(s => s.estado === 'finalizada').length} terminadas`,
      ayuda: ' Prácticas iniciadas por tus estudiantes desde tus códigos de acceso.',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <RefrescoAutomatico activo={practicando.length > 0} segundos={30} />

      <header className="@container">
        <div className="flex flex-col gap-5 @2xl:flex-row @2xl:items-end @2xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.6rem]">
              {saludo(ahora)}, {primerNombre}
            </h1>
            <p className="text-lg text-muted-foreground">{resumen}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {esAdmin && (
              <Button asChild variant="outline" size="lg">
                <Link href="/estudiantes">
                  <Users aria-hidden />
                  Ver estudiantes
                </Link>
              </Button>
            )}
            <Button asChild variant="accion" size="lg">
              <Link href="/configuracion">
                <ClipboardList aria-hidden />
                Asignar práctica
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {docentes && estudiantesPlataforma ? (
        <PanelEjecutivoAdmin
          docentes={docentes}
          estudiantes={estudiantesPlataforma}
          ahora={ahora}
        />
      ) : (
        <Indicadores indicadores={indicadoresDocente} />
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section aria-labelledby="por-revisar" className="flex flex-col gap-4">
          <EncabezadoSeccion
            id="por-revisar"
            titulo="Por revisar"
            cantidad={porRevisar.length}
            ayuda="Prácticas terminadas (o interrumpidas con al menos 3 intervenciones) donde el estudiante espera tus comentarios y calificación."
            enlace={{ href: '/sesiones', texto: 'Ver todas las revisiones' }}
          />
          {porRevisar.length === 0 ? (
            <Vacio>
              Cuando un estudiante termine una práctica, aparecerá aquí ordenada de la más antigua a
              la más reciente para que dejes tu retroalimentación.
            </Vacio>
          ) : (
            <ol className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
              {porRevisar.slice(0, 8).map(sesion => (
                <FilaPorRevisar key={sesion.id} sesion={sesion} ahora={ahora} />
              ))}
            </ol>
          )}
          {porRevisar.length > 8 && (
            <p className="text-sm text-muted-foreground">
              Y {plural(porRevisar.length - 8, 'práctica más', 'prácticas más')} en{' '}
              <Link href="/sesiones" className="font-medium text-foreground underline">
                Revisiones
              </Link>
              .
            </p>
          )}
        </section>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="practicando" className="flex flex-col gap-4">
            <EncabezadoSeccion
              id="practicando"
              titulo="Practicando ahora"
              cantidad={practicando.length}
              ayuda="Estudiantes que tienen un consultorio abierto ahora mismo. Si dejan de escribir durante 30 minutos, la práctica se cierra sola."
            />
            {practicando.length === 0 ? (
              <Vacio>Nadie está practicando en este momento.</Vacio>
            ) : (
              <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
                {practicando.map(sesion => (
                  <FilaPracticando key={sesion.id} sesion={sesion} ahora={ahora} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="codigos" className="flex flex-col gap-4">
            <EncabezadoSeccion
              id="codigos"
              titulo="Códigos sin usar"
              cantidad={codigos.length}
              ayuda="Códigos de práctica que aún están dentro de su plazo de validez. Desde aquí puedes copiarlos o reenviarlos por correo."
            />
            {codigos.length === 0 ? (
              <Vacio>
                No tienes códigos esperando. Los que generes en «Asignar práctica» y el estudiante
                aún no use aparecerán aquí para reenviarlos rápido.
              </Vacio>
            ) : (
              <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
                {codigos.slice(0, 6).map(codigo => (
                  <FilaCodigo key={codigo.id} codigo={codigo} ahora={ahora} />
                ))}
              </ul>
            )}
            {codigos.length > 6 && (
              <p className="text-sm text-muted-foreground">
                Y {plural(codigos.length - 6, 'código más', 'códigos más')}: están en la ficha de
                cada uno en{' '}
                <Link href="/estudiantes" className="font-medium text-foreground underline">
                  Estudiantes
                </Link>
                .
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Vista ejecutiva para el Administrador: reúne los indicadores globales de docentes, estudiantes,
 * prácticas, códigos y estado del proveedor de IA, más el desglose rápido por docente.
 */
function PanelEjecutivoAdmin({
  docentes,
  estudiantes,
  ahora,
}: {
  docentes: DocenteAdmin[];
  estudiantes: EstudianteRegistrado[];
  ahora: Date;
}) {
  const configIa = leerConfiguracionIa();
  const docentesActivos = docentes.filter(d => d.activo).length;
  const conCuenta = estudiantes.filter(e => e.cuentaVinculada).length;
  const totalSesiones = docentes.reduce((s, d) => s + d.metricas.sesiones, 0);
  const totalEnCurso = docentes.reduce((s, d) => s + d.metricas.enCurso, 0);
  const totalPorRevisar = docentes.reduce((s, d) => s + d.metricas.pendientesRetroalimentacion, 0);
  const totalCasosPropios = docentes.reduce((s, d) => s + d.metricas.casosPropios, 0);
  const totalCodigosPendientes = estudiantes.reduce((s, e) => s + e.metricas.codigosPendientes, 0);
  const segundosTotales = estudiantes.reduce((s, e) => s + e.metricas.segundosPractica, 0);

  const notasValidas = estudiantes
    .map(e => e.metricas.notaPromedio)
    .filter((n): n is number => n !== null);
  const promedioGlobal =
    notasValidas.length > 0 ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;

  const kpisPlataforma: Indicador[] = [
    {
      etiqueta: 'Docentes activos',
      valor: docentesActivos,
      detalle: `de ${docentes.length} en el equipo`,
      ayuda:
        'Docentes con acceso activo para registrar estudiantes, crear casos y asignar prácticas.',
    },
    {
      etiqueta: 'Estudiantes',
      valor: estudiantes.length,
      detalle: `${conCuenta} con cuenta activa`,
      ayuda:
        'Total de estudiantes registrados por todos los docentes. Quienes ya iniciaron sesión aparecen con cuenta activa.',
    },
    {
      etiqueta: 'Prácticas totales',
      valor: totalSesiones,
      detalle:
        segundosTotales > 0
          ? `${formatearDuracion(segundosTotales)} acumulados`
          : 'Sin tiempo registrado aún',
      ayuda:
        'Suma de todas las prácticas realizadas en la plataforma y el tiempo total de conversación clínica.',
    },
    {
      etiqueta: 'En curso y códigos',
      valor: `${totalEnCurso} · ${totalCodigosPendientes}`,
      detalle: `${plural(totalEnCurso, 'activa', 'activas')} · ${plural(totalCodigosPendientes, 'código', 'códigos')}`,
      ayuda:
        'Prácticas en curso ahora mismo seguidas del total de códigos vigentes pendientes de canjear por los estudiantes.',
    },
    {
      etiqueta: 'Por revisar',
      valor: totalPorRevisar,
      detalle:
        promedioGlobal !== null
          ? `Nota media ${promedioGlobal.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
          : 'Sin calificaciones aún',
      ayuda:
        'Prácticas terminadas en toda la plataforma que aún esperan la retroalimentación y nota de su docente.',
    },
    {
      etiqueta: 'Catálogo de casos',
      valor: 12 + totalCasosPropios,
      detalle: `12 oficiales · ${totalCasosPropios} propios`,
      ayuda:
        'Los 12 casos clínicos y cotidianos de PsySim más los casos creados por los docentes con el constructor guiado.',
    },
  ];

  // Mostrar primero los docentes con actividad o estudiantes asignados.
  const docentesDestacados = [...docentes]
    .sort(
      (a, b) =>
        b.metricas.pendientesRetroalimentacion - a.metricas.pendientesRetroalimentacion ||
        b.metricas.estudiantes - a.metricas.estudiantes ||
        b.metricas.sesiones - a.metricas.sesiones
    )
    .slice(0, 5);

  return (
    <section aria-labelledby="resumen-plataforma" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl vetas-nogal px-5 py-4 text-sidebar-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-laton sm:mt-0" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="resumen-plataforma" className="text-base font-bold">
                Estado de la plataforma
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-accent px-2.5 py-0.5 text-xs font-medium text-laton-texto">
                <Bot className="size-3.5" aria-hidden />
                {configIa.proveedor === 'orquestador' && configIa.orquestadorListo
                  ? `Orquestador activo (${configIa.capacidad} simultáneas)`
                  : 'Gemini directo'}
              </span>
            </div>
            <p className="text-xs text-sidebar-muted">
              Vista global de docentes, estudiantes y consumo del paciente simulado.
            </p>
          </div>
        </div>

        <nav
          aria-label="Accesos rápidos de administración"
          className="flex flex-wrap items-center gap-3 text-sm"
        >
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-md font-semibold text-laton-texto underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-laton focus-visible:outline-hidden"
          >
            Docentes
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <span aria-hidden className="text-sidebar-muted">
            ·
          </span>
          <Link
            href="/estudiantes"
            className="inline-flex items-center gap-1 rounded-md font-semibold text-laton-texto underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-laton focus-visible:outline-hidden"
          >
            Estudiantes
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <span aria-hidden className="text-sidebar-muted">
            ·
          </span>
          <Link
            href="/admin/ia"
            className="inline-flex items-center gap-1 rounded-md font-semibold text-laton-texto underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-laton focus-visible:outline-hidden"
          >
            Paciente con IA
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </nav>
      </div>

      <Indicadores indicadores={kpisPlataforma} />

      {docentesDestacados.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b bg-muted/35 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold">Actividad por docente</h3>
              <AyudaContextual
                etiqueta="Qué muestra Actividad por docente"
                texto="Resumen del grupo de cada docente: cuántos estudiantes tiene a cargo, cuántas prácticas han iniciado y cuántas esperan su revisión."
              />
            </div>
            <Link
              href="/admin"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Ver los {docentes.length} docentes
            </Link>
          </div>
          <ul className="divide-y text-sm">
            {docentesDestacados.map(d => (
              <li
                key={d.id}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      d.activo ? 'bg-salvia' : 'bg-border'
                    )}
                  />
                  <Link
                    href={`/admin/docentes/${d.id}`}
                    className="truncate font-semibold underline-offset-4 hover:underline"
                  >
                    {d.nombre}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">{d.correo}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <span>{plural(d.metricas.estudiantes, 'estudiante', 'estudiantes')}</span>
                  <span>{plural(d.metricas.sesiones, 'práctica', 'prácticas')}</span>
                  {d.metricas.pendientesRetroalimentacion > 0 ? (
                    <span className="rounded-full bg-ambar-suave px-2 py-0.5 font-medium text-ambar">
                      {d.metricas.pendientesRetroalimentacion} por revisar
                    </span>
                  ) : (
                    <span>Al día</span>
                  )}
                  <span className="hidden text-muted-foreground/80 md:inline">
                    {d.metricas.ultimaSesion
                      ? `Última práctica ${tiempoRelativo(d.metricas.ultimaSesion, ahora)}`
                      : d.ultimoAcceso
                        ? `Entró ${tiempoRelativo(d.ultimoAcceso, ahora)}`
                        : 'Sin ingreso aún'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EncabezadoSeccion({
  id,
  titulo,
  cantidad,
  ayuda,
  enlace,
}: {
  id: string;
  titulo: string;
  cantidad: number;
  ayuda?: string;
  enlace?: { href: '/sesiones'; texto: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 id={id} className="text-xl font-bold tracking-[-0.015em]">
        {titulo}
      </h2>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground tabular-nums">
        {cantidad}
      </span>
      {ayuda && <AyudaContextual etiqueta={`Qué es ${titulo}`} texto={ayuda} />}
      {enlace && cantidad > 0 && (
        <Link
          href={enlace.href}
          className="ml-auto text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {enlace.texto}
        </Link>
      )}
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-input/50 bg-card/40 px-5 py-6 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/** Fila del registro de pendientes: cuánto lleva esperando, quién, qué caso y cómo terminó. */
function FilaPorRevisar({ sesion, ahora }: { sesion: SesionDocente; ahora: Date }) {
  const terminada = sesion.fin ?? sesion.inicio;
  const duracion = duracionSesion(sesion);
  const borrador = sesion.retroalimentacion !== null;
  return (
    <li className="group relative grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-muted/60 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center">
      <p className="row-span-2 flex flex-col leading-tight sm:row-span-1">
        <span className="text-sm font-semibold ancho-condensado first-letter:uppercase">
          {tiempoRelativo(terminada, ahora)}
        </span>
        <span className="text-xs text-muted-foreground">{formatearDia(terminada)}</span>
      </p>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-semibold">{sesion.estudiante.nombre}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <CodigoCaso
            codigo={sesion.escenario.codigo}
            className="font-mono text-xs text-foreground"
          />
          <span className="truncate">{sesion.escenario.titulo}</span>
          <span aria-hidden>·</span>
          <span>{sesion.estado === 'interrumpida' ? 'Interrumpida' : 'Terminada'}</span>
          {duracion !== null && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{formatearDuracion(duracion)}</span>
            </>
          )}
          {borrador && (
            <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
              Borrador
            </span>
          )}
        </p>
      </div>
      <Link
        href={`/sesiones/${sesion.id}`}
        className="col-start-2 inline-flex w-fit items-center gap-1 rounded-md text-sm font-semibold text-foreground underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden sm:col-start-3"
      >
        {borrador ? 'Continuar revisión' : 'Revisar'}
        <span className="sr-only">
          : {sesion.estudiante.nombre}, {sesion.escenario.titulo}
        </span>
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/** Quién practica ahora, si ya empezó, y a qué hora se cerrará la práctica si no hay actividad. */
function FilaPracticando({ sesion, ahora }: { sesion: SesionDocente; ahora: Date }) {
  const cierre = cierrePorInactividad(sesion.ultimaActividad);
  return (
    <li className="flex flex-col gap-1 px-4 py-3.5">
      <p className="flex items-center gap-2 font-semibold">
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inline-flex size-full rounded-full bg-salvia opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-salvia" />
        </span>
        <Link
          href={`/sesiones/${sesion.id}`}
          className="truncate underline-offset-4 hover:underline"
        >
          {sesion.estudiante.nombre}
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">
        <CodigoCaso
          codigo={sesion.escenario.codigo}
          className="font-mono text-xs text-foreground"
        />{' '}
        {sesion.comenzada
          ? `Conversando desde ${tiempoRelativo(sesion.inicio, ahora)}`
          : 'Leyendo las instrucciones del caso'}
      </p>
      {cierre > ahora && (
        <p className="text-xs text-muted-foreground">
          Si no hay actividad, se cierra a las {formatearHora(cierre)}.
        </p>
      )}
    </li>
  );
}

/** Código sin usar: de quién es, qué caso, cuándo vence y cómo reenviarlo. */
function FilaCodigo({ codigo, ahora }: { codigo: CodigoPendiente; ahora: Date }) {
  const horasRestantes = (new Date(codigo.expiraEn).getTime() - ahora.getTime()) / 3_600_000;
  const urgente = horasRestantes < 24;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-semibold">
          {codigo.estudiante ? (
            <Link
              href={`/estudiantes/${codigo.estudiante.id}`}
              className="underline-offset-4 hover:underline"
            >
              {codigo.estudiante.nombre}
            </Link>
          ) : (
            'Estudiante'
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          <span className="font-mono text-xs text-foreground">{codigo.codigo}</span> ·{' '}
          {codigo.escenario.titulo}
        </p>
        <p
          className={cn('text-xs', urgente ? 'font-semibold text-ambar' : 'text-muted-foreground')}
        >
          Vence {tiempoRelativo(codigo.expiraEn, ahora)}
        </p>
      </div>
      {codigo.estudiante && (
        <ReenviarCodigo
          codigo={codigo.codigo}
          expiraEn={codigo.expiraEn}
          caso={codigo.escenario.titulo}
          estudiante={codigo.estudiante}
        />
      )}
    </li>
  );
}
