'use client';

import { CheckCircle2, Eye, Loader2, Save, Send } from 'lucide-react';
import { unstable_rethrow, useRouter } from 'next/navigation';
import { useEffect, useId, useState, useSyncExternalStore, useTransition } from 'react';
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
  /** Comentarios sobre frases: se nombran al confirmar la publicación. */
  comentarios: number;
  /** Próxima práctica por revisar, para publicar y seguir sin volver a la lista. */
  siguiente: { id: string; nombre: string } | null;
}

const claveBorrador = (sesionId: string) => `psysim:borrador-retro:${sesionId}`;

const sinSuscripcion = () => () => {};
/** El borrador local tal como estaba al abrir la práctica (escribir no lo cambia). */
const borradoresAlAbrir = new Map<string, string | null>();

function leerBorradorAlAbrir(sesionId: string): string | null {
  if (!borradoresAlAbrir.has(sesionId)) {
    let valor: string | null = null;
    try {
      valor = window.sessionStorage.getItem(claveBorrador(sesionId));
    } catch {
      // Sin almacenamiento no hay nada que recuperar.
    }
    borradoresAlAbrir.set(sesionId, valor);
  }
  return borradoresAlAbrir.get(sesionId) ?? null;
}

function guardarBorradorLocal(sesionId: string, texto: string) {
  try {
    window.sessionStorage.setItem(claveBorrador(sesionId), texto);
  } catch {
    // Sin almacenamiento solo se pierde la copia de respaldo.
  }
}

function borrarBorradorLocal(sesionId: string) {
  try {
    window.sessionStorage.removeItem(claveBorrador(sesionId));
  } catch {
    // Nada que limpiar.
  }
}

/** ¿Se editó después de publicarla? (el estudiante ve «Actualizada el…»). */
function fueEditada(publicadaEn: string | null, actualizadoEn: string | null) {
  return (
    publicadaEn !== null &&
    actualizadoEn !== null &&
    new Date(actualizadoEn).getTime() - new Date(publicadaEn).getTime() > 1000
  );
}

/**
 * Retroalimentación general y nota de la práctica. Se guarda como borrador hasta que el docente la
 * publica; desde ese momento el estudiante la ve en su panel. Publicar puede abrir directamente la
 * siguiente práctica por revisar. Una retroalimentación publicada se puede seguir corrigiendo: un
 * aviso permanente recuerda que el estudiante verá el cambio con la marca «Actualizada el…».
 */
export function FormularioRetroalimentacion({
  sesionId,
  inicial,
  nombreEstudiante,
  comentarios,
  siguiente,
}: FormularioRetroalimentacionProps) {
  const id = useId();
  const router = useRouter();
  const [comentario, setComentarioEstado] = useState(inicial?.comentarioGeneral ?? '');
  const [notaTexto, setNotaTexto] = useState(
    inicial?.nota !== null && inicial?.nota !== undefined ? formatearNota(inicial.nota) : ''
  );
  // Texto que quedó sin guardar en esta pestaña (p. ej. tras un fallo de red y una recarga).
  const borradorPrevio = useSyncExternalStore(
    sinSuscripcion,
    () => leerBorradorAlAbrir(sesionId),
    () => null
  );
  const [borradorDescartado, setBorradorDescartado] = useState(false);
  // Al salir de la práctica se olvida la lectura: al volver (sin recargar) se lee de nuevo.
  useEffect(() => () => void borradoresAlAbrir.delete(sesionId), [sesionId]);
  const borradorRecuperable =
    !borradorDescartado &&
    borradorPrevio &&
    borradorPrevio !== (inicial?.comentarioGeneral ?? '') &&
    borradorPrevio !== comentario
      ? borradorPrevio
      : null;

  // Lo escrito se guarda también en la pestaña: un fallo de red o una recarga no lo borra.
  const setComentario = (valor: string) => {
    setComentarioEstado(valor);
    guardarBorradorLocal(sesionId, valor);
  };
  const [publicadaEn, setPublicadaEn] = useState(inicial?.publicadaEn ?? null);
  const [actualizadoEn, setActualizadoEn] = useState(inicial?.actualizadoEn ?? null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, startTransition] = useTransition();

  const nota = leerNota(notaTexto);
  const errorNota =
    nota === null ? null : (notaSchema.safeParse(nota).error?.issues[0]?.message ?? null);
  const publicada = publicadaEn !== null;
  const primerNombre = nombreEstudiante.split(' ')[0];

  const enviar = (publicar: boolean) => {
    if (errorNota) {
      setError(errorNota);
      return;
    }
    setError(null);
    startTransition(async () => {
      const valores = { sesionId, comentarioGeneral: comentario, nota };
      let resultado;
      try {
        resultado = publicar
          ? await publicarRetroalimentacion(valores)
          : await guardarRetroalimentacion(valores);
      } catch (error) {
        // Una redirección (p. ej. sesión caducada) no es un fallo de red.
        unstable_rethrow(error);
        // Sin conexión: el texto se queda en el formulario (y en el borrador local).
        setConfirmando(false);
        setError(
          'No pudimos guardar: revisa tu conexión. Tu texto sigue aquí: inténtalo de nuevo.'
        );
        return;
      }
      setConfirmando(false);
      if (!resultado.ok) {
        setError(resultado.error || 'No pudimos guardar. Tu texto sigue aquí: inténtalo de nuevo.');
        return;
      }
      borrarBorradorLocal(sesionId);
      setBorradorDescartado(true);
      setPublicadaEn(resultado.datos.publicadaEn);
      setActualizadoEn(resultado.datos.actualizadoEn);

      if (publicar && !publicada) {
        if (siguiente) {
          toast.success(`Publicada. Abriste la práctica de ${siguiente.nombre.split(' ')[0]}.`);
          router.push(`/sesiones/${siguiente.id}`);
        } else {
          toast.success('Publicada. No quedan prácticas por revisar.');
          router.push('/inicio');
        }
        return;
      }
      toast.success(
        publicada
          ? `Cambios guardados. ${primerNombre} verá «Actualizada el ${formatearFechaHora(resultado.datos.actualizadoEn ?? new Date().toISOString())}».`
          : 'Borrador guardado.'
      );
    });
  };

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${id}-titulo`} className="text-lg font-bold tracking-[-0.01em]">
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

      {publicada && (
        <p className="flex items-start gap-2 rounded-lg bg-salvia-suave px-3 py-2.5 text-sm text-salvia-oscuro">
          <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
          Ya está publicada. Lo que guardes ahora lo verá {primerNombre} con la marca «Actualizada
          el…».
        </p>
      )}

      {borradorRecuperable && (
        <div className="flex flex-col gap-2 rounded-lg bg-ambar-suave px-3 py-2.5 text-sm text-ambar sm:flex-row sm:items-center">
          <p className="flex-1">Tienes un texto sin guardar de antes en esta pestaña.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setComentario(borradorRecuperable);
                setBorradorDescartado(true);
              }}
            >
              Recuperarlo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                borrarBorradorLocal(sesionId);
                setBorradorDescartado(true);
              }}
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-comentario`}>Comentario general</Label>
        <Textarea
          id={`${id}-comentario`}
          value={comentario}
          onChange={evento => setComentario(evento.target.value)}
          placeholder="Fortalezas, aspectos por mejorar y una recomendación para la próxima práctica."
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
          className="w-32 text-lg font-semibold ancho-semiexpandido tabular-nums"
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

      <div className="flex flex-col gap-3 border-t pt-4">
        {confirmando ? (
          <div className="flex flex-col gap-3 rounded-lg bg-muted p-3">
            <p className="text-sm">
              {primerNombre} verá la nota, el comentario general y tus comentarios ({comentarios})
              en cuanto publiques.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="accion"
                onClick={() => enviar(true)}
                disabled={enviando}
                aria-busy={enviando}
              >
                {enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                {enviando
                  ? 'Publicando…'
                  : siguiente
                    ? 'Publicar y abrir la siguiente'
                    : 'Publicar'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmando(false)} disabled={enviando}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {publicada ? (
              <Button onClick={() => enviar(false)} disabled={enviando} aria-busy={enviando}>
                {enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                {enviando ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            ) : (
              <>
                <Button variant="accion" onClick={() => setConfirmando(true)} disabled={enviando}>
                  <Send aria-hidden />
                  {siguiente ? 'Publicar y abrir la siguiente' : 'Publicar'}
                </Button>
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
              </>
            )}
          </div>
        )}
        <p aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {publicada && <CheckCircle2 className="size-3.5 text-success" aria-hidden />}
          {publicada && publicadaEn
            ? `Publicada el ${formatearFechaHora(publicadaEn)}`
            : 'Solo tú ves el borrador.'}
          {publicada && fueEditada(publicadaEn, actualizadoEn) && actualizadoEn
            ? ` · Editada el ${formatearFechaHora(actualizadoEn)}`
            : !publicada && actualizadoEn
              ? ` · Guardado el ${formatearFechaHora(actualizadoEn)}`
              : null}
        </p>
      </div>
    </section>
  );
}
