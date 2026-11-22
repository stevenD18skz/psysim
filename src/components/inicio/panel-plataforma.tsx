import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MonitorPlay,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { type Indicador, Indicadores } from '@/components/comun/indicadores';
import {
  BarraSubHero,
  EncabezadoHeroTrabajo,
  type EnlaceHero,
  MarcoHeroInicio,
} from '@/components/inicio/marco-hero';
import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { Button } from '@/components/ui/button';
import { leerConfiguracionIa } from '@/lib/admin/ia';
import { formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import { cn } from '@/lib/utils';
import { type DocenteAdmin, type EstudianteRegistrado } from '@/types';

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

export interface ResumenGrupoPropio {
  estudiantesCount: number;
  conCuenta: number;
  porRevisar: number;
  conBorrador: number;
  practicandoAhora: number;
  totalPracticas: number;
  finalizadas: number;
  codigosSinUsar: number;
  notaMedia: number | null;
}

/**
 * Vista del Administrador sobre toda la plataforma: arriba las cifras globales (docentes,
 * estudiantes y prácticas en vivo), en la segunda franja los indicadores propios de sus
 * estudiantes como docente y debajo la actividad reciente por docente y estudiante.
 */
export function PanelPlataforma({
  docentes,
  estudiantes,
  tuGrupo,
  adminId,
  ahora,
}: {
  docentes: DocenteAdmin[];
  estudiantes: EstudianteRegistrado[];
  tuGrupo: ResumenGrupoPropio;
  adminId: string;
  ahora: Date;
}) {
  const docentesActivos = docentes.filter(d => d.activo).length;
  const conCuenta = estudiantes.filter(e => e.cuentaVinculada).length;
  const totalSesiones = docentes.reduce((s, d) => s + d.metricas.sesiones, 0);
  const totalEnCurso = docentes.reduce((s, d) => s + d.metricas.enCurso, 0);
  const totalCasosPropios = docentes.reduce((s, d) => s + d.metricas.casosPropios, 0);
  const segundosTotales = estudiantes.reduce((s, e) => s + e.metricas.segundosPractica, 0);

  const indicadoresPlataforma: Indicador[] = [
    {
      icono: UserCheck,
      etiqueta: 'Docentes activos',
      valor: docentesActivos,
      enlace: '/admin',
      detalle: `de ${docentes.length} en el equipo`,
      ayuda: 'Docentes con acceso para registrar estudiantes, crear casos y asignar prácticas.',
    },
    {
      icono: UsersRound,
      etiqueta: 'Estudiantes',
      valor: estudiantes.length,
      enlace: '/estudiantes',
      detalle:
        segundosTotales > 0
          ? `${conCuenta} con cuenta · ${formatearTiempoPractica(segundosTotales)}`
          : `${conCuenta} ya entraron`,
      ayuda:
        'Estudiantes registrados por todos los docentes. Quienes ya entraron con su correo institucional pueden recibir códigos.',
    },
    {
      icono: IndicadorEnVivo,
      etiqueta: 'Practicando ahora',
      valor: totalEnCurso,
      detalle: totalEnCurso === 0 ? 'Nadie en el consultorio' : 'En toda la plataforma',
      tono: totalEnCurso > 0 ? 'activo' : undefined,
      ayuda: 'Prácticas abiertas en este momento en toda la plataforma, de cualquier docente.',
    },
  ];

  const indicadoresGrupoPropio: Indicador[] = [
    {
      icono: GraduationCap,
      etiqueta: 'Tus estudiantes',
      valor: tuGrupo.estudiantesCount,
      enlace: '/estudiantes',
      detalle:
        tuGrupo.estudiantesCount === 0
          ? 'Sin registros aún'
          : tuGrupo.practicandoAhora > 0
            ? `${tuGrupo.conCuenta} con cuenta · ${tuGrupo.practicandoAhora} en vivo`
            : `${tuGrupo.conCuenta} con cuenta`,
      ayuda: 'Estudiantes asignados directamente a tu grupo como docente.',
    },
    {
      icono: ClipboardCheck,
      etiqueta: 'Por revisar',
      valor: tuGrupo.porRevisar,
      enlace: '/sesiones',
      detalle:
        tuGrupo.notaMedia !== null
          ? `Nota media ${formatoNota.format(tuGrupo.notaMedia)}`
          : tuGrupo.conBorrador > 0
            ? `${tuGrupo.conBorrador} en borrador`
            : tuGrupo.porRevisar === 0
              ? 'Al día con tu grupo'
              : 'Sin notas aún',
      tono: tuGrupo.porRevisar > 0 ? 'atencion' : undefined,
      ayuda:
        'Prácticas de tus propios estudiantes pendientes de retroalimentación. Debajo aparece la nota media de sus prácticas calificadas.',
    },
    {
      icono: MonitorPlay,
      etiqueta: 'Tus prácticas',
      valor: tuGrupo.totalPracticas,
      enlace: '/sesiones?vista=todas',
      detalle:
        tuGrupo.totalPracticas === 0
          ? tuGrupo.codigosSinUsar > 0
            ? plural(tuGrupo.codigosSinUsar, 'código sin usar', 'códigos sin usar')
            : 'Sin prácticas aún'
          : `${plural(tuGrupo.finalizadas, 'terminada', 'terminadas')}${tuGrupo.codigosSinUsar > 0 ? ` · ${plural(tuGrupo.codigosSinUsar, 'código', 'códigos')}` : ''}`,
      ayuda: 'Prácticas acumuladas de tus estudiantes y códigos vigentes que aún no han usado.',
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
      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/25 px-5 py-2.5 text-xs">
          <span className="font-semibold text-foreground">Toda la plataforma</span>
          <span className="text-muted-foreground tabular-nums">
            {plural(totalSesiones, 'práctica', 'prácticas')} ·{' '}
            {plural(totalCasosPropios, 'caso propio', 'casos propios')}
          </span>
        </div>
        <Indicadores indicadores={indicadoresPlataforma} disposicion="rejilla" sinMarco />

        <div className="flex flex-wrap items-center justify-between gap-2 border-y bg-muted/25 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">Tus estudiantes</span>
            <AyudaContextual
              etiqueta="Indicadores de tu grupo"
              texto="Estas tres cifras muestran solo tu actividad docente: tus estudiantes asignados, lo que falta por revisar con su promedio y sus prácticas."
            />
          </div>
          <Link
            href="/sesiones"
            className="rounded-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            Ir a Revisiones
          </Link>
        </div>
        <Indicadores indicadores={indicadoresGrupoPropio} disposicion="rejilla" sinMarco />
      </div>

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
                className="group relative flex flex-col gap-1.5 px-5 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Link
                        href={`/admin/docentes/${d.id}`}
                        className="truncate rounded-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                      >
                        {d.nombre}
                      </Link>
                      {d.id === adminId && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Tú
                        </span>
                      )}
                      {!d.activo && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <span className="truncate text-muted-foreground">
                      {d.metricas.ultimaSesion
                        ? `Última práctica ${tiempoRelativo(d.metricas.ultimaSesion, ahora)}`
                        : d.ultimoAcceso
                          ? `Entró ${tiempoRelativo(d.ultimoAcceso, ahora)}`
                          : 'Aún no ha entrado'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 pl-4.5 text-xs text-muted-foreground tabular-nums sm:pl-0">
                  <span>
                    {plural(d.metricas.estudiantes, 'estudiante', 'estudiantes')} ·{' '}
                    {plural(d.metricas.sesiones, 'práctica', 'prácticas')}
                  </span>
                  {d.metricas.enCurso > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-medium text-salvia-oscuro">
                      <IndicadorEnVivo className="size-3.5 shrink-0" />
                      {d.metricas.enCurso} en curso
                    </span>
                  )}
                  <span className="sm:flex sm:min-w-26 sm:justify-end">
                    {d.metricas.pendientesRetroalimentacion > 0 ? (
                      <span className="rounded-full bg-ambar-suave px-2.5 py-0.5 text-xs font-medium text-ambar">
                        {d.metricas.pendientesRetroalimentacion} por revisar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-medium text-salvia-oscuro">
                        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                        Al día
                      </span>
                    )}
                  </span>
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
          <EstadoVacio
            variante="compacto"
            icono={UsersRound}
            tono="salvia"
            titulo="Sin estudiantes registrados todavía"
            descripcion="Cuando los docentes registren a sus grupos con correo institucional, su actividad aparecerá aquí."
            accion={
              <Button asChild size="sm" variant="outline">
                <Link href="/estudiantes">
                  Ir a Estudiantes
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y border-t text-sm">
            {estudiantesDestacados.map(e => (
              <li
                key={e.id}
                className="group relative flex flex-col gap-1.5 px-5 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
                  <AvatarCuenta
                    avatarId={e.avatarId}
                    nombre={e.nombre}
                    className="size-8 text-xs"
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
                    <span
                      className={cn(
                        'truncate text-muted-foreground',
                        e.metricas.enCurso > 0 && 'font-medium text-salvia-oscuro'
                      )}
                    >
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
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 pl-15 text-muted-foreground tabular-nums sm:pl-0">
                  <span>
                    {plural(e.metricas.sesiones, 'práctica', 'prácticas')}
                    {e.metricas.segundosPractica > 0
                      ? ` · ${formatearTiempoPractica(e.metricas.segundosPractica)}`
                      : ''}
                  </span>
                  <span className="sm:flex sm:min-w-26 sm:justify-end">
                    {e.metricas.enCurso > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-salvia-suave px-2 py-0.5 text-xs font-medium text-salvia-oscuro">
                        <IndicadorEnVivo className="size-3.5 shrink-0" />
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
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
