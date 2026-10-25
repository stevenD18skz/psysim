import { BookOpenText, Radio } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ReflexionLeida } from '@/components/resultados/reflexion';
import { RevisionSesion } from '@/components/retroalimentacion/revision-sesion';
import { BotonInterrumpir } from '@/components/sesiones/boton-interrumpir';
import { EncabezadoSesion, type PosicionRevision } from '@/components/sesiones/encabezado-sesion';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearHora } from '@/lib/fechas';
import { estaPorRevisar } from '@/lib/sesiones/estados';
import {
  obtenerDetalleSesion,
  obtenerReflexion,
  obtenerSesionesDelDocente,
} from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Revisión de la práctica',
};

/**
 * Práctica de un estudiante vista por el docente. Mientras el estudiante practica solo se informa
 * que está en curso (la página se actualiza sola); al terminar, el docente lee la conversación,
 * comenta frases y publica la retroalimentación con la nota, y puede pasar a la siguiente
 * práctica por revisar sin volver a la lista.
 */
export default async function SesionPage({ params }: PageProps<'/sesiones/[id]'>) {
  await requerirDocente();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [sesion, reflexion, sesiones] = await Promise.all([
    obtenerDetalleSesion(id),
    obtenerReflexion(id),
    // La cola de revisión es una ayuda: si falla, la página funciona sin ella.
    obtenerSesionesDelDocente().catch(() => []),
  ]);
  if (!sesion) notFound();

  const enCurso = sesion.estado === 'en_curso';

  // Cola de pendientes en el mismo orden que la bandeja: la que más espera, primero.
  const cola = sesiones
    .filter(estaPorRevisar)
    .sort((a, b) => (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio));
  const indice = cola.findIndex(s => s.id === sesion.id);
  const posicion: PosicionRevision | null =
    indice === -1
      ? null
      : {
          indice: indice + 1,
          total: cola.length,
          anterior: indice > 0 ? `/sesiones/${cola[indice - 1]!.id}` : null,
          siguiente: indice < cola.length - 1 ? `/sesiones/${cola[indice + 1]!.id}` : null,
        };
  // Al publicar se abre la siguiente pendiente; si era la última (o no estaba en la cola), la
  // primera que siga esperando.
  const restantes = cola.filter(s => s.id !== sesion.id);
  const proxima = restantes[indice === -1 ? 0 : indice] ?? restantes[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <RefrescoAutomatico activo={enCurso} />
      <EncabezadoSesion
        sesion={sesion}
        para="docente"
        volver={{ href: '/sesiones', etiqueta: 'Revisiones' }}
        posicion={posicion}
      />

      {enCurso ? (
        <section
          aria-labelledby="en-curso-titulo"
          className="flex flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center sm:p-12"
        >
          <span className="relative flex size-16 items-center justify-center rounded-full bg-salvia-suave text-salvia-oscuro">
            {sesion.comenzada ? (
              <Radio className="size-8" aria-hidden />
            ) : (
              <BookOpenText className="size-8" aria-hidden />
            )}
            <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
              <span className="absolute inline-flex size-full rounded-full bg-salvia opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-3.5 rounded-full bg-salvia" />
            </span>
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 id="en-curso-titulo" className="text-2xl font-bold tracking-[-0.02em]">
              {sesion.comenzada ? 'Practicando ahora' : 'Abrió la práctica'}
            </h2>
            <p className="text-muted-foreground">
              {sesion.comenzada
                ? `${sesion.estudiante.nombre} está conversando con el paciente desde las ${formatearHora(sesion.inicio)}. Podrás leer la conversación cuando termine.`
                : `${sesion.estudiante.nombre} usó el código y aún no empieza.`}{' '}
              Esta página se actualiza sola.
            </p>
          </div>
          <BotonInterrumpir sesionId={sesion.id} />
        </section>
      ) : (
        <>
          {reflexion && (
            <ReflexionLeida
              contenido={reflexion.contenido}
              actualizadoEn={reflexion.actualizadoEn}
              estudiante={sesion.estudiante.nombre}
            />
          )}
          <RevisionSesion
            sesion={sesion}
            siguiente={proxima ? { id: proxima.id, nombre: proxima.estudiante.nombre } : null}
          />
        </>
      )}
    </div>
  );
}
