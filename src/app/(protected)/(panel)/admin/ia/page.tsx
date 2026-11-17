import { AlertTriangle, Bot, MonitorPlay, RefreshCw } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { TopePracticas } from '@/components/admin/tope-practicas';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
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
  const errores = metricas.eventos.filter(evento => evento.tipo === 'error');
  const esperas = metricas.eventos.filter(
    evento => evento.tipo === 'espera' || evento.tipo === 'limite'
  );
  const cuentas = Math.max(1, configuracion.cuentasDelGrupo);

  const proveedoresPorClave = new Map(metricas.proveedores.map(p => [p.proveedor, p]));
  const clavesProveedores = [
    'orquestador',
    'gemini',
    ...metricas.proveedores
      .map(p => p.proveedor)
      .filter(p => p !== 'orquestador' && p !== 'gemini'),
  ];
  const filasProveedores = clavesProveedores.map(clave => {
    const p = proveedoresPorClave.get(clave);
    return [
      ETIQUETA_PROVEEDOR[clave] ?? clave,
      numero.format(p?.turnos ?? 0),
      segundos(p?.latencia_media_ms ?? null),
      segundos(p?.latencia_p95_ms ?? null),
      `${numero.format(p?.tokens_entrada ?? 0)} / ${numero.format(p?.tokens_salida ?? 0)}`,
      p?.severidad_media === null || p?.severidad_media === undefined
        ? '—'
        : decimal.format(p.severidad_media),
      numero.format(p?.emociones_deducidas ?? 0),
    ];
  });

  const cuentasPorClave = new Map(metricas.cuentas.map(c => [c.cuenta, c]));
  const clavesCuentas = [
    ...Object.keys(configuracion.etiquetas),
    ...metricas.cuentas.map(c => c.cuenta).filter(c => !(c in configuracion.etiquetas)),
  ];
  const filasCuentas = clavesCuentas.map(clave => {
    const c = cuentasPorClave.get(clave);
    return [
      configuracion.etiquetas[clave] ?? 'Cuenta que ya no está configurada',
      numero.format(c?.practicas ?? 0),
      numero.format(c?.activas ?? 0),
      `${numero.format(c?.turnos_ultimo_minuto ?? 0)} de 10`,
    ];
  });

  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoPagina
        titulo="Paciente con IA"
        descripcion="Quién responde como paciente, cuánto tarda y qué pasó cuando algo falló. Estas cifras describen el servicio, no a los estudiantes."
        acciones={
          <nav
            aria-label="Periodo"
            className="flex gap-1 rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-1"
          >
            {PERIODOS_METRICAS.map(dias => (
              <Link
                key={dias}
                href={`/admin/ia?dias=${dias}`}
                aria-current={dias === periodo ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                  dias === periodo
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-sidebar-muted hover:text-sidebar-foreground'
                )}
              >
                {ETIQUETA_PERIODO[dias]}
              </Link>
            ))}
          </nav>
        }
      />

      <ContenedorHero>
        <EstadoDelProveedor configuracion={configuracion} />

        <Indicadores
          indicadores={[
            { icono: Bot, etiqueta: 'Respuestas del paciente', valor: turnos },
            { icono: MonitorPlay, etiqueta: 'Prácticas', valor: metricas.practicas.total },
            {
              icono: RefreshCw,
              etiqueta: 'Pasaron a Gemini',
              valor: metricas.practicas.pasaron_a_gemini,
            },
            {
              icono: AlertTriangle,
              etiqueta: 'Cierres automáticos',
              valor:
                metricas.practicas.cierres_por_crisis + metricas.practicas.cierres_por_conducta,
            },
          ]}
        />

        <Seccion id="proveedores" titulo="Respuestas por proveedor" vacio={false}>
          <Tabla
            titulo="Respuestas por proveedor"
            columnas={[
              'Proveedor',
              'Respuestas',
              'Latencia media',
              'Latencia p95',
              'Tokens (entrada / salida)',
              'Severidad media',
              'Emoción deducida',
            ]}
            filas={filasProveedores}
          />
          <p className="text-sm text-muted-foreground">
            La latencia incluye la espera por cupo.{' '}
            <span className="font-medium text-foreground">Emoción deducida</span> cuenta las
            respuestas en las que el modelo no escribió la etiqueta de emoción y se dedujo de la
            severidad.{' '}
            {metricas.turnos_de_respaldo > 0 &&
              `${numero.format(metricas.turnos_de_respaldo)} de las respuestas de Gemini fueron en prácticas que empezaron en el orquestador.`}
          </p>
        </Seccion>

        <div className="grid gap-8 lg:grid-cols-2">
          <Seccion
            id="cambios"
            titulo="Prácticas que pasaron a Gemini"
            vacio={metricas.cambios.length === 0 && 'Ninguna práctica necesitó el respaldo.'}
          >
            <Tabla
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
            vacio={errores.length === 0 && 'Sin errores en este periodo.'}
          >
            <Tabla
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
          vacio={esperas.length === 0 && 'Nadie tuvo que esperar por cupo en este periodo.'}
        >
          <Tabla
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
          vacio={
            filasCuentas.length === 0 &&
            'No hay cuentas del orquestador configuradas en este despliegue.'
          }
        >
          <Tabla
            titulo="Uso de las cuentas del orquestador"
            columnas={['Cuenta', 'Prácticas', 'En curso ahora', 'Mensajes en el último minuto']}
            filas={filasCuentas}
          />
        </Seccion>

        <section aria-labelledby="tope-titulo" className="flex flex-col gap-4">
          <h2 id="tope-titulo" className="text-xl font-semibold tracking-tight">
            Tope de prácticas simultáneas
          </h2>
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
}: {
  configuracion: ReturnType<typeof leerConfiguracionIa>;
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
      ? `1 cuenta principal · ${capacidad} prácticas simultáneas`
      : `${cuentasDelGrupo} ${cuentasDelGrupo === 1 ? 'cuenta' : 'cuentas'} del grupo · ${capacidad} prácticas simultáneas`;

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
        <h2 id="proveedor-activo-titulo" className="text-base font-semibold tracking-tight">
          Configuración del proveedor
        </h2>
        <InsigniaEstado estado={estado} />
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Proveedor principal</dt>
          <dd className="font-semibold">{usandoOrquestador ? 'Orquestador de NPC' : 'Gemini'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Respaldo automático</dt>
          <dd className="font-semibold">{usandoOrquestador ? 'Gemini' : '—'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Cuentas del orquestador</dt>
          <dd className="font-semibold">{resumenCapacidad}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </section>
  );
}

function Seccion({
  id,
  titulo,
  vacio,
  children,
}: {
  id: string;
  titulo: string;
  /** Texto del estado vacío; si no hay, se muestra el contenido. */
  vacio: string | false;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex min-w-0 flex-col gap-4">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold tracking-tight">
        {titulo}
      </h2>
      {vacio ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {vacio}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function Tabla({
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
        <thead className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            {columnas.map(columna => (
              <th key={columna} scope="col" className="px-4 py-3 font-medium">
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {filas.map(([primera, ...resto]) => (
            <tr key={primera}>
              <th scope="row" className="px-4 py-3 text-left font-medium">
                {primera}
              </th>
              {resto.map((celda, indice) => (
                <td key={columnas[indice + 1]} className="px-4 py-3 tabular-nums">
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
