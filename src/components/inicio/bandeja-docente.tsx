import { ArrowRight, Check, CheckCircle2, Users } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { CodigoCaso } from '@/components/casos/codigo-caso';
import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { ControlCitado } from '@/components/comun/control-citado';
import { formatearTiempoPractica } from '@/lib/estudiantes/estudiantes';
import { cierrePorInactividad, formatearHora, tiempoRelativo } from '@/lib/fechas';
import { duracionSesion } from '@/lib/sesiones/estados';
import { agruparPorCaso, type ResumenGrupo } from '@/lib/sesiones/revisiones';
import { cn } from '@/lib/utils';
import { type CodigoPendiente, type EstudianteRegistrado, type SesionDocente } from '@/types';

/** Filas visibles por bloque; el resto se ve en su página. */
const MAXIMO_POR_REVISAR = 8;
const MAXIMO_CODIGOS = 6;
const MAXIMO_ESTUDIANTES = 6;
const MAXIMO_REVISADAS = 4;
const MAXIMO_CASOS = 4;

const formatoNota = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

type Tono = 'pendiente' | 'vivo' | 'neutro';

interface BandejaDocenteProps {
  /** Ordenadas de la que más espera a la más reciente. */
  porRevisar: SesionDocente[];
  practicando: SesionDocente[];
  codigos: CodigoPendiente[];
  /** Historial completo del docente (solo en vista `columnas`) para últimas revisadas y casos. */
  sesiones?: SesionDocente[];
  /** Estudiantes del docente (solo en vista `columnas`) para el resumen de su grupo. */
  estudiantes?: EstudianteRegistrado[];
  ahora: Date;
  /**
   * `columnas`: la bandeja es la página (docente): «Por revisar», grupo y resumen por caso.
   * `riel`: la bandeja acompaña al panel de la plataforma (Administrador): riel lateral compacto.
   */
  disposicion: 'columnas' | 'riel';
}

/**
 * Lo que espera la acción del docente: prácticas por revisar, quién practica ahora y los códigos
 * que nadie ha usado. En la vista de docente (`columnas`) muestra además su grupo de estudiantes,
 * las últimas revisiones publicadas y los casos más practicados.
 */
export function BandejaDocente({
  porRevisar,
  practicando,
  codigos,
  sesiones = [],
  estudiantes = [],
  ahora,
  disposicion,
}: BandejaDocenteProps) {
  const enRiel = disposicion === 'riel';
  const nivel = enRiel ? 'h3' : 'h2';

  const bloquePorRevisar = (
    <Bloque
      id="por-revisar"
      titulo="Por revisar"
      nivel={nivel}
      cantidad={porRevisar.length}
      tono="pendiente"
      ayuda="Prácticas terminadas (o interrumpidas con al menos 3 intervenciones) donde el estudiante espera tus comentarios y tu nota. Van de la que más espera a la más reciente."
      enlace={
        porRevisar.length > 0
          ? { href: '/sesiones', texto: 'Ver todas' }
          : !enRiel && sesiones.length > 0
            ? { href: '/sesiones', texto: 'Ver historial' }
            : undefined
      }
      vacio={
        <span className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
          <span>
            {enRiel
              ? 'Al día. Las prácticas terminadas de tus estudiantes aparecerán aquí.'
              : 'Al día. Cuando un estudiante termine una práctica, aparecerá aquí para que dejes tu retroalimentación.'}
          </span>
        </span>
      }
    >
      {porRevisar.slice(0, MAXIMO_POR_REVISAR).map(sesion => (
        <FilaPorRevisar key={sesion.id} sesion={sesion} ahora={ahora} compacto={enRiel} />
      ))}
      {porRevisar.length > MAXIMO_POR_REVISAR && (
        <FilaMas href="/sesiones">
          {mas(porRevisar.length - MAXIMO_POR_REVISAR, 'práctica', 'prácticas')} en Revisiones
        </FilaMas>
      )}
    </Bloque>
  );

  const bloquePracticando = (
    <Bloque
      id="practicando"
      titulo="Practicando ahora"
      nivel={nivel}
      cantidad={practicando.length}
      tono="vivo"
      ayuda="Estudiantes con un consultorio abierto en este momento. La página se actualiza sola cada 30 segundos mientras haya alguno."
      vacio="Nadie está practicando en este momento."
    >
      {practicando.map(sesion => (
        <FilaPracticando key={sesion.id} sesion={sesion} ahora={ahora} />
      ))}
    </Bloque>
  );

  const bloqueCodigos = (
    <Bloque
      id="codigos"
      titulo="Códigos sin usar"
      nivel={nivel}
      cantidad={codigos.length}
      tono="neutro"
      ayuda="Códigos que generaste, aún vigentes, que el estudiante no ha usado. Desde aquí puedes reenviarlos."
      enlace={codigos.length === 0 ? { href: '/configuracion', texto: 'Asignar' } : undefined}
      vacio={
        enRiel ? (
          'Ninguno vigente por usar.'
        ) : (
          <>
            Ninguno vigente por usar. Los que generes en{' '}
            <ControlCitado>Asignar práctica</ControlCitado> aparecerán aquí hasta que entren.
          </>
        )
      }
    >
      {codigos.slice(0, MAXIMO_CODIGOS).map(codigo => (
        <FilaCodigo key={codigo.id} codigo={codigo} ahora={ahora} />
      ))}
      {codigos.length > MAXIMO_CODIGOS && (
        <FilaMas href="/estudiantes">
          {mas(codigos.length - MAXIMO_CODIGOS, 'código', 'códigos')} en la ficha de cada estudiante
        </FilaMas>
      )}
    </Bloque>
  );

  if (enRiel) {
    return (
      <aside aria-labelledby="bandeja-titulo" className="flex min-w-0 flex-col gap-4">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border bg-card @5xl/inicio:shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]',
            practicando.length > 0 && 'border-salvia/50'
          )}
        >
          <div className="flex flex-col gap-0.5 px-5 pt-4.5 pb-4">
            <h2 id="bandeja-titulo" className="text-xl font-bold tracking-[-0.015em]">
              Tu bandeja
            </h2>
            <p className="text-sm text-muted-foreground">
              Tus estudiantes asignados: en vivo, por revisar y códigos.
            </p>
          </div>

          <div className="border-t">{bloquePracticando}</div>
        </div>

        <div className="grid gap-4 @2xl/inicio:grid-cols-2 @5xl/inicio:grid-cols-1">
          <div className="overflow-hidden rounded-2xl border bg-card">{bloquePorRevisar}</div>
          <div className="overflow-hidden rounded-2xl border bg-card">{bloqueCodigos}</div>
        </div>
      </aside>
    );
  }

  const estudiantesOrdenados = [...estudiantes]
    .sort(
      (a, b) =>
        b.metricas.enCurso - a.metricas.enCurso ||
        b.metricas.pendientesRetroalimentacion - a.metricas.pendientesRetroalimentacion ||
        (b.metricas.ultimaSesion ?? '').localeCompare(a.metricas.ultimaSesion ?? '') ||
        Number(b.cuentaVinculada) - Number(a.cuentaVinculada) ||
        a.nombre.localeCompare(b.nombre, 'es')
    )
    .slice(0, MAXIMO_ESTUDIANTES);

  const idsPorRevisar = new Set(porRevisar.map(s => s.id));
  const revisadasRecientes = [...sesiones]
    .filter(s => !idsPorRevisar.has(s.id) && s.retroalimentacion?.publicada)
    .sort((a, b) => (b.fin ?? b.inicio).localeCompare(a.fin ?? a.inicio))
    .slice(0, MAXIMO_REVISADAS);

  const casosPracticados = agruparPorCaso(sesiones)
    .sort((a, b) => b.porRevisar - a.porRevisar || b.sesiones.length - a.sesiones.length)
    .slice(0, MAXIMO_CASOS);

  return (
    <div className="grid items-start gap-8 @5xl/inicio:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="overflow-hidden rounded-2xl border bg-card">{bloquePorRevisar}</div>

        <BloqueEstudiantesDocente
          visibles={estudiantesOrdenados}
          total={estudiantes.length}
          ahora={ahora}
        />

        {revisadasRecientes.length > 0 && (
          <BloqueRevisadas sesiones={revisadasRecientes} ahora={ahora} />
        )}
      </div>

      <div className="grid min-w-0 gap-4 @2xl/inicio:grid-cols-2 @5xl/inicio:grid-cols-1">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border bg-card @2xl/inicio:col-span-2 @5xl/inicio:col-span-1',
            practicando.length > 0 && 'border-salvia/50'
          )}
        >
          {bloquePracticando}
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card">{bloqueCodigos}</div>

        {casosPracticados.length > 0 ? (
          <BloqueCasosPracticados grupos={casosPracticados} />
        ) : (
          <BloquePrimerosPasos
            tieneEstudiantes={estudiantes.length > 0}
            tieneCuenta={estudiantes.some(e => e.cuentaVinculada)}
            tieneCodigos={codigos.length > 0}
          />
        )}
      </div>
    </div>
  );
}

function mas(n: number, uno: string, varios: string) {
  return `Y ${n} ${n === 1 ? `${uno} más` : `${varios} más`}`;
}

const TONO_CANTIDAD: Record<Tono, string> = {
  pendiente: 'bg-ambar-suave text-ambar',
  vivo: 'bg-salvia-suave text-salvia-oscuro',
  neutro: 'bg-muted text-muted-foreground',
};

/** Un bloque de la bandeja: encabezado con la cantidad y el registro (o su estado vacío). */
function Bloque({
  id,
  titulo,
  nivel: Titulo,
  cantidad,
  tono,
  ayuda,
  enlace,
  vacio,
  children,
}: {
  id: string;
  titulo: string;
  nivel: 'h2' | 'h3';
  cantidad: number;
  tono: Tono;
  ayuda: string;
  enlace?: { href: Route; texto: string };
  vacio: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <Titulo
          id={id}
          className={cn('font-bold tracking-[-0.015em]', Titulo === 'h2' ? 'text-xl' : 'text-base')}
        >
          {titulo}
        </Titulo>
        <span
          className={cn(
            'inline-flex min-w-6 items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            cantidad > 0 ? TONO_CANTIDAD[tono] : TONO_CANTIDAD.neutro
          )}
        >
          {tono === 'vivo' && cantidad > 0 && <PuntoVivo />}
          {cantidad}
        </span>
        <AyudaContextual etiqueta={`Qué es ${titulo}`} texto={ayuda} />
        {enlace && (
          <Link
            href={enlace.href}
            className="ml-auto rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {enlace.texto}
          </Link>
        )}
      </div>
      {cantidad === 0 ? (
        <p className="max-w-prose px-5 pb-5 text-sm leading-relaxed text-pretty text-muted-foreground">
          {vacio}
        </p>
      ) : (
        <ul className="flex flex-col divide-y border-t">{children}</ul>
      )}
    </section>
  );
}

/** Punto que late mientras alguien practica (solo si se permite el movimiento). */
function PuntoVivo() {
  return (
    <span aria-hidden className="relative flex size-2">
      <span className="absolute inline-flex size-full rounded-full bg-salvia opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2 rounded-full bg-salvia" />
    </span>
  );
}

/** Última fila de un bloque cuando hay más de las que caben. */
function FilaMas({
  href,
  children,
}: {
  href: '/sesiones' | '/estudiantes';
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        {children}
        <ArrowRight
          className="size-4 transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/**
 * Práctica por revisar: quién, hace cuánto terminó (lo que ordena la lista), qué caso y cómo
 * terminó. Toda la fila lleva a la revisión.
 */
function FilaPorRevisar({
  sesion,
  ahora,
  compacto = false,
}: {
  sesion: SesionDocente;
  ahora: Date;
  compacto?: boolean;
}) {
  const terminada = sesion.fin ?? sesion.inicio;
  const duracion = duracionSesion(sesion);
  const borrador = sesion.retroalimentacion !== null;

  const accion = (
    <span className="flex shrink-0 items-center gap-2">
      {borrador && (
        <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
          Borrador
        </span>
      )}
      <Link
        href={`/sesiones/${sesion.id}`}
        className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-foreground underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        {borrador ? 'Continuar' : 'Revisar'}
        <span className="sr-only">
          {' '}
          la práctica de {sesion.estudiante.nombre}, {sesion.escenario.titulo}
        </span>
        <ArrowRight
          className="size-4 transition-transform duration-200 ease-salida group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </span>
  );

  return (
    <li className="group relative flex flex-col gap-1.5 px-5 py-3.5 transition-colors hover:bg-muted/50">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-semibold">{sesion.estudiante.nombre}</p>
        <span className="shrink-0 text-sm text-muted-foreground ancho-condensado first-letter:uppercase">
          {tiempoRelativo(terminada, ahora)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-x-2 text-sm text-muted-foreground">
          <CodigoCaso
            codigo={sesion.escenario.codigo}
            className="shrink-0 font-mono text-xs text-foreground"
          />
          <span className="truncate">{sesion.escenario.titulo}</span>
          {sesion.estado === 'interrumpida' && <span className="shrink-0">· Interrumpida</span>}
          {duracion !== null && (
            <span className="shrink-0 tabular-nums">· {formatearTiempoPractica(duracion)}</span>
          )}
          {!compacto && sesion.intervenciones > 0 && (
            <span className="hidden shrink-0 tabular-nums sm:inline">
              · {plural(sesion.intervenciones, 'intervención', 'intervenciones')}
            </span>
          )}
        </p>
        {!compacto && accion}
      </div>
      {compacto && <div className="flex items-center justify-end pt-0.5">{accion}</div>}
    </li>
  );
}

/** Quién practica ahora, desde cuándo, y a qué hora se cerrará si deja de escribir. */
function FilaPracticando({ sesion, ahora }: { sesion: SesionDocente; ahora: Date }) {
  const cierre = cierrePorInactividad(sesion.ultimaActividad);
  return (
    <li className="group relative flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-muted/50">
      <p className="flex items-center gap-2 font-semibold">
        <PuntoVivo />
        <Link
          href={`/sesiones/${sesion.id}`}
          className="truncate rounded-sm underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          {sesion.estudiante.nombre}
        </Link>
      </p>
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <CodigoCaso
          codigo={sesion.escenario.codigo}
          className="shrink-0 font-mono text-xs text-foreground"
        />
        <span className="truncate">
          {sesion.comenzada
            ? `Conversando desde ${tiempoRelativo(sesion.inicio, ahora)}`
            : 'Leyendo las instrucciones del caso'}
        </span>
      </p>
      {cierre > ahora && (
        <p className="text-sm text-muted-foreground">
          Si no escribe, se cierra a las {formatearHora(cierre)}.
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
    <li className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-semibold">
          {codigo.estudiante ? (
            <Link
              href={`/estudiantes/${codigo.estudiante.id}`}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
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
          className={cn('text-sm', urgente ? 'font-semibold text-ambar' : 'text-muted-foreground')}
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

/** Resumen del grupo del docente: quienes practican ahora, tienen pendientes o acaban de practicar. */
function BloqueEstudiantesDocente({
  visibles,
  total,
  ahora,
}: {
  visibles: EstudianteRegistrado[];
  total: number;
  ahora: Date;
}) {
  return (
    <section
      aria-labelledby="tus-estudiantes"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3">
        <h2 id="tus-estudiantes" className="text-xl font-bold tracking-[-0.015em]">
          Tus estudiantes
        </h2>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {total}
        </span>
        <AyudaContextual
          etiqueta="Qué muestra Tus estudiantes"
          texto="Resumen de tu grupo: primero quienes practican ahora o esperan tu revisión, luego los de práctica más reciente."
        />
        <Link
          href="/estudiantes"
          className="ml-auto rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          {total > visibles.length ? `Ver los ${total}` : 'Ir a Estudiantes'}
        </Link>
      </div>
      {visibles.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t px-5 py-5 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="flex-1 text-sm text-muted-foreground">
            Registra a tus estudiantes con su código y correo @correounivalle.edu.co para empezar a
            asignarles prácticas.
          </p>
          <Link
            href="/estudiantes"
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            Registrar estudiantes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="divide-y border-t text-sm">
          {visibles.map(e => (
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
                  <span
                    className={cn(
                      'truncate text-muted-foreground',
                      e.metricas.enCurso > 0 && 'font-medium text-salvia-oscuro'
                    )}
                  >
                    {e.metricas.enCurso > 0
                      ? 'Practicando ahora'
                      : e.metricas.ultimaSesion
                        ? `Última práctica ${tiempoRelativo(e.metricas.ultimaSesion, ahora)}`
                        : e.cuentaVinculada
                          ? 'Con cuenta · sin prácticas aún'
                          : 'Pendiente de entrar con Google'}
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
                ) : e.cuentaVinculada === false ? (
                  <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar">
                    Sin cuenta
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Últimas prácticas ya calificadas o comentadas, para volver rápido al historial reciente. */
function BloqueRevisadas({ sesiones, ahora }: { sesiones: SesionDocente[]; ahora: Date }) {
  return (
    <section
      aria-labelledby="ultimas-revisadas"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <h2 id="ultimas-revisadas" className="text-xl font-bold tracking-[-0.015em]">
          Últimas revisadas
        </h2>
        <Link
          href="/sesiones?vista=publicadas"
          className="ml-auto rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          Ver historial
        </Link>
      </div>
      <ul className="divide-y border-t text-sm">
        {sesiones.map(s => {
          const fecha = s.fin ?? s.inicio;
          const nota = s.retroalimentacion?.nota;
          return (
            <li
              key={s.id}
              className="group relative flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  href={`/sesiones/${s.id}`}
                  className="truncate rounded-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                  {s.estudiante.nombre}
                </Link>
                <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <CodigoCaso
                    codigo={s.escenario.codigo}
                    className="shrink-0 font-mono text-xs text-foreground"
                  />
                  <span className="truncate">{s.escenario.titulo}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 tabular-nums">
                <span className="text-xs text-muted-foreground first-letter:uppercase">
                  {tiempoRelativo(fecha, ahora)}
                </span>
                {nota !== null && nota !== undefined ? (
                  <span className="rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-semibold text-salvia-oscuro">
                    Nota {formatoNota.format(nota)}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Publicada
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Casos en los que ha practicado tu grupo, con promedio y revisiones pendientes. */
function BloqueCasosPracticados({ grupos }: { grupos: ResumenGrupo[] }) {
  return (
    <section
      aria-labelledby="casos-practicados"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <h2 id="casos-practicados" className="text-xl font-bold tracking-[-0.015em]">
          Casos practicados
        </h2>
        <Link
          href="/configuracion/casos"
          className="ml-auto rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          Ver casos
        </Link>
      </div>
      <ul className="divide-y border-t text-sm">
        {grupos.map(grupo => (
          <li
            key={grupo.clave}
            className="group relative flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/sesiones?caso=${encodeURIComponent(grupo.clave)}`}
                className="flex min-w-0 items-center gap-2 rounded-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
              >
                <CodigoCaso
                  codigo={grupo.clave}
                  className="shrink-0 font-mono text-xs text-muted-foreground"
                />
                <span className="truncate">{grupo.titulo}</span>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
              <span>{plural(grupo.sesiones.length, 'práctica', 'prácticas')}</span>
              {grupo.promedio !== null && (
                <span>· Nota media {formatoNota.format(grupo.promedio)}</span>
              )}
              {grupo.porRevisar > 0 && (
                <span className="ml-auto rounded-full bg-ambar-suave px-2 py-0.5 font-medium text-ambar">
                  {grupo.porRevisar} por revisar
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Guía inicial para docentes que todavía no tienen prácticas registradas con su grupo. */
function BloquePrimerosPasos({
  tieneEstudiantes,
  tieneCuenta,
  tieneCodigos,
}: {
  tieneEstudiantes: boolean;
  tieneCuenta: boolean;
  tieneCodigos: boolean;
}) {
  const pasos: { hecho: boolean; titulo: string; detalle: string; href?: Route; cta?: string }[] = [
    {
      hecho: tieneEstudiantes,
      titulo: 'Registra a tus estudiantes',
      detalle: 'Agrega su código y su correo @correounivalle.edu.co.',
      href: '/estudiantes',
      cta: 'Ir a Estudiantes',
    },
    {
      hecho: tieneCuenta,
      titulo: 'Su primer ingreso con Google',
      detalle: 'Cuando entren al menos una vez podrán recibir códigos de acceso.',
    },
    {
      hecho: tieneCodigos,
      titulo: 'Asigna tu primera práctica',
      detalle: 'Elige un caso y envía el código o enlace directo.',
      href: '/configuracion',
      cta: 'Asignar práctica',
    },
  ];

  return (
    <section
      aria-labelledby="primeros-pasos"
      className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="primeros-pasos" className="text-xl font-bold tracking-[-0.015em]">
          Cómo empezar
        </h2>
        <p className="text-xs text-muted-foreground">
          Tres pasos para abrir tu primera práctica con el grupo.
        </p>
      </div>
      <ol className="flex flex-col gap-3 text-sm">
        {pasos.map((paso, i) => (
          <li key={paso.titulo} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                paso.hecho
                  ? 'bg-salvia-oscuro text-lino'
                  : 'border border-input/70 bg-muted text-muted-foreground'
              )}
            >
              {paso.hecho ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p
                className={cn('font-semibold', paso.hecho && 'text-muted-foreground line-through')}
              >
                {paso.titulo}
              </p>
              <p className="text-xs leading-snug text-muted-foreground">{paso.detalle}</p>
              {!paso.hecho && paso.href && paso.cta && (
                <Link
                  href={paso.href}
                  className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-sm text-xs font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                  {paso.cta}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
