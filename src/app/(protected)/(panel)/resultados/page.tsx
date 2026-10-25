import { Hourglass, MessageSquareQuote } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { EncabezadoPagina } from '@/components/comun/encabezado-pagina';
import {
  AccionesResultados,
  LimpiarSesionActiva,
} from '@/components/resultados/acciones-resultados';
import { HistorialResultados } from '@/components/resultados/historial-resultados';
import { TarjetasMetricas } from '@/components/resultados/tarjetas-metricas';
import { requerirUsuario } from '@/lib/auth/dal';
import { RUTA_INICIO } from '@/lib/auth/routes';
import { obtenerDetalleSesion, obtenerMetricasGuardadas } from '@/lib/sesiones/queries';
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

  const metricas = metricasDeSesion(sesion, await obtenerMetricasGuardadas(sesion.id));
  const publicada = sesion.retroalimentacion?.publicadaEn != null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <LimpiarSesionActiva sesionId={sesion.id} />
      <EncabezadoPagina
        volver={
          rol === 'estudiante'
            ? { href: '/practicas', etiqueta: 'Mis prácticas' }
            : { href: '/sesiones', etiqueta: 'Sesiones' }
        }
        titulo={
          <>
            <CodigoCaso
              codigo={sesion.escenario.codigo}
              className="mr-3 align-middle font-mono text-base font-medium text-muted-foreground"
            />
            {sesion.escenario.titulo}
          </>
        }
        descripcion={
          sesion.estado === 'interrumpida'
            ? 'La práctica se cerró por inactividad. Esto es lo que alcanzó a quedar registrado.'
            : 'Práctica terminada. Este es el resumen de la sesión.'
        }
      >
        <p className="text-muted-foreground">
          Estudiante:{' '}
          <span className="font-medium text-foreground">{sesion.estudiante.nombre}</span>
          {' · '}
          <span className="tabular-nums">{sesion.estudiante.codigo}</span>
          <span aria-hidden> · </span>
          Paciente: <span className="font-medium text-terracota">{sesion.npc.nombre}</span>
        </p>
      </EncabezadoPagina>

      <TarjetasMetricas metricas={metricas} para={rol} />

      {rol === 'estudiante' &&
        (publicada ? (
          <div className="flex items-start gap-3 rounded-xl bg-salvia-suave p-5 text-sm">
            <MessageSquareQuote className="mt-0.5 size-5 shrink-0 text-salvia-oscuro" aria-hidden />
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
                Leerá la conversación y publicará su retroalimentación con una nota. La verás en Mis
                prácticas; no enviamos avisos, así que vuelve a revisar.
              </span>
            </p>
          </div>
        ))}

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
            revisión de esta sesión
          </Link>
          .
        </p>
      )}

      <AccionesResultados rol={rol} />
    </div>
  );
}
