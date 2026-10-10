'use client';

import { Highlighter, Loader2, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  ABRE_ANOTACION,
  abreOtraAnotacion,
  type Ancla,
  anclaDeMarca,
  anclaDeRango,
  irAMarca,
} from '@/components/retroalimentacion/ancla';
import { FormularioRetroalimentacion } from '@/components/retroalimentacion/formulario-retroalimentacion';
import {
  numerarAnotaciones,
  NumeroAnotacion,
  TextoAnotado,
} from '@/components/retroalimentacion/texto-anotado';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
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
  /** Copia del rango seleccionado: resalta la frase mientras se escribe el comentario. */
  rango: Range;
  ancla: Ancla;
}

/** Globo flotante abierto sobre la conversación. */
type Burbuja =
  | { tipo: 'nueva'; seleccion: Seleccion; ancla: Ancla }
  | { tipo: 'existente'; anotacionId: string; editando: boolean; ancla: Ancla };

/** Nombre del resaltado (CSS Custom Highlight API) de la frase que se está comentando. */
const RESALTADO_BORRADOR = 'comentario-borrador';

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

  const copia = rango.cloneRange();
  return {
    mensajeId: mensaje.id,
    ...recorte,
    fragmento: fragmentoEntre(mensaje.contenido, recorte.inicio, recorte.fin),
    solapada: seSolapa(
      anotaciones.filter(a => a.mensajeId === mensaje.id),
      recorte.inicio,
      recorte.fin
    ),
    rango: copia,
    ancla: anclaDeRango(copia, elemento),
  };
}

/**
 * HU de retroalimentación — Revisión de una sesión terminada por el docente.
 *
 * A la izquierda, la conversación: el docente selecciona una frase de una intervención del
 * estudiante y la comenta ("aquí hablaste muy duro") en un globo flotante sobre el chat, sin mover
 * el resto de la página. A la derecha, la retroalimentación general con la nota y la lista
 * numerada de comentarios, enlazada con los subrayados.
 */
export function RevisionSesion({ sesion }: { sesion: DetalleSesion }) {
  const router = useRouter();
  const idTitulo = useId();
  const raiz = useRef<HTMLOListElement>(null);
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>(
    sesion.retroalimentacion?.anotaciones ?? []
  );
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  /** Botón del ratón presionado sobre el chat: la barra espera a que termine de seleccionar. */
  const [arrastrando, setArrastrando] = useState(false);
  const [burbuja, setBurbuja] = useState<Burbuja | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);

  const numeros = numerarAnotaciones(sesion.mensajes, anotaciones);
  const ordenadas = [...anotaciones].sort(
    (a, b) => (numeros.get(a.id) ?? 0) - (numeros.get(b.id) ?? 0)
  );
  const nombreEstudiante = sesion.estudiante.nombre.split(' ')[0];
  const existente =
    burbuja?.tipo === 'existente'
      ? (anotaciones.find(a => a.id === burbuja.anotacionId) ?? null)
      : null;
  const mostrarBarra = seleccion !== null && !arrastrando && burbuja === null;

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

  useEffect(() => {
    const alPresionar = (evento: PointerEvent) => {
      if (raiz.current?.contains(evento.target as Node)) setArrastrando(true);
    };
    const alSoltar = () => setArrastrando(false);
    document.addEventListener('pointerdown', alPresionar);
    document.addEventListener('pointerup', alSoltar);
    document.addEventListener('pointercancel', alSoltar);
    window.addEventListener('blur', alSoltar);
    return () => {
      document.removeEventListener('pointerdown', alPresionar);
      document.removeEventListener('pointerup', alSoltar);
      document.removeEventListener('pointercancel', alSoltar);
      window.removeEventListener('blur', alSoltar);
    };
  }, []);

  // Mientras se escribe el comentario, la frase sigue resaltada aunque ya no esté seleccionada.
  const rangoBorrador = burbuja?.tipo === 'nueva' ? burbuja.seleccion.rango : null;
  useEffect(() => {
    if (!rangoBorrador || typeof CSS === 'undefined' || !('highlights' in CSS)) return;
    CSS.highlights.set(RESALTADO_BORRADOR, new Highlight(rangoBorrador));
    return () => {
      CSS.highlights.delete(RESALTADO_BORRADOR);
    };
  }, [rangoBorrador]);

  const empezarComentario = () => {
    if (!seleccion || seleccion.solapada) return;
    setBurbuja({ tipo: 'nueva', seleccion, ancla: seleccion.ancla });
    window.getSelection()?.removeAllRanges();
  };

  const abrir = (id: string, editando = false) => {
    irAMarca(id);
    setBurbuja({
      tipo: 'existente',
      anotacionId: id,
      editando,
      ancla: anclaDeMarca(id, raiz.current),
    });
  };

  const alCrear = (anotacion: Anotacion) => {
    setAnotaciones(actuales => [...actuales, anotacion]);
    setBurbuja(null);
    router.refresh();
  };

  const quitar = async (id: string) => {
    setQuitando(id);
    const resultado = await eliminarAnotacion({ id });
    setQuitando(null);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Comentario quitado.');
    setAnotaciones(actuales => actuales.filter(a => a.id !== id));
    setBurbuja(actual =>
      actual?.tipo === 'existente' && actual.anotacionId === id ? null : actual
    );
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <section aria-labelledby={idTitulo} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={idTitulo} className="text-xl font-semibold tracking-tight">
            Conversación
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Highlighter className="size-4 shrink-0 text-amber-600" aria-hidden />
            Selecciona una frase de {nombreEstudiante} para comentarla. Pulsa un subrayado para
            verlo o editarlo.
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
                      activa={existente?.id ?? null}
                      onAbrir={id => abrir(id)}
                    />
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        {/* Barra flotante sobre la frase seleccionada (con ratón o con Mayús + flechas). Sin
            portal: queda justo después del chat en el orden de tabulación. */}
        <Popover open={mostrarBarra}>
          {seleccion && <PopoverAnchor virtualRef={{ current: seleccion.ancla }} />}
          <PopoverContent
            portal={false}
            side="top"
            sideOffset={8}
            hideWhenDetached
            onOpenAutoFocus={evento => evento.preventDefault()}
            onCloseAutoFocus={evento => evento.preventDefault()}
            onEscapeKeyDown={() => window.getSelection()?.removeAllRanges()}
            aria-label="Acciones sobre la selección"
            className="w-auto rounded-full p-1"
          >
            {seleccion?.solapada ? (
              <p className="px-3 py-1 text-xs font-medium text-destructive">
                Se cruza con otro comentario
              </p>
            ) : (
              <Button
                size="sm"
                className="rounded-full"
                // `mousedown` sin acción por defecto: el clic no borra la selección antes de leerla.
                onMouseDown={evento => evento.preventDefault()}
                onClick={empezarComentario}
              >
                <MessageSquarePlus aria-hidden />
                Comentar selección
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Globo del comentario: uno nuevo, o el de un subrayado (verlo, editarlo o quitarlo). */}
        <Popover open={burbuja !== null} onOpenChange={abierto => !abierto && setBurbuja(null)}>
          {burbuja && <PopoverAnchor virtualRef={{ current: burbuja.ancla }} />}
          {burbuja?.tipo === 'nueva' && (
            <NuevaAnotacion
              sesionId={sesion.id}
              seleccion={burbuja.seleccion}
              onCreada={alCrear}
              onCancelar={() => setBurbuja(null)}
            />
          )}
          {burbuja?.tipo === 'existente' && existente && (
            <DetalleAnotacion
              key={existente.id}
              anotacion={existente}
              numero={numeros.get(existente.id) ?? 0}
              editando={burbuja.editando}
              quitando={quitando === existente.id}
              onEditar={editando => setBurbuja({ ...burbuja, editando })}
              onActualizada={comentario =>
                setAnotaciones(actuales =>
                  actuales.map(a => (a.id === existente.id ? { ...a, comentario } : a))
                )
              }
              onQuitar={() => quitar(existente.id)}
            />
          )}
        </Popover>
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
                <ComentarioEnLista
                  key={anotacion.id}
                  anotacion={anotacion}
                  numero={numeros.get(anotacion.id) ?? 0}
                  activa={existente?.id === anotacion.id}
                  quitando={quitando === anotacion.id}
                  onIr={() => abrir(anotacion.id)}
                  onEditar={() => abrir(anotacion.id, true)}
                  onQuitar={() => quitar(anotacion.id)}
                />
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}

/** Globo para escribir el comentario de la frase recién seleccionada. */
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

  const guardar = () => {
    if (!comentario.trim()) return;
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
  };

  return (
    <PopoverContent
      portal={false}
      side="bottom"
      align="end"
      hideWhenDetached
      aria-label="Nuevo comentario"
      // Un clic fuera no descarta lo que ya se escribió.
      onInteractOutside={evento => {
        if (comentario.trim() || abreOtraAnotacion(evento.target)) evento.preventDefault();
      }}
      className="flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2.5"
    >
      <p className="line-clamp-2 border-l-2 border-amber-400 pl-2 text-xs text-muted-foreground italic">
        «{seleccion.fragmento}»
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
          if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) guardar();
        }}
        placeholder="Ej.: Aquí sonaste muy directo; valida primero lo que siente."
        maxLength={LIMITES_RETROALIMENTACION.comentario}
        className="min-h-24 resize-none"
        aria-invalid={error ? true : undefined}
        disabled={guardando}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="mr-auto hidden text-[11px] text-muted-foreground sm:inline">
          Ctrl + Enter para guardar
        </span>
        <Button size="sm" variant="ghost" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button size="sm" onClick={guardar} disabled={guardando || !comentario.trim()}>
          {guardando && <Loader2 className="animate-spin" aria-hidden />}
          Guardar comentario
        </Button>
      </div>
    </PopoverContent>
  );
}

/** Globo de un subrayado ya comentado: muestra el comentario y permite editarlo o quitarlo. */
function DetalleAnotacion({
  anotacion,
  numero,
  editando,
  quitando,
  onEditar,
  onActualizada,
  onQuitar,
}: {
  anotacion: Anotacion;
  numero: number;
  editando: boolean;
  quitando: boolean;
  onEditar: (editando: boolean) => void;
  onActualizada: (comentario: string) => void;
  onQuitar: () => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState(anotacion.comentario);
  const [guardando, startTransition] = useTransition();
  const cambiado = editando && texto.trim() !== anotacion.comentario;

  const guardar = () => {
    if (!texto.trim()) return;
    startTransition(async () => {
      const resultado = await actualizarAnotacion({ id: anotacion.id, comentario: texto });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      onActualizada(texto.trim());
      onEditar(false);
      toast.success('Comentario actualizado.');
    });
  };

  const cancelar = () => {
    setTexto(anotacion.comentario);
    onEditar(false);
  };

  return (
    <PopoverContent
      portal={false}
      side="bottom"
      align="center"
      hideWhenDetached
      aria-label={`Comentario ${numero}`}
      onInteractOutside={evento => {
        if (cambiado || abreOtraAnotacion(evento.target)) evento.preventDefault();
      }}
      className="flex w-80 flex-col gap-2.5"
    >
      <div className="flex items-start gap-2">
        <NumeroAnotacion numero={numero} />
        <p className="line-clamp-2 text-xs text-muted-foreground italic">«{anotacion.fragmento}»</p>
      </div>
      {editando ? (
        <>
          <label htmlFor={id} className="sr-only">
            Editar el comentario {numero}
          </label>
          <Textarea
            id={id}
            autoFocus
            value={texto}
            onChange={evento => setTexto(evento.target.value)}
            onKeyDown={evento => {
              if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) guardar();
            }}
            maxLength={LIMITES_RETROALIMENTACION.comentario}
            className="min-h-24 resize-none"
            disabled={guardando}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={cancelar} disabled={guardando}>
              Cancelar
            </Button>
            <Button size="sm" onClick={guardar} disabled={guardando || !texto.trim()}>
              {guardando && <Loader2 className="animate-spin" aria-hidden />}
              Guardar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{anotacion.comentario}</p>
          <div className="flex justify-end gap-1 border-t pt-2">
            <Button size="xs" variant="ghost" onClick={() => onEditar(true)} disabled={quitando}>
              <Pencil aria-hidden />
              Editar
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={onQuitar}
              disabled={quitando}
              className="text-destructive hover:text-destructive"
            >
              {quitando ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
              Quitar
            </Button>
          </div>
        </>
      )}
    </PopoverContent>
  );
}

/** Comentario en la lista lateral: al pulsarlo, lleva a su subrayado y abre su globo. */
function ComentarioEnLista({
  anotacion,
  numero,
  activa,
  quitando,
  onIr,
  onEditar,
  onQuitar,
}: {
  anotacion: Anotacion;
  numero: number;
  activa: boolean;
  quitando: boolean;
  onIr: () => void;
  onEditar: () => void;
  onQuitar: () => void;
}) {
  return (
    <li
      id={`anotacion-${anotacion.id}`}
      className={cn(
        'group relative rounded-xl border text-sm transition-colors',
        activa
          ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10'
          : 'bg-background hover:border-amber-300'
      )}
    >
      <button
        type="button"
        {...ABRE_ANOTACION}
        onClick={onIr}
        className="flex w-full flex-col gap-1.5 rounded-xl p-3 pr-16 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex items-start gap-2">
          <NumeroAnotacion numero={numero} />
          <span className="line-clamp-2 text-muted-foreground italic">«{anotacion.fragmento}»</span>
        </span>
        <span className="line-clamp-3 pl-7 whitespace-pre-wrap">{anotacion.comentario}</span>
      </button>
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        <Button
          size="icon-xs"
          variant="ghost"
          {...ABRE_ANOTACION}
          onClick={onEditar}
          disabled={quitando}
          aria-label={`Editar el comentario ${numero}`}
        >
          <Pencil aria-hidden />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onQuitar}
          disabled={quitando}
          aria-label={`Quitar el comentario ${numero}`}
          className="text-destructive hover:text-destructive"
        >
          {quitando ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
        </Button>
      </div>
    </li>
  );
}
