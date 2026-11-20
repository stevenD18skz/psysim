import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Gauge,
  KeyRound,
  Layers,
  MonitorPlay,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { TopePracticas } from '@/components/admin/tope-practicas';
import { PistaFaro } from '@/components/ayuda/pista-contextual';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { IndicadorEnVivo } from '@/components/comun/indicador-en-vivo';
import { Indicadores } from '@/components/comun/indicadores';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import {
  ETIQUETA_CAMBIO,
  ETIQUETA_ERROR,
  leerConfiguracionIa,
  type MetricasIa,
  obtenerMetricasIa,
  type PeriodoMetricas,
  PERIODOS_METRICAS,
} from '@/lib/admin/ia';
import { requerirSuperadmin } from '@/lib/auth/dal';
import { PRACTICAS_POR_CUENTA } from '@/lib/orquestador/cuentas';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Paciente con IA',
};

const ETIQUETA_PERIODO: Record<PeriodoMetricas, string> = {
  1: 'Hoy',
  7: '7 días',
  30: '30 días',
  90: '90 días',
};

const ETIQUETA_PROVEEDOR: Record<string, string> = {
  orquestador: 'Orquestador de NPC',
  gemini: 'Gemini',
};

const numero = new Intl.NumberFormat('es-CO');
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

const segundos = (ms: number | null) => (ms === null ? '—' : `${decimal.format(ms / 1000)} s`);

function leerPeriodo(valor: string | string[] | undefined): PeriodoMetricas {
  const dias = Number(valor);
  return PERIODOS_METRICAS.find(periodo => periodo === dias) ?? 7;
}

/**
 * Vista del Administrador sobre el paciente con IA: quién está respondiendo (el orquestador de NPC
 * o Gemini), cuánto tarda y cuánto consume cada uno, qué prácticas pasaron al respaldo y por qué,
 * los errores del orquestador y el uso de sus cuentas. Aquí también se activa el tope de prácticas
 * simultáneas. Todo sale de lo que PsySim guardó: no evalúa a ningún estudiante.
 */
export default async function AdminIaPage({ searchParams }: PageProps<'/admin/ia'>) {
  await requerirSuperadmin();

  const periodo = leerPeriodo((await searchParams).dias);
  const configuracion = leerConfiguracionIa();
  const metricas = await obtenerMetricasIa(periodo);

  const turnos = metricas.proveedores.reduce((suma, p) => suma + p.turnos, 0);
  const turnosOrquestador =
    metricas.proveedores.find(p => p.proveedor === 'orquestador')?.turnos ?? 0;
  const turnosGemini = metricas.proveedores.find(p => p.proveedor === 'gemini')?.turnos ?? 0;
  const pctOrquestador = turnos > 0 ? Math.round((turnosOrquestador / turnos) * 100) : 0;
  const pctGemini = turnos > 0 ? Math.max(0, 100 - pctOrquestador) : 0;

  const errores = metricas.eventos.filter(evento => evento.tipo === 'error');
  const totalErrores = errores.reduce((suma, e) => suma + e.veces, 0);
  const esperas = metricas.eventos.filter(
    evento => evento.tipo === 'espera' || evento.tipo === 'limite'
  );
  const totalEsperas = esperas.reduce((suma, e) => suma + e.veces, 0);
  const cuentas = Math.max(1, configuracion.cuentasDelGrupo);
  const totalActivas = metricas.cuentas.reduce((suma, c) => suma + c.activas, 0);
  const cierresTotal =
    metricas.practicas.cierres_por_crisis + metricas.practicas.cierres_por_conducta;
  const pctRespaldo =
    metricas.practicas.total > 0
      ? Math.round((metricas.practicas.pasaron_a_gemini / metricas.practicas.total) * 100)
      : 0;

  const proveedoresPorClave = new Map(metricas.proveedores.map(p => [p.proveedor, p]));
  const clavesProveedores = [
    'orquestador',
    'gemini',
    ...metricas.proveedores
      .map(p => p.proveedor)
      .filter(p => p !== 'orquestador' && p !== 'gemini'),
  ];

  const cuentasPorClave = new Map(metricas.cuentas.map(c => [c.cuenta, c]));
  const clavesCuentas = [
    ...Object.keys(configuracion.etiquetas),
    ...metricas.cuentas.map(c => c.cuenta).filter(c => !(c in configuracion.etiquetas)),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <RefrescoAutomatico activo={totalActivas > 0} segundos={30} />

      <EncabezadoPagina
        titulo="Paciente con IA"
        descripcion="Quién responde como paciente, cuánto tarda y qué pasó cuando algo falló. Estas cifras describen el servicio, no a los estudiantes."
        acciones={
          <PistaSegmentada
            elemento="nav"
            aria-label="Periodo de métricas"
            className="flex gap-1 rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-1"
            claseIndicador="rounded-lg bg-card shadow-xs"
          >
            {PERIODOS_METRICAS.map(dias => {
              const activo = dias === periodo;
              return (
                <Link
                  key={dias}
                  href={`/admin/ia?dias=${dias}`}
                  scroll={false}
                  aria-current={activo ? 'page' : undefined}
                  className={cn(
                    'flex min-h-9 items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid',
                    activo
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-sidebar-muted hover:text-sidebar-foreground'
                  )}
                >
                  {ETIQUETA_PERIODO[dias]}
                </Link>
              );
            })}
          </PistaSegmentada>
        }
        subbarra={
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-sidebar-muted">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span>
                Periodo:{' '}
                <strong className="font-semibold text-sidebar-foreground">
                  {ETIQUETA_PERIODO[periodo]}
                </strong>
              </span>
              <span aria-hidden className="text-sidebar-border">
                ·
              </span>
              <span>
                Capacidad estimada:{' '}
                <strong className="font-semibold text-sidebar-foreground tabular-nums">
                  {configuracion.orquestadorListo
                    ? `${configuracion.capacidad} prácticas simultáneas`
                    : 'Solo respaldo Gemini'}
                </strong>
              </span>
              {totalActivas > 0 && (
                <>
                  <span aria-hidden className="text-sidebar-border">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-lino tabular-nums">
                    <IndicadorEnVivo className="size-3.5 text-laton-claro" />
                    {totalActivas} en curso ahora
                  </span>
                </>
              )}
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 font-medium text-laton-texto transition-colors hover:text-lino focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laton-claro focus-visible:outline-solid"
            >
              Ver docentes
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      />

      <ContenedorHero>
        <EstadoDelProveedor
          configuracion={configuracion}
          tope={metricas.tope_practicas_por_cuenta}
          cuentas={cuentas}
        />

        <Indicadores
          indicadores={[
            {
              icono: Bot,
              etiqueta: 'Respuestas del paciente',
              valor: turnos,
              detalle:
                turnos > 0
                  ? `${pctOrquestador} % en orquestador`
                  : 'Sin respuestas en este periodo',
              ayuda: 'Total de turnos generados por el paciente IA durante el periodo elegido.',
            },
            {
              icono: MonitorPlay,
              etiqueta: 'Prácticas',
              valor: metricas.practicas.total,
              detalle:
                metricas.practicas.total > 0
                  ? `${numero.format(metricas.practicas.en_orquestador)} iniciaron en orquestador`
                  : 'Sin prácticas en este periodo',
              ayuda: 'Prácticas registradas con telemetría del proveedor en este periodo.',
            },
            {
              icono: RefreshCw,
              etiqueta: 'Pasaron a Gemini',
              valor: metricas.practicas.pasaron_a_gemini,
              detalle:
                metricas.practicas.pasaron_a_gemini > 0
                  ? `${pctRespaldo} % del total`
                  : 'Sin cambios al respaldo',
              tono: metricas.practicas.pasaron_a_gemini > 0 ? 'atencion' : undefined,
              ayuda:
                'Prácticas que comenzaron en el orquestador y cambiaron automáticamente a Gemini ante un fallo, demora o corte.',
            },
            {
              icono: AlertTriangle,
              etiqueta: 'Cierres automáticos',
              valor: cierresTotal,
              detalle:
                cierresTotal > 0
                  ? `${metricas.practicas.cierres_por_crisis} crisis · ${metricas.practicas.cierres_por_conducta} conducta`
                  : 'Ningún cierre automático',
              tono: cierresTotal > 0 ? 'atencion' : undefined,
              ayuda:
                'Prácticas cerradas por el sistema ante crisis clínica severa o trato inapropiado.',
            },
          ]}
        />

        <Seccion id="proveedores" titulo="Respuestas por proveedor" vacio={false}>
          <div className="flex flex-col gap-3">
            {turnos > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl border bg-card px-5 py-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-foreground">
                    <span className="size-2.5 rounded-full bg-salvia-oscuro" aria-hidden />
                    Orquestador de NPC: {pctOrquestador} % ({numero.format(turnosOrquestador)})
                  </span>
                  <span className="inline-flex items-center gap-2 font-medium text-foreground">
                    <span className="size-2.5 rounded-full bg-laton" aria-hidden />
                    Respaldo Gemini: {pctGemini} % ({numero.format(turnosGemini)})
                  </span>
                </div>
                <div
                  aria-hidden
                  className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  {pctOrquestador > 0 && (
                    <div
                      className="h-full bg-salvia-oscuro"
                      style={{ width: `${pctOrquestador}%` }}
                    />
                  )}
                  {pctGemini > 0 && (
                    <div className="h-full bg-laton" style={{ width: `${pctGemini}%` }} />
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">Respuestas por proveedor</caption>
                <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium">
                      Proveedor
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Respuestas
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Latencia media
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      <span className="inline-flex items-center justify-end gap-1">
                        Latencia p95
                        <AyudaContextual
                          etiqueta="Qué es la latencia p95"
                          texto="Tiempo máximo que tardó el 95 % de las respuestas (incluye la espera por cupo). Ayuda a detectar picos lentos aunque el promedio sea bajo."
                        />
                      </span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Tokens (ent. / sal.)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      <span className="inline-flex items-center justify-end gap-1">
                        Severidad media
                        <AyudaContextual
                          etiqueta="Qué es la severidad media"
                          texto="Promedio de alteración emocional reportada por el paciente (0 en calma a 5 desbordado) durante las respuestas."
                        />
                      </span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      <span className="inline-flex items-center justify-end gap-1">
                        Emoción deducida
                        <AyudaContextual
                          etiqueta="Qué es emoción deducida"
                          texto="Respuestas en las que el modelo no envió la etiqueta explícita de emoción y PsySim la dedujo a partir de la severidad."
                        />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clavesProveedores.map(clave => {
                    const p = proveedoresPorClave.get(clave);
                    const esOrquestador = clave === 'orquestador';
                    return (
                      <tr
                        key={clave}
                        className="transition-colors even:bg-muted/30 hover:bg-muted/60"
                      >
                        <th scope="row" className="px-4 py-3.5 text-left font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden
                              className={cn(
                                'size-2.5 shrink-0 rounded-full',
                                esOrquestador ? 'bg-salvia-oscuro' : 'bg-laton'
                              )}
                            />
                            {ETIQUETA_PROVEEDOR[clave] ?? clave}
                          </span>
                        </th>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                          {numero.format(p?.turnos ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {segundos(p?.latencia_media_ms ?? null)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {segundos(p?.latencia_p95_ms ?? null)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                          {numero.format(p?.tokens_entrada ?? 0)} /{' '}
                          {numero.format(p?.tokens_salida ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {p?.severidad_media === null || p?.severidad_media === undefined
                            ? '—'
                            : decimal.format(p.severidad_media)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {numero.format(p?.emociones_deducidas ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {metricas.turnos_de_respaldo > 0 && (
              <p className="text-xs text-muted-foreground">
                {numero.format(metricas.turnos_de_respaldo)} de las respuestas de Gemini ocurrieron
                en prácticas que comenzaron en el orquestador.
              </p>
            )}
          </div>
        </Seccion>

        <div className="grid gap-8 lg:grid-cols-2">
          <Seccion
            id="cambios"
            titulo="Prácticas que pasaron a Gemini"
            contador={metricas.practicas.pasaron_a_gemini}
            tonoContador={metricas.practicas.pasaron_a_gemini > 0 ? 'atencion' : 'neutro'}
            vacio={
              metricas.cambios.length === 0 && {
                titulo: 'Ninguna práctica necesitó el respaldo',
                descripcion:
                  'El orquestador respondió de inicio a fin en las prácticas de este periodo.',
                saludable: true,
              }
            }
          >
            <TablaSimple
              titulo="Motivos del paso a Gemini"
              columnas={['Motivo', 'Prácticas']}
              filas={metricas.cambios.map(cambio => [
                ETIQUETA_CAMBIO[cambio.motivo ?? ''] ?? cambio.motivo ?? 'Sin motivo',
                numero.format(cambio.practicas),
              ])}
            />
          </Seccion>

          <Seccion
            id="errores"
            titulo="Errores del orquestador"
            contador={totalErrores}
            tonoContador={totalErrores > 0 ? 'atencion' : 'neutro'}
            vacio={
              errores.length === 0 && {
                titulo: 'Sin errores en este periodo',
                descripcion:
                  'No se registraron fallos de conexión, tiempo agotado ni respuestas inválidas.',
                saludable: true,
              }
            }
          >
            <TablaSimple
              titulo="Errores del orquestador por tipo"
              columnas={['Tipo', 'Veces']}
              filas={errores.map(error => [
                ETIQUETA_ERROR[error.detalle] ?? error.detalle,
                numero.format(error.veces),
              ])}
            />
          </Seccion>
        </div>

        <Seccion
          id="esperas"
          titulo="Esperas por el límite de mensajes"
          contador={totalEsperas}
          tonoContador={totalEsperas > 0 ? 'atencion' : 'neutro'}
          vacio={
            esperas.length === 0 && {
              titulo: 'Nadie tuvo que esperar por cupo en este periodo',
              descripcion:
                'Las cuentas del orquestador atendieron las solicitudes dentro del límite de 10 mensajes por minuto.',
              saludable: true,
            }
          }
        >
          <TablaSimple
            titulo="Esperas por el límite de mensajes"
            columnas={['Qué pasó', 'Veces', 'Espera media', 'Espera máxima']}
            filas={esperas.map(evento => [
              describirEspera(evento),
              numero.format(evento.veces),
              segundos(evento.espera_media_ms),
              segundos(evento.espera_maxima_ms),
            ])}
          />
        </Seccion>

        <Seccion
          id="cuentas"
          titulo="Cuentas del orquestador"
          contador={clavesCuentas.length}
          vacio={
            clavesCuentas.length === 0 && {
              titulo: 'No hay cuentas del orquestador configuradas en este despliegue',
              descripcion: 'Define ORQUESTADOR_URL y las credenciales en las variables de entorno.',
              saludable: false,
            }
          }
        >
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
            <table className="w-full min-w-[36rem] text-sm">
              <caption className="sr-only">Uso de las cuentas del orquestador</caption>
              <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Cuenta
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Prácticas ({ETIQUETA_PERIODO[periodo]})
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    En curso ahora
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Mensajes último minuto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clavesCuentas.map(clave => {
                  const c = cuentasPorClave.get(clave);
                  const activas = c?.activas ?? 0;
                  const turnosMinuto = c?.turnos_ultimo_minuto ?? 0;
                  const pctMinuto = Math.min(100, Math.round((turnosMinuto / 10) * 100));
                  const altaCarga = turnosMinuto >= 7;
                  return (
                    <tr
                      key={clave}
                      className="transition-colors even:bg-muted/30 hover:bg-muted/60"
                    >
                      <th scope="row" className="px-4 py-3.5 text-left font-medium">
                        {configuracion.etiquetas[clave] ?? 'Cuenta que ya no está configurada'}
                      </th>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {numero.format(c?.practicas ?? 0)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {activas > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-semibold text-salvia-oscuro">
                            <IndicadorEnVivo className="size-3" />
                            {numero.format(activas)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <div className="inline-flex items-center justify-end gap-2.5">
                          <div
                            aria-hidden
                            className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block"
                          >
                            <div
                              className={cn(
                                'h-full rounded-full',
                                altaCarga ? 'bg-ambar' : 'bg-salvia-oscuro'
                              )}
                              style={{ width: `${pctMinuto}%` }}
                            />
                          </div>
                          <span className={cn(altaCarga && 'font-semibold text-ambar')}>
                            {numero.format(turnosMinuto)} / 10
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Seccion>

        <section aria-labelledby="tope-titulo" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="tope-titulo" className="text-xl font-bold tracking-[-0.015em]">
              Tope de prácticas simultáneas
            </h2>
            <PistaFaro
              id="admin-ia-tope"
              etiqueta="Cuándo activarlo"
              titulo="Protege la fluidez en jornadas con todo el salón"
              descripcion="En uso diario puedes dejarlo desactivado. Actívalo antes de una práctica grupal simultánea para evitar colas largas o límites 429 en el orquestador."
            />
          </div>
          <TopePracticas
            tope={metricas.tope_practicas_por_cuenta}
            sugerido={PRACTICAS_POR_CUENTA}
            cuentas={cuentas}
          />
        </section>
      </ContenedorHero>
    </div>
  );
}

function describirEspera(evento: MetricasIa['eventos'][number]): string {
  if (evento.tipo === 'espera') return 'El servidor esperó cupo y el paciente respondió';
  return evento.detalle === 'orquestador'
    ? 'El orquestador rechazó el mensaje por su límite (429)'
    : 'La espera no cabía: se le pidió al estudiante reintentar';
}

function EstadoDelProveedor({
  configuracion,
  tope,
  cuentas,
}: {
  configuracion: ReturnType<typeof leerConfiguracionIa>;
  tope: number | null;
  cuentas: number;
}) {
  const { proveedor, orquestadorListo, cuentasDelGrupo, capacidad } = configuracion;
  const usandoOrquestador = proveedor === 'orquestador' && orquestadorListo;
  let texto: string;
  if (proveedor === 'gemini') {
    texto =
      'Las prácticas nuevas las responde Gemini. Para usar el orquestador de NPC, configura sus variables y pon IA_PROVEEDOR=orquestador.';
  } else if (!orquestadorListo) {
    texto =
      'El proveedor es el orquestador de NPC, pero faltan sus variables o no son válidas: las prácticas las está respondiendo Gemini.';
  } else if (cuentasDelGrupo === 0) {
    texto = `Las prácticas nuevas las responde el orquestador de NPC con una sola cuenta: toda la plataforma comparte sus 10 mensajes por minuto (unas ${capacidad} prácticas a la vez sin esperas). Gemini responde si el orquestador falla.`;
  } else {
    texto = `Las prácticas nuevas las responde el orquestador de NPC con ${cuentasDelGrupo} ${cuentasDelGrupo === 1 ? 'cuenta' : 'cuentas'} del grupo (unas ${capacidad} prácticas a la vez sin esperas). Gemini responde si el orquestador falla.`;
  }

  const estado = usandoOrquestador
    ? ({ texto: 'Orquestador activo', tono: 'listo' } as const)
    : proveedor === 'orquestador'
      ? ({ texto: 'En respaldo (Gemini)', tono: 'pendiente' } as const)
      : ({ texto: 'Solo Gemini', tono: 'neutro' } as const);

  const resumenCapacidad = !orquestadorListo
    ? 'Sin cuentas del orquestador'
    : cuentasDelGrupo === 0
      ? `1 cuenta principal · ${capacidad} simultáneas`
      : `${cuentasDelGrupo} ${cuentasDelGrupo === 1 ? 'cuenta' : 'cuentas'} · ${capacidad} simultáneas`;

  return (
    <section
      aria-labelledby="proveedor-activo-titulo"
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-card p-5',
        SOMBRA_SOBRE_NOGAL,
        proveedor === 'orquestador' && !orquestadorListo && 'border-destructive/40'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="proveedor-activo-titulo" className="text-base font-bold tracking-[-0.01em]">
          Configuración del proveedor
        </h2>
        <InsigniaEstado estado={estado} />
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-2.5">
          <Cpu className="mt-0.5 size-4 shrink-0 text-salvia-oscuro" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Proveedor principal</dt>
            <dd className="font-semibold">{usandoOrquestador ? 'Orquestador de NPC' : 'Gemini'}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-salvia-oscuro" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Respaldo automático</dt>
            <dd className="font-semibold">{usandoOrquestador ? 'Gemini' : 'Desactivado'}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Cuentas del orquestador</dt>
            <dd className="font-semibold">{resumenCapacidad}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Gauge className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Tope simultáneo</dt>
            <dd className="font-semibold tabular-nums">
              {tope === null ? 'Sin tope' : `${tope * cuentas} a la vez (${tope}/cuenta)`}
            </dd>
          </div>
        </div>
      </dl>
      <p className="border-t pt-3 text-sm text-muted-foreground">{texto}</p>
    </section>
  );
}

function Seccion({
  id,
  titulo,
  contador,
  tonoContador = 'neutro',
  vacio,
  children,
}: {
  id: string;
  titulo: string;
  contador?: number;
  tonoContador?: 'neutro' | 'atencion';
  vacio:
    | {
        titulo: string;
        descripcion?: string;
        saludable: boolean;
      }
    | false;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${id}-titulo`} className="text-xl font-bold tracking-[-0.015em]">
          {titulo}
        </h2>
        {contador !== undefined && (
          <span
            className={cn(
              'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              tonoContador === 'atencion'
                ? 'bg-ambar-suave text-ambar'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {numero.format(contador)}
          </span>
        )}
      </div>
      {vacio ? (
        <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-card/80">
          <EstadoVacio
            variante="compacto"
            sinBordeSuperior
            icono={vacio.saludable ? CheckCircle2 : KeyRound}
            tono={vacio.saludable ? 'salvia' : 'neutro'}
            titulo={vacio.titulo}
            descripcion={vacio.descripcion}
          />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function TablaSimple({
  titulo,
  columnas,
  filas,
}: {
  titulo: string;
  columnas: string[];
  filas: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
      <table className="w-full text-sm">
        <caption className="sr-only">{titulo}</caption>
        <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          <tr>
            {columnas.map((columna, indice) => (
              <th
                key={columna}
                scope="col"
                className={cn('px-4 py-3 font-medium', indice === 0 ? 'text-left' : 'text-right')}
              >
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {filas.map(([primera, ...resto]) => (
            <tr key={primera} className="transition-colors even:bg-muted/30 hover:bg-muted/60">
              <th scope="row" className="px-4 py-3 text-left font-medium">
                {primera}
              </th>
              {resto.map((celda, indice) => (
                <td key={columnas[indice + 1]} className="px-4 py-3 text-right tabular-nums">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
