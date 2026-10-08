import { BookOpenText, Radio } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { RevisionSesion } from '@/components/retroalimentacion/revision-sesion';
import { BotonInterrumpir } from '@/components/sesiones/boton-interrumpir';
import { EncabezadoSesion } from '@/components/sesiones/encabezado-sesion';
import { RefrescoAutomatico } from '@/components/sesiones/refresco-automatico';
import { requerirDocente } from '@/lib/auth/dal';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { obtenerDetalleSesion } from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Revisión de la sesión',
};

/**
 * Sesión de un estudiante vista por el docente. Mientras el estudiante practica solo se informa
 * que la simulación está en progreso (la página se actualiza sola); al terminar, el docente revisa
 * el chat, subraya frases con comentarios y publica la retroalimentación con la nota.
 */
export default async function SesionPage({ params }: PageProps<'/sesiones/[id]'>) {
  await requerirDocente();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const sesion = await obtenerDetalleSesion(id);
  if (!sesion) notFound();

  const enCurso = sesion.estado === 'en_curso';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <RefrescoAutomatico activo={enCurso} />
      <EncabezadoSesion
        sesion={sesion}
        para="docente"
        volver={{
          href: `/estudiantes/${sesion.estudiante.id}`,
          etiqueta: sesion.estudiante.nombre,
        }}
      />

      {enCurso ? (
        <section
          aria-labelledby="en-curso-titulo"
          className="flex flex-col items-center gap-5 rounded-3xl border bg-card p-8 text-center shadow-xs sm:p-12"
        >
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {sesion.comenzada ? (
              <Radio className="size-8" aria-hidden />
            ) : (
              <BookOpenText className="size-8" aria-hidden />
            )}
            <span className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-3 rounded-full bg-primary" />
            </span>
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 id="en-curso-titulo" className="text-2xl font-semibold tracking-tight">
              {sesion.comenzada ? 'Simulación en progreso' : 'Leyendo las instrucciones del caso'}
            </h2>
            <p className="text-muted-foreground">
              {sesion.comenzada
                ? `${sesion.estudiante.nombre} está conversando con el paciente desde las ${formatearFechaHora(sesion.inicio)}.`
                : `${sesion.estudiante.nombre} abrió la simulación y aún no la ha comenzado.`}{' '}
              Podrás revisar el chat y darle retroalimentación cuando termine. Esta página se
              actualiza sola.
            </p>
          </div>
          <BotonInterrumpir sesionId={sesion.id} />
        </section>
      ) : (
        <RevisionSesion sesion={sesion} />
      )}
    </div>
  );
}
