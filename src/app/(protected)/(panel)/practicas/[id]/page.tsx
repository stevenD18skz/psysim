import { Hourglass, MessageSquareQuote } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { VistaConversacion } from '@/components/practicas/vista-conversacion';
import { EncabezadoSesion } from '@/components/sesiones/encabezado-sesion';
import { requerirEstudiante } from '@/lib/auth/dal';
import { formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
import { obtenerDetalleSesion } from '@/lib/sesiones/queries';

export const metadata: Metadata = {
  title: 'Mi práctica',
};

/**
 * Una práctica terminada vista por el estudiante: primero lo que aprende (el comentario general
 * de su docente y los comentarios sobre sus frases) y la nota al lado, como contexto. Si el docente
 * corrigió la retroalimentación después de publicarla, se dice cuándo.
 */
export default async function PracticaPage({ params }: PageProps<'/practicas/[id]'>) {
  await requerirEstudiante();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const sesion = await obtenerDetalleSesion(id);
  if (!sesion) notFound();
  if (sesion.estado === 'en_curso') redirect(`/simulacion?sesion=${sesion.id}`);

  // RLS solo entrega la retroalimentación publicada.
  const retro = sesion.retroalimentacion?.publicadaEn ? sesion.retroalimentacion : null;
  const totalComentarios = retro?.anotaciones.length ?? 0;
  const actualizada =
    retro?.publicadaEn &&
    new Date(retro.actualizadoEn).getTime() - new Date(retro.publicadaEn).getTime() > 1000;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <EncabezadoSesion
        sesion={sesion}
        para="estudiante"
        volver={{ href: '/practicas', etiqueta: 'Mis prácticas' }}
      />

      {retro ? (
        <section
          aria-labelledby="retro-titulo"
          className="grid gap-5 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <h2
              id="retro-titulo"
              className="flex items-center gap-2 text-lg font-bold tracking-[-0.01em]"
            >
              <MessageSquareQuote className="size-5 text-salvia" aria-hidden />
              Retroalimentación de {sesion.docente ?? 'tu docente'}
            </h2>
            <p className="leading-relaxed whitespace-pre-wrap">{retro.comentarioGeneral}</p>
            <p className="text-xs text-muted-foreground">
              Publicada el {formatearFechaHora(retro.publicadaEn ?? retro.actualizadoEn)}
              {actualizada && ` · Actualizada el ${formatearFechaHora(retro.actualizadoEn)}`}
              {totalComentarios > 0 &&
                ` · ${totalComentarios} ${totalComentarios === 1 ? 'comentario' : 'comentarios'} en tu conversación`}
            </p>
          </div>
          <div className="flex items-baseline gap-2 border-t pt-4 sm:flex-col sm:items-end sm:gap-0.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <span className="text-sm text-muted-foreground">Nota de esta práctica</span>
            <span
              data-testid="nota-publicada"
              className="text-3xl font-semibold ancho-semiexpandido tabular-nums"
            >
              {formatearNota(retro.nota)}
            </span>
            <span className="text-xs text-muted-foreground">de 5,0</span>
          </div>
        </section>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-ambar-suave p-5 text-sm">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-ambar" aria-hidden />
          <p>
            <span className="font-semibold">Tu docente aún no publica la retroalimentación.</span>{' '}
            <span className="text-muted-foreground">
              Mientras tanto, puedes releer tu conversación. Cuando la publique, la verás aquí; no
              enviamos avisos.
            </span>
          </p>
        </div>
      )}

      <section aria-labelledby="conversacion-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="conversacion-titulo" className="text-xl font-bold tracking-[-0.015em]">
            Tu conversación
          </h2>
          <p className="text-xs text-muted-foreground">
            Las respuestas del paciente las generó una IA.
          </p>
        </div>
        <VistaConversacion sesion={sesion} />
      </section>
    </div>
  );
}
