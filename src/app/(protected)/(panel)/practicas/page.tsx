import { ArrowRight, ChevronDown, Clock, MonitorPlay } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { FormularioCodigo } from '@/components/practicas/formulario-codigo';
import { AccionAbierta } from '@/components/practicas/accion-abierta';
import { requerirEstudiante } from '@/lib/auth/dal';
import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearDia, formatearNota } from '@/lib/estudiantes/estudiantes';
import { cierrePorInactividad, formatearHora } from '@/lib/fechas';
import { duracionSesion } from '@/lib/sesiones/estados';
import { obtenerPracticas } from '@/lib/sesiones/queries';
import { cn } from '@/lib/utils';
import { type SesionHistorial } from '@/types';

export const metadata: Metadata = {
  title: 'Mis prácticas',
};

/**
 * Panel del estudiante: en qué punto está cada práctica y qué hacer ahora. La práctica abierta va
 * primero con su plazo para volver; después, lo que espera retroalimentación, lo que ya la tiene y
 * lo que se cerró sin conversación. El código se usa solo desde un computador.
 */
export default async function PracticasPage() {
  const perfil = await requerirEstudiante();
  const practicas = await obtenerPracticas();
  const ahora = new Date();

  const abierta = practicas.find(p => p.estado === 'en_curso') ?? null;
  const terminadas = practicas.filter(p => p.estado !== 'en_curso');
  const conRetro = terminadas.filter(p => p.retroalimentacion?.publicada);
  const sinConversacion = terminadas.filter(
    p => !p.retroalimentacion?.publicada && p.estado === 'interrumpida' && !p.comenzada
  );
  const esperando = terminadas.filter(p => !conRetro.includes(p) && !sinConversacion.includes(p));

  const notas = conRetro.flatMap(p =>
    p.retroalimentacion?.nota !== null && p.retroalimentacion?.nota !== undefined
      ? [p.retroalimentacion.nota]
      : []
  );
  const promedio = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const primerNombre = perfil.nombre.split(' ')[0];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.6rem]">
          Mis prácticas
        </h1>
        <p className="text-lg text-muted-foreground">Hola, {primerNombre}.</p>
      </header>

      {abierta && <BloqueAbierta sesion={abierta} ahora={ahora} />}

      <section aria-labelledby="codigo-titulo" className="flex flex-col gap-4">
        <h2 id="codigo-titulo" className="text-xl font-bold tracking-[-0.015em]">
          {abierta ? '¿Tienes otro código?' : 'Usar un código'}
        </h2>
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <FormularioCodigo correo={perfil.correo} variante="practicas" />
        </div>
      </section>

      {practicas.length === 0 ? (
        <section className="flex flex-col gap-2 rounded-xl border border-dashed border-input/50 px-6 py-8">
          <h2 className="text-lg font-bold">Aún no tienes prácticas</h2>
          <p className="text-muted-foreground">
            Cuando tu docente te envíe un código, escríbelo arriba o abre el enlace que te mandó
            desde un computador.
          </p>
        </section>
      ) : (
        <>
          <Grupo titulo="Esperando retroalimentación" sesiones={esperando} ahora={ahora} />
          <Grupo
            titulo="Con retroalimentación"
            sesiones={conRetro}
            ahora={ahora}
            extra={
              promedio !== null && (
                <p className="text-sm text-muted-foreground">
                  Promedio de tus notas publicadas:{' '}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatearNota(Math.round(promedio * 10) / 10)}
                  </span>
                </p>
              )
            }
          />
          <Grupo titulo="Sin conversación" sesiones={sinConversacion} ahora={ahora} />
        </>
      )}
    </div>
  );
}

/** La práctica abierta: lo único con acción principal en la página, con su plazo para volver. */
function BloqueAbierta({ sesion, ahora }: { sesion: SesionHistorial; ahora: Date }) {
  const plazo = cierrePorInactividad(sesion.ultimaActividad);
  const cerrandose = plazo < ahora;
  return (
    <section
      aria-labelledby="abierta-titulo"
      className="relative overflow-hidden rounded-2xl vetas-nogal p-6 text-sidebar-foreground sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2
            id="abierta-titulo"
            className="flex items-center gap-2 text-sm font-semibold text-laton-texto"
          >
            <MonitorPlay className="size-4" aria-hidden />
            Abierta ahora
          </h2>
          <p className="text-2xl leading-tight font-bold tracking-[-0.015em]">
            <CodigoCaso
              codigo={sesion.escenario.codigo}
              className="mr-2 font-mono text-base font-medium text-sidebar-muted"
            />
            {sesion.escenario.titulo}
          </p>
          <p className="flex items-center gap-2 text-sm text-sidebar-foreground/85">
            <Clock className="size-4 shrink-0" aria-hidden />
            {cerrandose
              ? sesion.comenzada
                ? 'Se está cerrando por inactividad. Tu docente revisará lo que alcanzaste a conversar.'
                : 'Se está cerrando por inactividad. Si aún debes hacerla, pídele un código nuevo a tu docente.'
              : sesion.comenzada
                ? `En curso · vuelve antes de las ${formatearHora(plazo)} para continuar donde ibas.`
                : `Sin empezar · vuelve antes de las ${formatearHora(plazo)}. Después se cierra y el código deja de servir.`}
          </p>
        </div>
        {!cerrandose && (
          <AccionAbierta
            href={`/simulacion?sesion=${sesion.id}`}
            etiqueta={sesion.comenzada ? 'Continuar práctica' : 'Empezar práctica'}
            plazo={formatearHora(plazo)}
          />
        )}
      </div>
    </section>
  );
}

function Grupo({
  titulo,
  sesiones,
  ahora,
  extra,
}: {
  titulo: string;
  sesiones: SesionHistorial[];
  ahora: Date;
  extra?: React.ReactNode;
}) {
  if (sesiones.length === 0) return null;
  const id = `grupo-${titulo.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-xl font-bold tracking-[-0.015em]">
          {titulo}{' '}
          <span className="text-sm font-semibold text-muted-foreground tabular-nums">
            {sesiones.length}
          </span>
        </h2>
        {extra}
      </div>
      <ol className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
        {sesiones.slice(0, FILAS_POR_GRUPO).map(sesion => (
          <FilaPractica key={sesion.id} sesion={sesion} ahora={ahora} />
        ))}
      </ol>
      {/* Tras un semestre las prácticas se acumulan: las más antiguas quedan plegadas. */}
      {sesiones.length > FILAS_POR_GRUPO && (
        <details className="group/mas flex flex-col">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold underline-offset-4 outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="group-open/mas:hidden">
              Ver{' '}
              {sesiones.length - FILAS_POR_GRUPO === 1
                ? 'la anterior'
                : `las ${sesiones.length - FILAS_POR_GRUPO} anteriores`}
            </span>
            <span className="hidden group-open/mas:inline">Ocultar las anteriores</span>
            <ChevronDown
              className="size-4 transition-transform group-open/mas:rotate-180"
              aria-hidden
            />
          </summary>
          <ol className="mt-3 flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {sesiones.slice(FILAS_POR_GRUPO).map(sesion => (
              <FilaPractica key={sesion.id} sesion={sesion} ahora={ahora} />
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

/** Prácticas visibles por grupo; las más antiguas se despliegan a pedido. */
const FILAS_POR_GRUPO = 6;

/** Fila del registro: fecha, caso, cómo terminó y, si ya llegó, la retroalimentación. */
function FilaPractica({ sesion }: { sesion: SesionHistorial; ahora: Date }) {
  const duracion = duracionSesion(sesion);
  const publicada = sesion.retroalimentacion?.publicada ?? false;
  const sinConversacion = sesion.estado === 'interrumpida' && !sesion.comenzada;
  const accion = publicada ? 'Leer retroalimentación' : 'Ver';

  return (
    <li className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-4 hover:bg-muted/60 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto_auto]">
      <p className="text-sm font-semibold text-muted-foreground ancho-condensado sm:col-start-1 sm:row-start-1 sm:text-foreground">
        {formatearDia(sesion.fin ?? sesion.inicio)}
      </p>
      <div className="col-span-2 row-start-2 flex min-w-0 flex-col gap-0.5 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <p className="truncate font-semibold">
          <CodigoCaso
            codigo={sesion.escenario.codigo}
            className="mr-1.5 font-mono text-xs font-medium text-muted-foreground"
          />
          {sesion.escenario.titulo}
        </p>
        <p className="text-sm text-muted-foreground">
          {sinConversacion
            ? 'Se cerró antes de que conversaras.'
            : [
                sesion.estado === 'interrumpida' ? 'Se cerró antes de terminar' : 'Terminada',
                duracion !== null ? formatearDuracion(duracion) : null,
                sesion.docente ? `Docente: ${sesion.docente}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </p>
      </div>
      {publicada ? (
        <p className="row-start-1 flex items-baseline gap-1 justify-self-end sm:col-start-3">
          <span className="text-xl font-semibold ancho-semiexpandido tabular-nums">
            {formatearNota(sesion.retroalimentacion?.nota ?? null)}
          </span>
          <span className="text-xs text-muted-foreground">de 5,0</span>
        </p>
      ) : (
        <span className="row-start-1 sm:col-start-3" />
      )}
      {!sinConversacion && (
        <Link
          href={`/practicas/${sesion.id}`}
          className={cn(
            'col-span-2 row-start-3 inline-flex w-fit items-center gap-1 rounded-md text-sm font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden sm:col-span-1 sm:col-start-4 sm:row-start-1',
            publicada && 'text-salvia-oscuro'
          )}
        >
          {accion}
          <span className="sr-only">: {sesion.escenario.titulo}</span>
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}
    </li>
  );
}
