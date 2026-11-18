import {
  Activity,
  Bot,
  ClipboardCheck,
  Library,
  MonitorPlay,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { type Indicador, Indicadores } from '@/components/comun/indicadores';
import {
  BarraSubHero,
  EncabezadoHeroTrabajo,
  type EnlaceHero,
  MarcoHeroInicio,
} from '@/components/inicio/marco-hero';
import { leerConfiguracionIa } from '@/lib/admin/ia';
import { formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import { cn } from '@/lib/utils';
import { type DocenteAdmin, type EstudianteRegistrado } from '@/types';

/** Casos oficiales de PsySim (E-01 a E-12), además de los que crean los docentes. */
const CASOS_OFICIALES = 12;
/** Docentes y estudiantes visibles en las tablas resumen del inicio; el resto está en su sección. */
const DOCENTES_DESTACADOS = 5;
const ESTUDIANTES_DESTACADOS = 5;

const ACCESOS: readonly EnlaceHero[] = [
  { href: '/admin', texto: 'Docentes' },
  { href: '/estudiantes', texto: 'Estudiantes' },
  { href: '/configuracion/casos', texto: 'Casos' },
  { href: '/admin/ia', texto: 'Paciente con IA' },
];

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

const formatoNota = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Encabezado superior de nogal del panel administrador: agrupa el saludo, las acciones globales,
 * los accesos a las secciones de administración y el proveedor activo de IA. Las tarjetas de datos
 * se superponen parcialmente sobre su borde inferior.
 */
export function HeroPlataforma({
  textoSaludo,
  primerNombre,
  resumen,
}: {
  textoSaludo: string;
  primerNombre: string;
  resumen: string;
}) {
  const configIa = leerConfiguracionIa();
  const orquestador = configIa.proveedor === 'orquestador' && configIa.orquestadorListo;

  return (
    <MarcoHeroInicio>
      <EncabezadoHeroTrabajo
        textoSaludo={textoSaludo}
        primerNombre={primerNombre}
        resumen={resumen}
        etiquetaEstudiantes="Ver estudiantes"
      />
      <BarraSubHero
        tituloId="resumen-plataforma"
        titulo="La plataforma"
        icono={ShieldCheck}
        ariaNavegacion="Administración"
        enlaces={ACCESOS}
        estadoDerecha={
          <Link
            href="/admin/ia"
            className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs font-medium whitespace-nowrap text-laton-texto transition-colors hover:border-laton/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            <Bot className="size-3.5 shrink-0" aria-hidden />
            {orquestador
              ? `Orquestador · ${plural(configIa.capacidad, 'práctica', 'prácticas')} a la vez`
              : 'Paciente con Gemini directo'}
          </Link>
        }
      />
    </MarcoHeroInicio>
  );
}

/**
 * Vista del Administrador sobre toda la plataforma: las cifras globales de docentes, estudiantes y
 * prácticas, y qué docentes y estudiantes concentran actividad reciente.
 */
export function PanelPlataforma({
  docentes,
  estudiantes,
  ahora,
}: {
  docentes: DocenteAdmin[];
  estudiantes: EstudianteRegistrado[];
  ahora: Date;
}) {
  const docentesActivos = docentes.filter(d => d.activo).length;
  const conCuenta = estudiantes.filter(e => e.cuentaVinculada).length;
  const totalSesiones = docentes.reduce((s, d) => s + d.metricas.sesiones, 0);
  const totalEnCurso = docentes.reduce((s, d) => s + d.metricas.enCurso, 0);
  const totalPorRevisar = docentes.reduce((s, d) => s + d.metricas.pendientesRetroalimentacion, 0);
  const totalCasosPropios = docentes.reduce((s, d) => s + d.metricas.casosPropios, 0);
  const segundosTotales = estudiantes.reduce((s, e) => s + e.metricas.segundosPractica, 0);

  const notas = estudiantes
    .map(e => e.metricas.notaPromedio)
    .filter((n): n is number => n !== null);
  const notaMedia = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;

  const indicadores: Indicador[] = [
    {
      icono: UserCheck,
      etiqueta: 'Docentes activos',
      valor: docentesActivos,
      detalle: `de ${docentes.length} en el equipo`,
      ayuda: 'Docentes con acceso para registrar estudiantes, crear casos y asignar prácticas.',
    },
    {
      icono: UsersRound,
      etiqueta: 'Estudiantes',
      valor: estudiantes.length,
      detalle: `${conCuenta} ya entraron`,
      ayuda:
        'Estudiantes registrados por todos los docentes. Solo quienes ya entraron con su correo institucional pueden recibir un código.',
    },
    {
      icono: MonitorPlay,
      etiqueta: 'Prácticas',
      valor: totalSesiones,
      detalle:
        segundosTotales > 0
          ? `${formatearTiempoPractica(segundosTotales)} de conversación`
          : 'Sin tiempo registrado aún',
      ayuda:
        'Todas las prácticas de la plataforma y el tiempo total que duraron las conversaciones.',
    },
    {
      icono: Activity,
      etiqueta: 'Practicando ahora',
      valor: totalEnCurso,
      detalle: totalEnCurso === 0 ? 'Nadie en el consultorio' : 'En toda la plataforma',
      tono: totalEnCurso > 0 ? 'activo' : undefined,
      ayuda: 'Prácticas abiertas en este momento en toda la plataforma, de cualquier docente.',
    },
    {
      icono: ClipboardCheck,
      etiqueta: 'Por revisar',
      valor: totalPorRevisar,
      detalle:
        notaMedia !== null
          ? `Nota media ${formatoNota.format(notaMedia)}`
          : 'Sin calificaciones aún',
      tono: totalPorRevisar > 0 ? 'atencion' : undefined,
      ayuda:
        'Prácticas terminadas en toda la plataforma que esperan la retroalimentación de su docente. Debajo, la nota media de las ya publicadas.',
    },
    {
      icono: Library,
      etiqueta: 'Casos propios',
      valor: totalCasosPropios,
      detalle: `más ${CASOS_OFICIALES} de PsySim`,
      ayuda:
        'Casos que los docentes crearon con el constructor guiado. Se suman a los 12 casos oficiales de PsySim.',
    },
  ];

  // Primero quien tiene más por revisar; luego quien tiene alguien en curso, más grupo y actividad.
  const destacados = [...docentes]
    .sort(
      (a, b) =>
        b.metricas.pendientesRetroalimentacion - a.metricas.pendientesRetroalimentacion ||
        b.metricas.enCurso - a.metricas.enCurso ||
        b.metricas.estudiantes - a.metricas.estudiantes ||
        b.metricas.sesiones - a.metricas.sesiones
    )
    .slice(0, DOCENTES_DESTACADOS);

  // Primero quienes están practicando ahora; luego por última práctica, historial y cuenta activa.
  const estudiantesDestacados = [...estudiantes]
    .sort(
      (a, b) =>
        b.metricas.enCurso - a.metricas.enCurso ||
        (b.metricas.ultimaSesion ?? '').localeCompare(a.metricas.ultimaSesion ?? '') ||
        b.metricas.sesiones - a.metricas.sesiones ||
        Number(b.cuentaVinculada) - Number(a.cuentaVinculada) ||
        a.nombre.localeCompare(b.nombre, 'es')
    )
    .slice(0, ESTUDIANTES_DESTACADOS);

  const conPracticas = estudiantes.filter(e => e.metricas.sesiones > 0).length;

  return (
    <section
      aria-label="Indicadores y actividad de la plataforma"
      className="flex min-w-0 flex-col gap-6"
    >
      <Indicadores
        indicadores={indicadores}
        disposicion="rejilla"
        className="rounded-2xl shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]"
      />

      {destacados.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 pt-4 pb-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold tracking-[-0.015em]">Actividad por docente</h3>
              <AyudaContextual
                etiqueta="Qué muestra Actividad por docente"
                texto="Cada docente con su grupo: cuántos estudiantes tiene, cuántas prácticas han hecho y cuántas esperan su revisión. Primero quien tiene más pendientes."
              />
            </div>
            <Link
              href="/admin"
              className="rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {docentes.length > destacados.length
                ? `Ver los ${docentes.length} docentes`
                : 'Gestionar docentes'}
            </Link>
          </div>
          <ul className="divide-y border-t text-sm">
            {destacados.map(d => (
              <li
                key={d.id}
                className="group relative flex flex-col gap-1.5 px-5 py-3.5 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      d.activo ? 'bg-salvia' : 'bg-border'
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <Link
                      href={`/admin/docentes/${d.id}`}
                      className="truncate rounded-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                    >
                      {d.nombre}
                    </Link>
                    <span className="truncate text-muted-foreground">
                      {d.metricas.ultimaSesion
                        ? `Última práctica ${tiempoRelativo(d.metricas.ultimaSesion, ahora)}`
                        : d.ultimoAcceso
                          ? `Entró ${tiempoRelativo(d.ultimoAcceso, ahora)}`
                          : 'Aún no ha entrado'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 pl-4.5 text-muted-foreground tabular-nums sm:pl-0">
                  <span>{plural(d.metricas.estudiantes, 'estudiante', 'estudiantes')}</span>
                  <span>{plural(d.metricas.sesiones, 'práctica', 'prácticas')}</span>
                  {d.metricas.enCurso > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-salvia-suave px-2 py-0.5 text-xs font-medium text-salvia-oscuro">
                      <span className="size-1.5 rounded-full bg-salvia" aria-hidden />
                      {d.metricas.enCurso} en curso
                    </span>
                  )}
                  {d.metricas.pendientesRetroalimentacion > 0 ? (
                    <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
                      {d.metricas.pendientesRetroalimentacion} por revisar
                    </span>
                  ) : (
                    <span>Al día</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 pt-4 pb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold tracking-[-0.015em]">Actividad de estudiantes</h3>
            <AyudaContextual
              etiqueta="Qué muestra Actividad de estudiantes"
              texto="Estudiantes de toda la plataforma: primero quienes practican en este momento y luego los de práctica más reciente."
            />
            {estudiantes.length > 0 && (
              <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
                · {conPracticas} de {estudiantes.length} con prácticas
              </span>
            )}
          </div>
          <Link
            href="/estudiantes"
            className="rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {estudiantes.length > estudiantesDestacados.length
              ? `Ver los ${estudiantes.length} estudiantes`
              : 'Gestionar estudiantes'}
          </Link>
        </div>
        {estudiantesDestacados.length === 0 ? (
          <p className="border-t px-5 py-4 text-sm text-muted-foreground">
            Todavía no hay estudiantes registrados en la plataforma.
          </p>
        ) : (
          <ul className="divide-y border-t text-sm">
            {estudiantesDestacados.map(e => (
              <li
                key={e.id}
                className="group relative flex flex-col gap-1.5 px-5 py-3.5 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      e.metricas.enCurso > 0
                        ? 'bg-salvia'
                        : e.metricas.sesiones > 0
                          ? 'bg-salvia-oscuro/65'
                          : 'bg-border'
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <Link
                        href={`/estudiantes/${e.id}`}
                        className="truncate rounded-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                      >
                        {e.nombre}
                      </Link>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {e.codigo}
                      </span>
                    </div>
                    <span className="truncate text-muted-foreground">
                      {[
                        e.docente?.nombre,
                        e.metricas.enCurso > 0
                          ? 'Practicando ahora'
                          : e.metricas.ultimaSesion
                            ? `Última práctica ${tiempoRelativo(e.metricas.ultimaSesion, ahora)}`
                            : e.cuentaVinculada
                              ? 'Con cuenta · sin prácticas aún'
                              : 'Aún no ha entrado',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 pl-4.5 text-muted-foreground tabular-nums sm:pl-0">
                  <span>
                    {plural(e.metricas.sesiones, 'práctica', 'prácticas')}
                    {e.metricas.segundosPractica > 0
                      ? ` · ${formatearTiempoPractica(e.metricas.segundosPractica)}`
                      : ''}
                  </span>
                  {e.metricas.enCurso > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-salvia-suave px-2 py-0.5 text-xs font-medium text-salvia-oscuro">
                      <span className="size-1.5 rounded-full bg-salvia" aria-hidden />
                      En curso
                    </span>
                  ) : e.metricas.pendientesRetroalimentacion > 0 ? (
                    <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
                      {e.metricas.pendientesRetroalimentacion} por revisar
                    </span>
                  ) : e.metricas.notaPromedio !== null ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      Nota {formatoNota.format(e.metricas.notaPromedio)}
                    </span>
                  ) : e.metricas.codigosPendientes > 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {plural(e.metricas.codigosPendientes, 'código', 'códigos')}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
