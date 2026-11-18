import { Hourglass, MessageSquareQuote } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import {
  ContenedorHero,
  EncabezadoPagina,
  SOMBRA_SOBRE_NOGAL,
} from '@/components/comun/encabezado-pagina';
import {
  AccionesResultados,
  LimpiarSesionActiva,
} from '@/components/resultados/acciones-resultados';
import { HistorialResultados } from '@/components/resultados/historial-resultados';
import { ReflexionEstudiante, ReflexionLeida } from '@/components/resultados/reflexion';
import { TarjetasMetricas } from '@/components/resultados/tarjetas-metricas';
import { requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';
import {
  obtenerDetalleSesion,
  obtenerMetricasGuardadas,
  obtenerReflexion,
} from '@/lib/sesiones/queries';
import { metricasDeSesion } from '@/lib/sesiones/resultados';

export const metadata: Metadata = {
  title: 'Resultados de la práctica',
};

/**
 * HU-21 — Resultados de una práctica terminada: el caso y el estudiante, los indicadores de la
 * sesión, la conversación completa y las acciones para seguir. La ven el estudiante que la hizo y
 * el docente que la asignó (RLS decide: una sesión ajena o inexistente lleva al inicio del rol).
 * Si la práctica sigue abierta no hay nada que mostrar todavía, así que se retoma.
 */
export default async function ResultadosPage({ searchParams }: PageProps<'/resultados'>) {
  const perfil = await requerirUsuario();
  const inicio = RUTA_INICIO[perfil.rol];
  const rol = perfil.rol === 'estudiante' ? 'estudiante' : 'docente';

  const { sesion: parametro } = await searchParams;
  const id = z.uuid().safeParse(parametro);
  if (!id.success) redirect(inicio);

  const sesion = await obtenerDetalleSesion(id.data);
  if (!sesion) redirect(inicio);
  if (sesion.estado === 'en_curso') {
    redirect(rol === 'estudiante' ? `/simulacion?sesion=${sesion.id}` : `/sesiones/${sesion.id}`);
  }

  const [filaMetricas, reflexion] = await Promise.all([
    obtenerMetricasGuardadas(sesion.id),
    obtenerReflexion(sesion.id),
  ]);
  const metricas = metricasDeSesion(sesion, filaMetricas);
  const publicada = sesion.retroalimentacion?.publicadaEn != null;

  return (
    <div className="flex flex-1 flex-col">
      <LimpiarSesionActiva sesionId={sesion.id} />
      <EncabezadoPagina
        conBordeLateral={rol === 'docente'}
        volver={
          rol === 'estudiante'
            ? { href: '/practicas', etiqueta: 'Mis prácticas' }
            : { href: '/sesiones', etiqueta: 'Revisiones' }
        }
        titulo={
          <>
            <CodigoCaso
              codigo={sesion.escenario.codigo}
              className="mr-3 align-middle font-mono text-base font-medium text-laton-texto print:text-muted-foreground"
            />
            {sesion.escenario.titulo}
          </>
        }
        descripcion={
          sesion.estado === 'interrumpida'
            ? 'La práctica se cerró por inactividad. Esto es lo que alcanzó a quedar registrado.'
            : 'Práctica terminada. Este es el resumen de la práctica.'
        }
      >
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-sidebar-muted print:text-muted-foreground">
          <span>
            Estudiante:{' '}
            <span className="font-medium text-sidebar-foreground print:text-foreground">
              {sesion.estudiante.nombre}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{sesion.estudiante.codigo}</span>
          <span aria-hidden>·</span>
          <span>
            Paciente:{' '}
            <span className="rounded-md bg-terracota-suave px-2 py-0.5 text-xs font-medium text-terracota">
              {sesion.npc.nombre}
            </span>
          </span>
          {sesion.escenario.competenciaCentral && sesion.escenario.competenciaCentral !== '—' && (
            <>
              <span aria-hidden>·</span>
              <span>Competencia: {sesion.escenario.competenciaCentral}</span>
            </>
          )}
        </p>
      </EncabezadoPagina>

      <ContenedorHero className="gap-8 print:mt-0 print:gap-6 print:px-0">
        <div
          className={`rounded-2xl border border-border/80 bg-background p-5 sm:p-6 ${SOMBRA_SOBRE_NOGAL} print:border-0 print:bg-transparent print:p-0`}
        >
          <TarjetasMetricas metricas={metricas} para={rol} />
        </div>

        {rol === 'estudiante' &&
          (publicada ? (
            <div className="flex items-start gap-3 rounded-xl bg-salvia-suave p-5 text-sm">
              <MessageSquareQuote
                className="mt-0.5 size-5 shrink-0 text-salvia-oscuro"
                aria-hidden
              />
              <p>
                <span className="font-semibold">Tu docente ya publicó la retroalimentación.</span>{' '}
                <Link
                  href={`/practicas/${sesion.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  Léela aquí
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-ambar-suave p-5 text-sm">
              <Hourglass className="mt-0.5 size-5 shrink-0 text-ambar" aria-hidden />
              <p>
                <span className="font-semibold">Ahora le toca a tu docente.</span>{' '}
                <span className="text-muted-foreground">
                  Leerá la conversación y publicará su retroalimentación con una nota. La verás en
                  Mis prácticas; no enviamos avisos, así que vuelve a revisar.
                </span>
              </p>
            </div>
          ))}

        {rol === 'estudiante' && sesion.comenzada && (
          <ReflexionEstudiante sesionId={sesion.id} inicial={reflexion} />
        )}
        {rol === 'docente' && reflexion && (
          <ReflexionLeida
            contenido={reflexion.contenido}
            actualizadoEn={reflexion.actualizadoEn}
            estudiante={sesion.estudiante.nombre}
          />
        )}

        <section aria-labelledby="historial-titulo" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="historial-titulo" className="text-xl font-bold tracking-[-0.015em]">
              Conversación
            </h2>
            <p className="text-xs text-muted-foreground">
              Las respuestas del paciente las generó una IA.
            </p>
          </div>
          <HistorialResultados sesion={sesion} para={rol} />
        </section>

        {rol === 'docente' && (
          <p className="text-sm text-muted-foreground">
            Para comentar frases y publicar la nota, abre la{' '}
            <Link
              href={`/sesiones/${sesion.id}`}
              className="font-medium underline underline-offset-4"
            >
              revisión de esta práctica
            </Link>
            .
          </p>
        )}

        <AccionesResultados rol={rol} />
      </ContenedorHero>
    </div>
  );
}
