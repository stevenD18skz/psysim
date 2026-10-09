'use client';

import { CheckCircle2, Loader2, Save, Send } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
import {
  guardarRetroalimentacion,
  publicarRetroalimentacion,
} from '@/lib/retroalimentacion/actions';
import { cn } from '@/lib/utils';
import {
  LIMITES_RETROALIMENTACION,
  leerNota,
  notaSchema,
} from '@/schemas/retroalimentacion.schema';
import { type Retroalimentacion } from '@/types';

interface FormularioRetroalimentacionProps {
  sesionId: string;
  inicial: Retroalimentacion | null;
  nombreEstudiante: string;
}

/**
 * Retroalimentación general y nota de la sesión. Se guarda como borrador hasta que el docente la
 * publica; desde ese momento el estudiante la ve en su panel (y ve los cambios que se guarden
 * después).
 */
export function FormularioRetroalimentacion({
  sesionId,
  inicial,
  nombreEstudiante,
}: FormularioRetroalimentacionProps) {
  const id = useId();
  const [comentario, setComentario] = useState(inicial?.comentarioGeneral ?? '');
  const [notaTexto, setNotaTexto] = useState(
    inicial?.nota !== null && inicial?.nota !== undefined ? formatearNota(inicial.nota) : ''
  );
  const [publicadaEn, setPublicadaEn] = useState(inicial?.publicadaEn ?? null);
  const [actualizadoEn, setActualizadoEn] = useState(inicial?.actualizadoEn ?? null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, startTransition] = useTransition();

  const nota = leerNota(notaTexto);
  const errorNota =
    nota === null ? null : (notaSchema.safeParse(nota).error?.issues[0]?.message ?? null);
  const publicada = publicadaEn !== null;

  const enviar = (publicar: boolean) => {
    if (errorNota) {
      setError(errorNota);
      return;
    }
    setError(null);
    startTransition(async () => {
      const valores = { sesionId, comentarioGeneral: comentario, nota };
      const resultado = publicar
        ? await publicarRetroalimentacion(valores)
        : await guardarRetroalimentacion(valores);
      setConfirmando(false);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setPublicadaEn(resultado.datos.publicadaEn);
      setActualizadoEn(resultado.datos.actualizadoEn);
      toast.success(
        publicar && !publicada
          ? `Retroalimentación publicada: ${nombreEstudiante.split(' ')[0]} ya puede verla.`
          : publicada
            ? 'Cambios guardados. El estudiante ve la versión actualizada.'
            : 'Borrador guardado.'
      );
    });
  };

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${id}-titulo`} className="text-lg font-semibold tracking-tight">
          Retroalimentación
        </h2>
        <InsigniaEstado
          className="ml-auto"
          estado={
            publicada
              ? { texto: 'Publicada', tono: 'listo' }
              : { texto: 'Borrador', tono: 'pendiente' }
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-comentario`}>Comentario general</Label>
        <Textarea
          id={`${id}-comentario`}
          value={comentario}
          onChange={evento => setComentario(evento.target.value)}
          placeholder="Fortalezas, aspectos por mejorar y recomendaciones para la próxima práctica."
          className="min-h-40"
          maxLength={LIMITES_RETROALIMENTACION.comentarioGeneral}
          disabled={enviando}
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {comentario.length.toLocaleString('es-CO')}/
          {LIMITES_RETROALIMENTACION.comentarioGeneral.toLocaleString('es-CO')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-nota`}>Nota (0,0 a 5,0)</Label>
        <Input
          id={`${id}-nota`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ej.: 4,5"
          value={notaTexto}
          onChange={evento => setNotaTexto(evento.target.value)}
          className="w-32 font-heading text-lg tabular-nums"
          aria-invalid={errorNota ? true : undefined}
          aria-describedby={errorNota ? `${id}-nota-error` : undefined}
          disabled={enviando}
        />
        {errorNota && (
          <p id={`${id}-nota-error`} className="text-sm text-destructive">
            {errorNota}
          </p>
        )}
      </div>

      {error && error !== errorNota && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        {confirmando ? (
          <div className="flex flex-col gap-2 rounded-xl bg-accent/50 p-3">
            <p className="text-sm">
              {nombreEstudiante.split(' ')[0]} verá la retroalimentación, la nota y tus comentarios
              en cuanto la publiques.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => enviar(true)} disabled={enviando} aria-busy={enviando}>
                {enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                Sí, publicar
              </Button>
              <Button variant="ghost" onClick={() => setConfirmando(false)} disabled={enviando}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {publicada ? (
              <Button onClick={() => enviar(false)} disabled={enviando} aria-busy={enviando}>
                {enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                Guardar cambios
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => enviar(false)}
                  disabled={enviando}
                  aria-busy={enviando}
                >
                  {enviando ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Save aria-hidden />
                  )}
                  Guardar borrador
                </Button>
                <Button onClick={() => setConfirmando(true)} disabled={enviando}>
                  <Send aria-hidden />
                  Publicar
                </Button>
              </>
            )}
          </div>
        )}
        <p
          aria-live="polite"
          className={cn(
            'flex items-center gap-1.5 text-xs text-muted-foreground',
            !actualizadoEn && 'sr-only'
          )}
        >
          {publicada && <CheckCircle2 className="size-3.5 text-success" aria-hidden />}
          {publicada && publicadaEn
            ? `Publicada el ${formatearFechaHora(publicadaEn)}`
            : 'Solo tú ves el borrador.'}
          {actualizadoEn && ` · Guardado el ${formatearFechaHora(actualizadoEn)}`}
        </p>
      </div>
    </section>
  );
}
