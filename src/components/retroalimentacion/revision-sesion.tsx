'use client';

import { Highlighter, Loader2, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { FormularioRetroalimentacion } from '@/components/retroalimentacion/formulario-retroalimentacion';
import { numerarAnotaciones, TextoAnotado } from '@/components/retroalimentacion/texto-anotado';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  actualizarAnotacion,
  crearAnotacion,
  eliminarAnotacion,
} from '@/lib/retroalimentacion/actions';
import {
  aPuntosDeCodigo,
  fragmentoEntre,
  recortarSeleccion,
  seSolapa,
} from '@/lib/retroalimentacion/fragmentos';
import { cn } from '@/lib/utils';
import { LIMITES_RETROALIMENTACION } from '@/schemas/retroalimentacion.schema';
import { type Anotacion, type DetalleSesion, type MensajeConversacion } from '@/types';

interface Seleccion {
  mensajeId: string;
  inicio: number;
  fin: number;
  fragmento: string;
  /** Se cruza con un comentario existente: no se puede comentar. */
  solapada: boolean;
}

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/**
 * Lee la selección del navegador si cae dentro de una sola intervención del estudiante y la
 * convierte en posiciones del mensaje (puntos de código, como las guarda la base de datos).
 */
function leerSeleccion(
  raiz: HTMLElement,
  mensajes: readonly MensajeConversacion[],
  anotaciones: readonly Anotacion[]
): Seleccion | null {
  const seleccion = window.getSelection();
  if (!seleccion || seleccion.isCollapsed || seleccion.rangeCount === 0) return null;
  const rango = seleccion.getRangeAt(0);

  const textoDe = (nodo: Node) =>
    (nodo instanceof Element ? nodo : nodo.parentElement)?.closest<HTMLElement>(
      '[data-texto-mensaje]'
    ) ?? null;
  const elemento = textoDe(rango.startContainer);
  if (!elemento || elemento !== textoDe(rango.endContainer) || !raiz.contains(elemento)) {
    return null;
  }
  const mensaje = mensajes.find(m => m.id === elemento.dataset.textoMensaje);
  if (!mensaje || mensaje.remitente !== 'estudiante') return null;

  const previo = document.createRange();
  previo.selectNodeContents(elemento);
  previo.setEnd(rango.startContainer, rango.startOffset);
  const inicioUtf16 = previo.toString().length;
  const finUtf16 = inicioUtf16 + rango.toString().length;

  const recorte = recortarSeleccion(
    mensaje.contenido,
    aPuntosDeCodigo(mensaje.contenido, inicioUtf16),
    aPuntosDeCodigo(mensaje.contenido, finUtf16)
  );
  if (!recorte) return null;

  return {
    mensajeId: mensaje.id,
    ...recorte,
    fragmento: fragmentoEntre(mensaje.contenido, recorte.inicio, recorte.fin),
    solapada: seSolapa(
      anotaciones.filter(a => a.mensajeId === mensaje.id),
      recorte.inicio,
      recorte.fin
    ),
  };
}

/**
 * HU de retroalimentación — Revisión de una sesión terminada por el docente.
 *
 * A la izquierda, la conversación: el docente selecciona una frase de una intervención del
 * estudiante y la comenta ("aquí hablaste muy duro"). A la derecha, la retroalimentación general
 * con la nota y la lista numerada de comentarios, enlazada con los subrayados.
 */
export function RevisionSesion({ sesion }: { sesion: DetalleSesion }) {
  const router = useRouter();
  const idTitulo = useId();
  const raiz = useRef<HTMLOListElement>(null);
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>(
    sesion.retroalimentacion?.anotaciones ?? []
  );
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [borrador, setBorrador] = useState<Seleccion | null>(null);
  const [activa, setActiva] = useState<string | null>(null);

  const numeros = numerarAnotaciones(sesion.mensajes, anotaciones);
  const ordenadas = [...anotaciones].sort(
    (a, b) => (numeros.get(a.id) ?? 0) - (numeros.get(b.id) ?? 0)
  );
  const nombreEstudiante = sesion.estudiante.nombre.split(' ')[0];

  // La selección del texto (con ratón o teclado) se sigue en vivo; al pulsar "Comentar" se fija.
  useEffect(() => {
    const alCambiar = () => {
      if (!raiz.current) return;
      setSeleccion(leerSeleccion(raiz.current, sesion.mensajes, anotaciones));
    };
    // Una selección hecha antes de hidratar la página también cuenta.
    alCambiar();
    document.addEventListener('selectionchange', alCambiar);
    return () => document.removeEventListener('selectionchange', alCambiar);
  }, [sesion.mensajes, anotaciones]);

  const empezarComentario = () => {
    if (!seleccion || seleccion.solapada) return;
    setBorrador(seleccion);
    window.getSelection()?.removeAllRanges();
  };

  const alCrear = (anotacion: Anotacion) => {
    setAnotaciones(actuales => [...actuales, anotacion]);
    setBorrador(null);
    setActiva(anotacion.id);
    router.refresh();
  };

  const irA = (id: string) => {
    setActiva(id);
    document.getElementById(`marca-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <section aria-labelledby={idTitulo} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={idTitulo} className="text-xl font-semibold tracking-tight">
            Conversación
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Highlighter className="size-4 text-amber-600" aria-hidden />
            Selecciona una frase de {nombreEstudiante} para comentarla.
          </p>
        </div>

        {sesion.mensajes.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            El estudiante no alcanzó a conversar con el paciente.
          </p>
        ) : (
          <ol
            ref={raiz}
            aria-label="Conversación de la sesión"
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:p-5"
          >
            {sesion.mensajes.map(mensaje => {
              const esEstudiante = mensaje.remitente === 'estudiante';
              const propias = anotaciones.filter(a => a.mensajeId === mensaje.id);
              return (
                <li
                  key={mensaje.id}
                  data-remitente={mensaje.remitente}
                  className={cn(
                    'flex max-w-[88%] flex-col gap-1',
                    esEstudiante ? 'items-end self-end' : 'self-start'
                  )}
                >
                  <span className="px-1 text-[11px] font-medium text-muted-foreground">
                    {esEstudiante ? sesion.estudiante.nombre : sesion.npc.nombre} ·{' '}
                    <time dateTime={mensaje.timestamp}>
                      {formatoHora.format(new Date(mensaje.timestamp))}
                    </time>
                  </span>
                  <p
                    data-texto-mensaje={mensaje.id}
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                      esEstudiante
                        ? 'rounded-br-md border border-primary/20 bg-primary/6 selection:bg-amber-300/70'
                        : 'rounded-bl-md bg-muted text-foreground select-none'
                    )}
                  >
                    <TextoAnotado
                      contenido={mensaje.contenido}
                      anotaciones={propias}
                      numeros={numeros}
                      activa={activa}
                    />
                  </p>
                  {borrador?.mensajeId === mensaje.id && (
                    <NuevaAnotacion
                      sesionId={sesion.id}
                      seleccion={borrador}
                      onCreada={alCrear}
                      onCancelar={() => setBorrador(null)}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {/* Barra fija mientras hay texto seleccionado: también sirve con el teclado (Mayús + flechas). */}
        {seleccion && !borrador && (
          <div
            role="status"
            className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur"
          >
            <p className="min-w-0 flex-1 truncate text-sm">
              <span className="text-muted-foreground">Seleccionado: </span>«{seleccion.fragmento}»
            </p>
            {seleccion.solapada ? (
              <p className="text-sm text-destructive">Se cruza con otro comentario.</p>
            ) : (
              <Button
                size="sm"
                // `mousedown` sin acción por defecto: el clic no borra la selección antes de leerla.
                onMouseDown={evento => evento.preventDefault()}
                onClick={empezarComentario}
              >
                <MessageSquarePlus aria-hidden />
                Comentar selección
              </Button>
            )}
          </div>
        )}
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <FormularioRetroalimentacion
          sesionId={sesion.id}
          inicial={sesion.retroalimentacion}
          nombreEstudiante={sesion.estudiante.nombre}
        />
        <section
          aria-labelledby="comentarios-titulo"
          className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs"
        >
          <h2 id="comentarios-titulo" className="text-lg font-semibold tracking-tight">
            Comentarios en el chat
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              {anotaciones.length}
            </span>
          </h2>
          {ordenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no has subrayado ninguna frase. Selecciona texto en las intervenciones del
              estudiante para comentarlo.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {ordenadas.map(anotacion => (
                <ComentarioAnotacion
                  key={anotacion.id}
                  anotacion={anotacion}
                  numero={numeros.get(anotacion.id) ?? 0}
                  activa={activa === anotacion.id}
                  onIr={() => irA(anotacion.id)}
                  onActualizada={comentario =>
                    setAnotaciones(actuales =>
                      actuales.map(a => (a.id === anotacion.id ? { ...a, comentario } : a))
                    )
                  }
                  onEliminada={() => {
                    setAnotaciones(actuales => actuales.filter(a => a.id !== anotacion.id));
                    router.refresh();
                  }}
                />
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}

function NuevaAnotacion({
  sesionId,
  seleccion,
  onCreada,
  onCancelar,
}: {
  sesionId: string;
  seleccion: Seleccion;
  onCreada: (anotacion: Anotacion) => void;
  onCancelar: () => void;
}) {
  const id = useId();
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  const guardar = () =>
    startTransition(async () => {
      const resultado = await crearAnotacion({
        sesionId,
        mensajeId: seleccion.mensajeId,
        inicio: seleccion.inicio,
        fin: seleccion.fin,
        comentario,
      });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      toast.success('Comentario agregado.');
      onCreada(resultado.datos);
    });

  return (
    <div className="mt-1 flex w-full min-w-72 flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left dark:border-amber-500/40 dark:bg-amber-500/10">
      <p className="text-xs text-muted-foreground">
        Sobre: <span className="font-medium text-foreground">«{seleccion.fragmento}»</span>
      </p>
      <label htmlFor={id} className="sr-only">
        Comentario sobre la frase seleccionada
      </label>
      <Textarea
        id={id}
        autoFocus
        value={comentario}
        onChange={evento => setComentario(evento.target.value)}
        onKeyDown={evento => {
          if (evento.key === 'Escape') onCancelar();
          if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) guardar();
        }}
        placeholder="Ej.: Aquí sonaste muy directo; valida primero lo que siente."
        maxLength={LIMITES_RETROALIMENTACION.comentario}
        className="min-h-20 bg-background"
        aria-invalid={error ? true : undefined}
        disabled={guardando}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button size="sm" onClick={guardar} disabled={guardando || !comentario.trim()}>
          {guardando && <Loader2 className="animate-spin" aria-hidden />}
          Guardar comentario
        </Button>
      </div>
    </div>
  );
}

function ComentarioAnotacion({
  anotacion,
  numero,
  activa,
  onIr,
  onActualizada,
  onEliminada,
}: {
  anotacion: Anotacion;
  numero: number;
  activa: boolean;
  onIr: () => void;
  onActualizada: (comentario: string) => void;
  onEliminada: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(anotacion.comentario);
  const [pendiente, startTransition] = useTransition();

  const guardar = () =>
    startTransition(async () => {
      const resultado = await actualizarAnotacion({ id: anotacion.id, comentario: texto });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      onActualizada(texto.trim());
      setEditando(false);
    });

  const eliminar = () =>
    startTransition(async () => {
      const resultado = await eliminarAnotacion({ id: anotacion.id });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      toast.success('Comentario quitado.');
      onEliminada();
    });

  return (
    <li
      id={`anotacion-${anotacion.id}`}
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-3 text-sm transition-colors',
        activa ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10' : 'bg-background'
      )}
    >
      <button
        type="button"
        onClick={onIr}
        className="flex items-start gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-semibold text-amber-900">
          {numero}
        </span>
        <span className="line-clamp-2 text-muted-foreground italic">«{anotacion.fragmento}»</span>
      </button>
      {editando ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`editar-${anotacion.id}`} className="sr-only">
            Editar el comentario {numero}
          </label>
          <Textarea
            id={`editar-${anotacion.id}`}
            value={texto}
            onChange={evento => setTexto(evento.target.value)}
            maxLength={LIMITES_RETROALIMENTACION.comentario}
            className="min-h-16"
            disabled={pendiente}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTexto(anotacion.comentario);
                setEditando(false);
              }}
              disabled={pendiente}
            >
              <X aria-hidden />
              Cancelar
            </Button>
            <Button size="sm" onClick={guardar} disabled={pendiente || !texto.trim()}>
              {pendiente && <Loader2 className="animate-spin" aria-hidden />}
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{anotacion.comentario}</p>
          <div className="flex justify-end gap-1">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setEditando(true)}
              disabled={pendiente}
            >
              <Pencil aria-hidden />
              Editar
            </Button>
            <Button size="xs" variant="ghost" onClick={eliminar} disabled={pendiente}>
              {pendiente ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Trash2 aria-hidden />
              )}
              Quitar
            </Button>
          </div>
        </>
      )}
    </li>
  );
}
