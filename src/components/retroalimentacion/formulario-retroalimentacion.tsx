'use client';

import { CheckCircle2, Eye, Loader2, Save, Send } from 'lucide-react';
import { unstable_rethrow, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { InsigniaEstado } from '@/components/sesiones/insignia-estado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRespaldoRevision } from '@/hooks/use-respaldo-revision';
import { formatearFechaHora, formatearNota } from '@/lib/estudiantes/estudiantes';
import { guardarRetroalimentacion } from '@/lib/retroalimentacion/actions';
import {
  LIMITES_RETROALIMENTACION,
  borradorRevisionSchema,
  leerNota,
  notaSchema,
  type ModoRevision,
} from '@/schemas/retroalimentacion.schema';
import { type Retroalimentacion } from '@/types';

interface FormularioRetroalimentacionProps {
  sesionId: string;
  cuentaId: string;
  inicial: Retroalimentacion | null;
  nombreEstudiante: string;
  /** Comentarios sobre frases: se nombran al confirmar la publicación. */
  comentarios: number;
  /** Próxima práctica por revisar, para publicar y seguir sin volver a la lista. */
  siguiente: { id: string; nombre: string } | null;
}

type Revision = Omit<Retroalimentacion, 'anotaciones'>;

function mismoContenidoRevision(anterior: Revision | null, actual: Revision) {
  return (
    (anterior?.comentarioGeneral ?? '') === actual.comentarioGeneral &&
    (anterior?.nota ?? null) === actual.nota &&
    (anterior?.publicadaEn ?? null) === actual.publicadaEn
  );
}

function textoNota(nota: number | null | undefined) {
  return nota == null ? '' : formatearNota(nota);
}

/**
 * Retroalimentación general y nota de la práctica. Se guarda como borrador hasta que el docente la
 * publica; desde ese momento el estudiante la ve en su panel. Publicar puede abrir directamente la
 * siguiente práctica por revisar. Una retroalimentación publicada se puede seguir corrigiendo: un
 * aviso permanente recuerda que el estudiante verá el cambio con la marca «Actualizada el…».
 */
export function FormularioRetroalimentacion({
  sesionId,
  cuentaId,
  inicial,
  nombreEstudiante,
  comentarios,
  siguiente,
}: FormularioRetroalimentacionProps) {
  const id = useId();
  const router = useRouter();
  const [valores, setValores] = useState({
    comentario: inicial?.comentarioGeneral ?? '',
    notaTexto: textoNota(inicial?.nota),
  });
  const { comentario, notaTexto } = valores;
  const [revision, setRevision] = useState<Revision | null>(inicial);
  const [conflicto, setConflicto] = useState<Revision | null>(null);
  const [borradorVisto, setBorradorVisto] = useState(false);
  const respaldo = useRespaldoRevision(
    `psysim:borrador-retro:${cuentaId}:${sesionId}:general`,
    borradorRevisionSchema
  );
  // Al refrescar después de anotar puede cambiar la fecha sin cambiar el formulario.
  const base =
    inicial &&
    inicial.actualizadoEn > (revision?.actualizadoEn ?? '') &&
    mismoContenidoRevision(revision, inicial)
      ? inicial
      : revision;
  const version = base?.actualizadoEn ?? null;
  const publicadaEn = (conflicto ?? base)?.publicadaEn ?? null;
  const actualizadoEn = (conflicto ?? base)?.actualizadoEn ?? null;
  const borradorPrevio = respaldo.borrador;
  const borradorRecuperable =
    !borradorVisto &&
    borradorPrevio &&
    (borradorPrevio.comentario.trim() !== (base?.comentarioGeneral ?? '') ||
      leerNota(borradorPrevio.notaTexto) !== (base?.nota ?? null))
      ? borradorPrevio
      : null;

  function editar(nuevos: typeof valores) {
    setValores(nuevos);
    setBorradorVisto(true);
    respaldo.actualizar(() => ({ ...nuevos, version }));
  }

  function resolverConflicto(conservarEdicion: boolean) {
    if (!conflicto) return;
    setRevision(conflicto);
    setConflicto(null);
    setBorradorVisto(true);
    setError(null);
    if (conservarEdicion) {
      respaldo.actualizar(() => ({ ...valores, version: conflicto.actualizadoEn }));
    } else {
      setValores({ comentario: conflicto.comentarioGeneral, notaTexto: textoNota(conflicto.nota) });
      respaldo.actualizar(() => null);
    }
  }
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, startTransition] = useTransition();
  const campoNota = useRef<HTMLInputElement>(null);
  const botonPublicar = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);

  useEffect(() => {
    if (confirmando || enviando || !devolverFoco.current) return;
    devolverFoco.current = false;
    botonPublicar.current?.focus();
  }, [confirmando, enviando]);

  const nota = leerNota(notaTexto);
  const errorNota =
    nota === null ? null : (notaSchema.safeParse(nota).error?.issues[0]?.message ?? null);
  const publicada = publicadaEn !== null;
  const primerNombre = nombreEstudiante.split(' ')[0];

  const validarNota = () => {
    if (!errorNota) return true;
    campoNota.current?.focus();
    return false;
  };

  const cerrarConfirmacion = () => {
    devolverFoco.current = true;
    setConfirmando(false);
  };

  const enviar = (modo: ModoRevision) => {
    if (conflicto || !validarNota()) return;
    setError(null);
    const solicitud = { sesionId, modo, version, comentarioGeneral: comentario, nota };
    startTransition(async () => {
      let resultado;
      try {
        resultado = await guardarRetroalimentacion(solicitud);
        if (
          resultado.ok &&
          resultado.datos.conflicto &&
          mismoContenidoRevision(base, resultado.datos.revision)
        ) {
          // Anotar puede crear o fechar la revisión antes de que llegue el refresco. La nueva
          // versión sigue protegiendo el guardado si otra pestaña edita durante el reintento.
          resultado = await guardarRetroalimentacion({
            ...solicitud,
            version: resultado.datos.revision.actualizadoEn,
          });
        }
      } catch (error) {
        // Una redirección (p. ej. sesión caducada) no es un fallo de red.
        unstable_rethrow(error);
        // Sin conexión: el texto se queda en el formulario (y en el borrador local).
        if (modo === 'publicar') cerrarConfirmacion();
        setError(
          'No pudimos guardar: revisa tu conexión. Tu texto sigue aquí: inténtalo de nuevo.'
        );
        return;
      }
      setConfirmando(false);
      if (!resultado.ok) {
        if (modo === 'publicar') cerrarConfirmacion();
        setError(resultado.error || 'No pudimos guardar. Tu texto sigue aquí: inténtalo de nuevo.');
        return;
      }
      const confirmada = resultado.datos.revision;
      if (resultado.datos.conflicto) {
        setConflicto(confirmada);
        return;
      }
      respaldo.actualizar(() => null);
      setBorradorVisto(true);
      setRevision(confirmada);

      if (modo === 'publicar') {
        if (siguiente) {
          toast.success(`Publicada. Abriste la práctica de ${siguiente.nombre.split(' ')[0]}.`);
          router.push(`/sesiones/${siguiente.id}`);
        } else {
          toast.success('Publicada. No quedan prácticas por revisar.');
          router.push('/inicio');
        }
        return;
      }
      toast.success(modo === 'editar' ? 'Cambios guardados.' : 'Borrador guardado.');
    });
  };

  return (
    <section
      data-tour="revision-formulario"
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
          Ya está publicada. Si guardas cambios, {primerNombre} los verá con la fecha de la
          actualización.
        </p>
      )}

      {borradorRecuperable && (
        <div className="flex flex-col gap-2 rounded-lg bg-ambar-suave px-3 py-2.5 text-sm text-ambar sm:flex-row sm:items-center">
          <p className="flex-1">Tienes cambios sin guardar de antes en esta pestaña.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setValores(borradorRecuperable);
                setBorradorVisto(true);
                if (base && borradorRecuperable.version !== version) setConflicto(base);
              }}
            >
              Recuperarlo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                respaldo.actualizar(() => null);
                setBorradorVisto(true);
              }}
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      {conflicto && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted p-3 text-sm">
          <p role="alert" className="font-medium">
            {conflicto.publicadaEn
              ? 'La retroalimentación publicada cambió. Revisa lo que ve el estudiante.'
              : 'El borrador guardado cambió. Revisa la versión actual antes de continuar.'}
          </p>
          <dl className="flex flex-col gap-1">
            <dt className="font-medium">Nota actual</dt>
            <dd>{conflicto.nota === null ? 'Sin nota' : formatearNota(conflicto.nota)}</dd>
            <dt className="font-medium">Comentario actual</dt>
            <dd className="max-h-44 overflow-auto wrap-anywhere whitespace-pre-wrap">
              {conflicto.comentarioGeneral || 'Sin comentario general'}
            </dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => resolverConflicto(true)}
            >
              Continuar con mi edición
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => resolverConflicto(false)}
            >
              Usar la versión actual
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-comentario`}>Comentario general</Label>
        <Textarea
          id={`${id}-comentario`}
          value={comentario}
          onChange={evento => editar({ ...valores, comentario: evento.target.value })}
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
          ref={campoNota}
          id={`${id}-nota`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ej.: 4,5"
          value={notaTexto}
          onChange={evento => editar({ ...valores, notaTexto: evento.target.value })}
          className="w-32 text-lg font-semibold ancho-semiexpandido tabular-nums"
          aria-invalid={errorNota ? true : undefined}
          aria-describedby={errorNota ? `${id}-nota-error` : undefined}
          disabled={enviando}
        />
        {errorNota && (
          <p id={`${id}-nota-error`} role="alert" className="text-sm text-destructive">
            {errorNota}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t pt-4">
        {conflicto ? null : confirmando ? (
          <div className="flex flex-col gap-3 rounded-lg bg-muted p-3">
            <p id={`${id}-publicacion`} className="text-sm">
              {primerNombre} verá la nota, el comentario general y tus comentarios ({comentarios})
              en cuanto publiques.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={cerrarConfirmacion}
                aria-describedby={`${id}-publicacion`}
                disabled={enviando}
                autoFocus
              >
                Volver
              </Button>
              <Button
                variant="accion"
                aria-describedby={`${id}-publicacion`}
                onClick={() => enviar('publicar')}
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
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {publicada ? (
              <Button onClick={() => enviar('editar')} disabled={enviando} aria-busy={enviando}>
                {enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                {enviando ? 'Guardando…' : 'Guardar cambios publicados'}
              </Button>
            ) : (
              <>
                <Button
                  ref={botonPublicar}
                  variant="accion"
                  onClick={() => {
                    if (validarNota()) setConfirmando(true);
                  }}
                  disabled={enviando}
                >
                  <Send aria-hidden />
                  {siguiente ? 'Publicar y abrir la siguiente' : 'Publicar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => enviar('borrador')}
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
          {publicada && actualizadoEn && actualizadoEn !== publicadaEn
            ? ` · Editada el ${formatearFechaHora(actualizadoEn)}`
            : !publicada && actualizadoEn
              ? ` · Guardado el ${formatearFechaHora(actualizadoEn)}`
              : null}
        </p>
      </div>
    </section>
  );
}
