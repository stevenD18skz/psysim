import { ArrowRight, ClipboardList, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { ReenviarCodigo } from '@/components/asignaciones/reenviar-codigo';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { Button } from '@/components/ui/button';
import { obtenerDocentes } from '@/lib/admin/queries';
import { requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearDia } from '@/lib/estudiantes/estudiantes';
import { cierrePorInactividad, formatearHora, tiempoRelativo } from '@/lib/fechas';
import { duracionSesion, estaPorRevisar } from '@/lib/sesiones/estados';
import { obtenerCodigosPendientes, obtenerSesionesDelDocente } from '@/lib/sesiones/queries';
import { cn } from '@/lib/utils';
import { type CodigoPendiente, type SesionDocente } from '@/types';

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
 * Bandeja del docente: lo primero que ve al entrar responde «¿qué tengo que hacer hoy?». Las
 * prácticas por revisar (de la que más espera a la más reciente), quién practica ahora y los
 * códigos que aún no se han usado. El Administrador la ve con su franja de administración.
 */
export default async function InicioPage() {
  const perfil = await requerirUsuario();
  if (perfil.rol === 'estudiante') redirect(RUTA_INICIO.estudiante);

  const esAdmin = perfil.rol === 'superadmin';
  const [sesiones, codigos, docentes] = await Promise.all([
    obtenerSesionesDelDocente(),
    obtenerCodigosPendientes(),
    esAdmin ? obtenerDocentes() : null,
  ]);

  const ahora = new Date();
  const porRevisar = sesiones
    .filter(estaPorRevisar)
    .sort((a, b) => (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio));
  const practicando = sesiones.filter(s => s.estado === 'en_curso');
  const primerNombre = perfil.nombre.split(' ')[0];

  const resumen =
    porRevisar.length === 0 && practicando.length === 0
      ? 'No tienes nada pendiente por ahora.'
      : [
          porRevisar.length > 0 &&
            `Tienes ${plural(porRevisar.length, 'práctica', 'prácticas')} por revisar`,
          practicando.length > 0 &&
            `${plural(practicando.length, 'estudiante practica', 'estudiantes practican')} ahora`,
        ]
          .filter(Boolean)
          .join(' y ') + '.';

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
          <Button asChild variant="accion" size="lg">
            <Link href="/configuracion">
              <ClipboardList aria-hidden />
              Asignar práctica
            </Link>
          </Button>
        </div>
      </header>

      {docentes && (
        <section
          aria-label="Administración"
          className="flex flex-col gap-3 rounded-xl vetas-nogal px-5 py-4 text-sidebar-foreground sm:flex-row sm:items-center"
        >
          <ShieldCheck className="size-5 shrink-0 text-laton" aria-hidden />
          <p className="flex-1 text-sm">
            <span className="font-semibold">Administración.</span>{' '}
            {plural(docentes.filter(d => d.activo).length, 'docente activo', 'docentes activos')}
            {' · '}
            {plural(
              docentes.reduce((s, d) => s + d.metricas.pendientesRetroalimentacion, 0),
              'práctica por revisar',
              'prácticas por revisar'
            )}{' '}
            en toda la plataforma.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-laton-texto underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-laton focus-visible:outline-hidden"
          >
            Gestionar docentes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section aria-labelledby="por-revisar" className="flex flex-col gap-4">
          <EncabezadoSeccion
            id="por-revisar"
            titulo="Por revisar"
            cantidad={porRevisar.length}
            enlace={{ href: '/sesiones', texto: 'Ver todas las revisiones' }}
          />
          {porRevisar.length === 0 ? (
            <Vacio>
              Cuando un estudiante termine una práctica, aparecerá aquí para que dejes tu
              retroalimentación.
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
            <EncabezadoSeccion id="codigos" titulo="Códigos sin usar" cantidad={codigos.length} />
            {codigos.length === 0 ? (
              <Vacio>
                No tienes códigos esperando. Los que generes y el estudiante aún no use aparecerán
                aquí para reenviarlos.
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

function EncabezadoSeccion({
  id,
  titulo,
  cantidad,
  enlace,
}: {
  id: string;
  titulo: string;
  cantidad: number;
  enlace?: { href: '/sesiones'; texto: string };
}) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 id={id} className="text-xl font-bold tracking-[-0.015em]">
        {titulo}
      </h2>
      <span className="text-sm font-semibold text-muted-foreground tabular-nums">{cantidad}</span>
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
    <p className="rounded-xl border border-dashed border-input/50 px-5 py-6 text-sm text-muted-foreground">
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
