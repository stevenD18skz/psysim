import { AlertTriangle, ArrowRight, Bot, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import {
  type ConfiguracionIa,
  ETIQUETA_CAMBIO,
  ETIQUETA_ERROR,
  type MetricasIa,
} from '@/lib/admin/ia';
import { cn } from '@/lib/utils';

const numero = new Intl.NumberFormat('es-CO');
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

function segundos(ms: number | null): string {
  return ms === null ? '—' : `${decimal.format(ms / 1000)} s`;
}

function plural(n: number, uno: string, varios: string): string {
  return `${numero.format(n)} ${n === 1 ? uno : varios}`;
}

/**
 * Bloque compacto del riel lateral para el Administrador: resume el desempeño del orquestador de
 * NPC en los últimos 7 días, si alguna práctica pasó a Gemini y la capacidad en uso.
 */
export function ResumenOrquestador({
  configuracion,
  metricas,
}: {
  configuracion: ConfiguracionIa;
  metricas: MetricasIa | null;
}) {
  const usandoOrquestador =
    configuracion.proveedor === 'orquestador' && configuracion.orquestadorListo;
  const orq = metricas?.proveedores.find(p => p.proveedor === 'orquestador') ?? null;
  const gem = metricas?.proveedores.find(p => p.proveedor === 'gemini') ?? null;

  const turnosOrq = orq?.turnos ?? 0;
  const turnosGem = gem?.turnos ?? 0;
  const turnosTotales = turnosOrq + turnosGem;
  const porcentajeOrq = turnosTotales > 0 ? Math.round((turnosOrq / turnosTotales) * 100) : null;

  const pasaronAGemini = metricas?.practicas.pasaron_a_gemini ?? 0;
  const totalPracticas = metricas?.practicas.total ?? 0;
  const erroresLista = metricas?.eventos.filter(e => e.tipo === 'error') ?? [];
  const esperasLista =
    metricas?.eventos.filter(e => e.tipo === 'espera' || e.tipo === 'limite') ?? [];
  const totalErrores = erroresLista.reduce((suma, item) => suma + item.veces, 0);
  const totalEsperas = esperasLista.reduce((suma, item) => suma + item.veces, 0);
  const cuentasActivas = metricas?.cuentas.reduce((suma, item) => suma + item.activas, 0) ?? 0;

  const motivoPrincipal = [...(metricas?.cambios ?? [])].sort(
    (a, b) => b.practicas - a.practicas
  )[0];
  const errorPrincipal = [...erroresLista].sort((a, b) => b.veces - a.veces)[0];

  const estado =
    !configuracion.orquestadorListo && configuracion.proveedor === 'orquestador'
      ? ({ texto: 'En respaldo (Gemini)', tono: 'pendiente' } as const)
      : configuracion.proveedor === 'gemini'
        ? ({ texto: 'Solo Gemini', tono: 'neutro' } as const)
        : pasaronAGemini > 0
          ? ({
              texto: `${numero.format(pasaronAGemini)} ${pasaronAGemini === 1 ? 'pasó' : 'pasaron'} a Gemini`,
              tono: 'pendiente',
            } as const)
          : totalErrores > 0
            ? ({ texto: `${plural(totalErrores, 'aviso', 'avisos')}`, tono: 'pendiente' } as const)
            : ({
                texto: totalPracticas > 0 ? 'Orquestador estable' : 'Orquestador listo',
                tono: 'listo',
              } as const);

  return (
    <section
      aria-labelledby="resumen-orquestador-titulo"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Bot className="size-4 shrink-0 text-laton" aria-hidden />
            <h2 id="resumen-orquestador-titulo" className="text-base font-bold tracking-[-0.015em]">
              Orquestador de NPC
            </h2>
            <AyudaContextual
              etiqueta="Qué resume Orquestador de NPC"
              texto="Comportamiento del servicio principal de IA en los últimos 7 días: cuántas prácticas atendió el orquestador, cuántas pasaron al respaldo de Gemini, latencia y fallos."
            />
          </div>
          <div className="pt-0.5">
            <InsigniaEstado estado={estado} />
          </div>
        </div>
        <Link
          href="/admin/ia"
          className="group inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          Ver detalle
          <ArrowRight
            className="size-3.5 transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>

      {metricas === null ? (
        <p className="border-t px-5 py-4 text-sm text-muted-foreground">
          No pudimos leer las métricas de los últimos 7 días. Revisa el estado completo en{' '}
          <Link
            href="/admin/ia"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Paciente con IA
          </Link>
          .
        </p>
      ) : (
        <>
          {porcentajeOrq !== null && (
            <div className="flex flex-col gap-2 border-t px-5 py-3.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-muted-foreground">
                  Respuestas en los últimos 7 días
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {porcentajeOrq} % orquestador
                </span>
              </div>
              <div aria-hidden className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {turnosOrq > 0 && (
                  <span
                    className="h-full bg-salvia transition-all"
                    style={{ width: `${porcentajeOrq}%` }}
                  />
                )}
                {turnosGem > 0 && (
                  <span
                    className="h-full bg-ambar transition-all"
                    style={{ width: `${100 - porcentajeOrq}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full bg-salvia" />
                  Orquestador: {numero.format(turnosOrq)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full bg-ambar" />
                  Respaldo Gemini: {numero.format(turnosGem)}
                </span>
              </div>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-px border-t bg-border">
            <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Pasaron a Gemini</dt>
              <dd
                className={cn(
                  'text-base font-bold tabular-nums',
                  pasaronAGemini > 0 ? 'text-ambar' : 'text-foreground'
                )}
              >
                {numero.format(pasaronAGemini)} de {numero.format(totalPracticas)}
              </dd>
              <dd className="text-xs text-muted-foreground tabular-nums">
                {metricas.turnos_de_respaldo > 0
                  ? `${plural(metricas.turnos_de_respaldo, 'turno', 'turnos')} de respaldo`
                  : 'En los últimos 7 días'}
              </dd>
            </div>

            <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Latencia media</dt>
              <dd className="text-base font-bold text-foreground tabular-nums">
                {segundos(orq?.latencia_media_ms ?? null)}
              </dd>
              <dd className="text-xs text-muted-foreground tabular-nums">
                {orq?.latencia_p95_ms !== null && orq?.latencia_p95_ms !== undefined
                  ? `p95 ${segundos(orq.latencia_p95_ms)}`
                  : `${plural(turnosTotales, 'respuesta', 'respuestas')}`}
              </dd>
            </div>

            <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Errores y esperas</dt>
              <dd
                className={cn(
                  'text-base font-bold tabular-nums',
                  totalErrores > 0 ? 'text-ambar' : 'text-foreground'
                )}
              >
                {plural(totalErrores, 'error', 'errores')}
              </dd>
              <dd className="text-xs text-muted-foreground tabular-nums">
                {plural(totalEsperas, 'espera', 'esperas')} por cupo
              </dd>
            </div>

            <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Cupo simultáneo</dt>
              <dd className="text-base font-bold text-foreground tabular-nums">
                {usandoOrquestador
                  ? `${numero.format(cuentasActivas)} / ${numero.format(configuracion.capacidad)}`
                  : 'Respaldo'}
              </dd>
              <dd className="text-xs text-muted-foreground tabular-nums">
                {usandoOrquestador
                  ? configuracion.cuentasDelGrupo <= 1
                    ? '1 cuenta activa'
                    : `${configuracion.cuentasDelGrupo} cuentas activas`
                  : 'Sin cuentas del grupo'}
              </dd>
            </div>
          </dl>

          <div
            className={cn(
              'flex items-start gap-2 border-t px-4 py-3 text-xs leading-relaxed',
              pasaronAGemini > 0 ||
                totalErrores > 0 ||
                (!usandoOrquestador && configuracion.proveedor === 'orquestador')
                ? 'bg-ambar-suave/50 text-foreground'
                : 'bg-muted/20 text-muted-foreground'
            )}
          >
            {!usandoOrquestador && configuracion.proveedor === 'orquestador' ? (
              <>
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-ambar" aria-hidden />
                <span>
                  Faltan credenciales válidas del orquestador; las prácticas nuevas responden con
                  Gemini.
                </span>
              </>
            ) : motivoPrincipal ? (
              <>
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-ambar" aria-hidden />
                <span>
                  Motivo principal del paso a Gemini:{' '}
                  <span className="font-semibold">
                    {ETIQUETA_CAMBIO[motivoPrincipal.motivo ?? ''] ??
                      motivoPrincipal.motivo ??
                      'sin especificar'}
                  </span>{' '}
                  ({plural(motivoPrincipal.practicas, 'práctica', 'prácticas')}).
                </span>
              </>
            ) : errorPrincipal ? (
              <>
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-ambar" aria-hidden />
                <span>
                  Fallo más frecuente:{' '}
                  <span className="font-semibold">
                    {ETIQUETA_ERROR[errorPrincipal.detalle] ?? errorPrincipal.detalle}
                  </span>{' '}
                  ({plural(errorPrincipal.veces, 'vez', 'veces')}).
                </span>
              </>
            ) : totalPracticas === 0 ? (
              <span>
                Sin conversaciones en los últimos 7 días. Capacidad lista para{' '}
                {plural(configuracion.capacidad, 'práctica simultánea', 'prácticas simultáneas')}.
              </span>
            ) : (
              <>
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-salvia-oscuro" aria-hidden />
                <span>
                  Todas las prácticas de los últimos 7 días se sostuvieron en el orquestador sin
                  pasar a Gemini.
                </span>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
