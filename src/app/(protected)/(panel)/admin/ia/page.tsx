import type { Metadata } from 'next';
import Link from 'next/link';

import { TopePracticas } from '@/components/admin/tope-practicas';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import { Indicadores } from '@/components/comun/indicadores';
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoPagina
        titulo="Paciente con IA"
        descripcion="Quién responde como paciente, cuánto tarda y qué pasó cuando algo falló. Estas cifras describen el servicio, no a los estudiantes."
        acciones={
          <nav aria-label="Periodo" className="flex gap-1 rounded-lg border bg-card p-1">
            {PERIODOS_METRICAS.map(dias => (
              <Link
                key={dias}
                href={`/admin/ia?dias=${dias}`}
                aria-current={dias === periodo ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                  dias === periodo && 'bg-accent text-accent-foreground'
                )}
              >
                {ETIQUETA_PERIODO[dias]}
              </Link>
            ))}
          </nav>
        }
      />

      <EstadoDelProveedor configuracion={configuracion} />

      <Indicadores
        indicadores={[
          { etiqueta: 'Respuestas del paciente', valor: turnos },
          { etiqueta: 'Prácticas', valor: metricas.practicas.total },
          { etiqueta: 'Pasaron a Gemini', valor: metricas.practicas.pasaron_a_gemini },
          {
            etiqueta: 'Cierres automáticos',
            valor: metricas.practicas.cierres_por_crisis + metricas.practicas.cierres_por_conducta,
          },
        ]}
      />

      <Seccion
        id="proveedores"
        titulo="Respuestas por proveedor"
        vacio={metricas.proveedores.length === 0 && 'Aún no hay respuestas en este periodo.'}
      >
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
          filas={metricas.proveedores.map(p => [
            ETIQUETA_PROVEEDOR[p.proveedor] ?? p.proveedor,
            numero.format(p.turnos),
            segundos(p.latencia_media_ms),
            segundos(p.latencia_p95_ms),
            `${numero.format(p.tokens_entrada)} / ${numero.format(p.tokens_salida)}`,
            p.severidad_media === null ? '—' : decimal.format(p.severidad_media),
            numero.format(p.emociones_deducidas),
          ])}
        />
        <p className="text-sm text-muted-foreground">
          La latencia incluye la espera por cupo. «Emoción deducida»: respuestas en las que el
          modelo no escribió la etiqueta de emoción y se dedujo de la severidad.{' '}
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
        vacio={metricas.cuentas.length === 0 && 'Aún no hay prácticas en el orquestador.'}
      >
        <Tabla
          titulo="Uso de las cuentas del orquestador"
          columnas={['Cuenta', 'Prácticas', 'En curso ahora', 'Mensajes en el último minuto']}
          filas={metricas.cuentas.map(cuenta => [
            configuracion.etiquetas[cuenta.cuenta] ?? 'Cuenta que ya no está configurada',
            numero.format(cuenta.practicas),
            numero.format(cuenta.activas),
            `${numero.format(cuenta.turnos_ultimo_minuto)} de 10`,
          ])}
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
  return (
    <p
      className={cn(
        'rounded-xl border bg-card px-4 py-3 text-sm',
        proveedor === 'orquestador' && !orquestadorListo && 'border-destructive/40'
      )}
    >
      {texto}
    </p>
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
