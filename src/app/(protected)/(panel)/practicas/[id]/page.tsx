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
 * Una práctica terminada vista por el estudiante: su conversación con el paciente y, cuando el
 * docente la publica, la retroalimentación con la nota y los comentarios sobre sus frases.
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <EncabezadoSesion
        sesion={sesion}
        para="estudiante"
        volver={{ href: '/practicas', etiqueta: 'Mis prácticas' }}
      />

      {retro ? (
        <section
          aria-labelledby="retro-titulo"
          className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:flex-row sm:p-6"
        >
          <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-accent px-6 py-4 text-center">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Nota
            </span>
            <span
              data-testid="nota-publicada"
              className="font-heading text-4xl font-semibold tabular-nums"
            >
              {formatearNota(retro.nota)}
            </span>
            <span className="text-xs text-muted-foreground">de 5,0</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 id="retro-titulo" className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquareQuote className="size-5 text-primary" aria-hidden />
              Retroalimentación{sesion.docente ? ` de ${sesion.docente}` : ''}
            </h2>
            <p className="leading-relaxed whitespace-pre-wrap">{retro.comentarioGeneral}</p>
            <p className="text-xs text-muted-foreground">
              Publicada el {formatearFechaHora(retro.publicadaEn ?? retro.actualizadoEn)}
              {totalComentarios > 0 &&
                ` · ${totalComentarios} ${totalComentarios === 1 ? 'comentario' : 'comentarios'} en tu conversación`}
            </p>
          </div>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-5 text-sm">
          <Hourglass className="size-5 shrink-0 text-primary" aria-hidden />
          <p>
            <span className="font-medium">Pendiente de retroalimentación.</span>{' '}
            <span className="text-muted-foreground">
              Tu docente aún no la ha publicado. Mientras tanto, puedes releer tu conversación.
            </span>
          </p>
        </div>
      )}

      <section aria-labelledby="conversacion-titulo" className="flex flex-col gap-4">
        <h2 id="conversacion-titulo" className="text-xl font-semibold tracking-tight">
          Tu conversación
        </h2>
        <VistaConversacion sesion={sesion} />
      </section>
    </div>
  );
}
