import { ArrowRight, Bot, ShieldCheck } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { type Indicador, Indicadores } from '@/components/comun/indicadores';
import { leerConfiguracionIa } from '@/lib/admin/ia';
import { formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { tiempoRelativo } from '@/lib/fechas';
import { cn } from '@/lib/utils';
import { type DocenteAdmin, type EstudianteRegistrado } from '@/types';

/** Casos oficiales de PsySim (E-01 a E-12), además de los que crean los docentes. */
const CASOS_OFICIALES = 12;
/** Docentes visibles en «Actividad por docente»; el resto está en Docentes. */
const DOCENTES_DESTACADOS = 5;

const ACCESOS: { href: Route; texto: string }[] = [
  { href: '/admin', texto: 'Docentes' },
  { href: '/estudiantes', texto: 'Estudiantes' },
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
 * Vista del Administrador sobre toda la plataforma: el proveedor del paciente, las cifras globales
 * de docentes, estudiantes y prácticas, y qué docentes tienen más actividad o más pendientes.
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
  const configIa = leerConfiguracionIa();
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
      etiqueta: 'Docentes activos',
      valor: docentesActivos,
      detalle: `de ${docentes.length} en el equipo`,
      ayuda: 'Docentes con acceso para registrar estudiantes, crear casos y asignar prácticas.',
    },
    {
      etiqueta: 'Estudiantes',
      valor: estudiantes.length,
      detalle: `${conCuenta} ya entraron`,
      ayuda:
        'Estudiantes registrados por todos los docentes. Solo quienes ya entraron con su correo institucional pueden recibir un código.',
    },
    {
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
      etiqueta: 'Practicando ahora',
      valor: totalEnCurso,
      detalle: totalEnCurso === 0 ? 'Nadie en el consultorio' : 'En toda la plataforma',
      ayuda: 'Prácticas abiertas en este momento en toda la plataforma, de cualquier docente.',
    },
    {
      etiqueta: 'Por revisar',
      valor: totalPorRevisar,
      detalle:
        notaMedia !== null
          ? `Nota media ${formatoNota.format(notaMedia)}`
          : 'Sin calificaciones aún',
      ayuda:
        'Prácticas terminadas en toda la plataforma que esperan la retroalimentación de su docente. Debajo, la nota media de las ya publicadas.',
    },
    {
      etiqueta: 'Casos propios',
      valor: totalCasosPropios,
      detalle: `más ${CASOS_OFICIALES} de PsySim`,
      ayuda:
        'Casos que los docentes crearon con el constructor guiado. Se suman a los 12 casos oficiales de PsySim.',
    },
  ];

  // Primero quien tiene más por revisar; luego quien tiene más grupo y más actividad.
  const destacados = [...docentes]
    .sort(
      (a, b) =>
        b.metricas.pendientesRetroalimentacion - a.metricas.pendientesRetroalimentacion ||
        b.metricas.estudiantes - a.metricas.estudiantes ||
        b.metricas.sesiones - a.metricas.sesiones
    )
    .slice(0, DOCENTES_DESTACADOS);

  const orquestador = configIa.proveedor === 'orquestador' && configIa.orquestadorListo;

  return (
    <section aria-labelledby="resumen-plataforma" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl vetas-nogal px-5 py-4 text-sidebar-foreground sm:px-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-laton" aria-hidden />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 id="resumen-plataforma" className="text-xl font-bold tracking-[-0.015em]">
                La plataforma
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-accent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-laton-texto">
                <Bot className="size-3.5" aria-hidden />
                {orquestador
                  ? `Orquestador · ${plural(configIa.capacidad, 'práctica', 'prácticas')} a la vez`
                  : 'Paciente con Gemini directo'}
              </span>
            </div>
            <p className="text-sm text-sidebar-muted">
              Docentes, estudiantes y prácticas de todo el equipo, no solo los tuyos.
            </p>
          </div>
        </div>
        <nav
          aria-label="Administración"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-sidebar-border pt-3 text-sm"
        >
          {ACCESOS.map(acceso => (
            <Link
              key={acceso.href}
              href={acceso.href}
              className="group inline-flex items-center gap-1 rounded-md font-semibold text-laton-texto underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              {acceso.texto}
              <ArrowRight
                className="size-3.5 transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </nav>
      </div>

      <Indicadores indicadores={indicadores} disposicion="rejilla" />

      {destacados.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
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
    </section>
  );
}
