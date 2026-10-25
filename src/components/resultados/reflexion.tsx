'use client';

import { Check, Loader2, NotebookPen } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';
import { guardarReflexion } from '@/lib/reflexion/actions';
import { LIMITE_REFLEXION } from '@/schemas/reflexion.schema';

const PREGUNTAS = [
  '¿Qué momento de la conversación sentiste que funcionó?',
  '¿Qué harías distinto la próxima vez?',
];

/**
 * Reflexión del estudiante al terminar la práctica (INACSL: conversación posterior). Es opcional,
 * se puede corregir o retirar (guardar vacío) y la lee su docente al revisar: es el punto de
 * partida de la conversación posterior, que sigue siendo del docente. Dice con claridad quién la
 * ve, porque antes este cuadro era solo para el estudiante y no se guardaba.
 */
export function ReflexionEstudiante({
  sesionId,
  inicial,
}: {
  sesionId: string;
  inicial: { contenido: string; actualizadoEn: string } | null;
}) {
  const idCampo = useId();
  const [texto, setTexto] = useState(inicial?.contenido ?? '');
  const [guardado, setGuardado] = useState(inicial);
  const [guardando, startTransition] = useTransition();

  const sinCambios = texto.trim() === (guardado?.contenido ?? '');

  const guardar = () =>
    startTransition(async () => {
      const contenido = texto.trim();
      let resultado;
      try {
        resultado = await guardarReflexion({ sesionId, contenido });
      } catch {
        toast.error('No pudimos guardar tu reflexión: revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      setTexto(contenido);
      setGuardado(contenido ? { contenido, actualizadoEn: new Date().toISOString() } : null);
      toast.success(contenido ? 'Reflexión guardada.' : 'Reflexión retirada.');
    });

  return (
    <section
      aria-labelledby={`${idCampo}-titulo`}
      className="flex flex-col gap-3 rounded-xl bg-salvia-suave p-5"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={`${idCampo}-titulo`}
          className="flex items-center gap-2 text-lg font-bold tracking-[-0.01em] text-salvia-oscuro"
        >
          <NotebookPen className="size-5" aria-hidden />
          Tu reflexión (opcional)
        </h2>
        <p className="text-sm text-salvia-oscuro">
          Tu docente la leerá junto con la conversación. Puedes corregirla o borrarla cuando
          quieras.
        </p>
      </div>
      <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm">
        {PREGUNTAS.map(pregunta => (
          <li key={pregunta}>{pregunta}</li>
        ))}
      </ul>
      <label htmlFor={idCampo} className="sr-only">
        Tu reflexión
      </label>
      <Textarea
        id={idCampo}
        value={texto}
        onChange={evento => setTexto(evento.target.value)}
        maxLength={LIMITE_REFLEXION}
        placeholder="Escribe lo que quieras compartir con tu docente…"
        className="min-h-28 bg-card"
        aria-describedby={`${idCampo}-estado`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          id={`${idCampo}-estado`}
          role="status"
          className="flex items-center gap-1.5 text-xs text-salvia-oscuro"
        >
          {guardado ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Guardada el {formatearFechaHora(guardado.actualizadoEn)}
              {!sinCambios && ' · con cambios sin guardar'}
            </>
          ) : (
            <span className="tabular-nums">
              {texto.length} / {LIMITE_REFLEXION}
            </span>
          )}
        </p>
        <Button
          type="button"
          variant="accion"
          onClick={guardar}
          disabled={guardando || sinCambios}
          aria-busy={guardando}
        >
          {guardando && <Loader2 className="animate-spin" aria-hidden />}
          {guardando
            ? 'Guardando…'
            : guardado && texto.trim() === ''
              ? 'Retirar reflexión'
              : 'Guardar reflexión'}
        </Button>
      </div>
    </section>
  );
}

/** La reflexión del estudiante, de solo lectura, para su docente. */
export function ReflexionLeida({
  contenido,
  actualizadoEn,
  estudiante,
}: {
  contenido: string;
  actualizadoEn: string;
  estudiante: string;
}) {
  return (
    <section
      aria-labelledby="reflexion-leida"
      className="flex flex-col gap-2 rounded-xl border bg-card p-5"
    >
      <h2
        id="reflexion-leida"
        className="flex items-center gap-2 text-lg font-bold tracking-[-0.01em]"
      >
        <NotebookPen className="size-5 text-salvia" aria-hidden />
        Reflexión de {estudiante}
      </h2>
      <p className="leading-relaxed whitespace-pre-wrap">{contenido}</p>
      <p className="text-xs text-muted-foreground">
        Escrita por el estudiante al terminar · {formatearFechaHora(actualizadoEn)}. Puedes usarla
        como punto de partida de la conversación posterior.
      </p>
    </section>
  );
}
