'use client';

import {
  Compass,
  Highlighter,
  Loader2,
  MessageSquareOff,
  MessageSquarePlus,
  Pencil,
  Quote,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { AyudaContextual } from '@/components/comun/ayuda-contextual';
import { EstadoVacio } from '@/components/comun/estado-vacio';

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
  ID_RECORRIDO_REVISION,
  RecorridoRevisionPractica,
} from '@/components/retroalimentacion/recorrido-revision';
import { SelectorFragmento } from '@/components/retroalimentacion/selector-fragmento';
import { IntentoReformulado } from '@/components/sesiones/intento-reformulado';
import {
  numerarAnotaciones,
  NumeroAnotacion,
  TextoAnotado,
} from '@/components/retroalimentacion/texto-anotado';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useRespaldoRevision } from '@/hooks/use-respaldo-revision';
import { dispararRecorrido } from '@/lib/ayuda/recorridos';
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
import {
  ETIQUETA_CIERRE,
  ETIQUETA_FIN_POR_TIEMPO,
  type IaDeSesion,
} from '@/lib/conversacion/cierre';
import { intercalarIntentos } from '@/lib/conversacion/intentos';
import { cn } from '@/lib/utils';
import {
  borradoresAnotacionSchema,
  LIMITES_RETROALIMENTACION,
  type BorradorAnotacion,
} from '@/schemas/retroalimentacion.schema';
import { type Anotacion, type DetalleSesion, type MensajeConversacion } from '@/types';
import { MENSAJE_SIN_CONEXION, sinPerderElPanel } from '@/components/comun/sin-perder-el-panel';

interface Seleccion {
  mensajeId: string;
  inicio: number;
  fin: number;
  fragmento: string;
  /** Se cruza con un comentario existente: no se puede comentar. */
  solapada: boolean;
  /** Copia del rango seleccionado: resalta la frase mientras se escribe el comentario. */
  rango: Range | null;
  ancla: Ancla;
}

/** Globo flotante abierto sobre la conversación. */
type Burbuja =
  | {
      tipo: 'nueva';
      borrador: BorradorAnotacion;
      fragmento: string;
      rango: Range | null;
      ancla: Ancla;
      focoRetorno?: HTMLButtonElement;
    }
  | { tipo: 'existente'; anotacionId: string; editando: boolean; ancla: Ancla };

/** Nombre del resaltado (CSS Custom Highlight API) de la frase que se está comentando. */
const RESALTADO_BORRADOR = 'comentario-borrador';

/**
 * Estilo del resaltado. Va aquí y no en `globals.css` porque Lightning CSS (el parser de
 * Turbopack) aún no reconoce el pseudo-elemento `::highlight()` y avisa en cada compilación.
 */
const ESTILO_RESALTADO = `::highlight(${RESALTADO_BORRADOR}) { background-color: oklch(87.9% 0.169 91.605 / 0.7); }`;

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

const formatoSeveridad = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

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
export function RevisionSesion({
  sesion,
  cuentaId,
  ia = null,
  siguiente = null,
}: {
  sesion: DetalleSesion;
  cuentaId: string;
  /** Severidad del paciente en cada respuesta y cierre automático, si el motor los registró. */
  ia?: IaDeSesion | null;
  /** Próxima práctica por revisar (para «Publicar y abrir la siguiente»), o `null` si es la última. */
  siguiente?: { id: string; nombre: string } | null;
}) {
  const router = useRouter();
  const idTitulo = useId();
  const raiz = useRef<HTMLOListElement>(null);
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>(
    sesion.retroalimentacion?.anotaciones ?? []
  );
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [eligiendoFrase, setEligiendoFrase] = useState<string | null>(null);
  /** Botón del ratón presionado sobre el chat: la barra espera a que termine de seleccionar. */
  const [arrastrando, setArrastrando] = useState(false);
  const [burbuja, setBurbuja] = useState<Burbuja | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);
  const respaldo = useRespaldoRevision(
    `psysim:borrador-retro:${cuentaId}:${sesion.id}:anotaciones`,
    borradoresAnotacionSchema
  );
  const borradores = respaldo.borrador ?? [];
  const idAbierto = burbuja?.tipo === 'nueva' ? burbuja.borrador.id : burbuja?.anotacionId;
  const pendientes = borradores.filter(borrador => {
    if (borrador.id === idAbierto || !borrador.comentario.trim()) return false;
    const registrada = anotaciones.find(a => a.id === borrador.id);
    return registrada?.comentario !== borrador.comentario.trim();
  });

  function respaldarAnotacion(borrador: BorradorAnotacion) {
    respaldo.actualizar(actuales => [
      ...(actuales ?? []).filter(actual => actual.id !== borrador.id),
      borrador,
    ]);
  }

  function descartarAnotacion(id: string) {
    respaldo.actualizar(actuales => {
      const restantes = actuales?.filter(actual => actual.id !== id);
      return restantes?.length ? restantes : null;
    });
  }

  const numeros = numerarAnotaciones(sesion.mensajes, anotaciones);
  const ordenadas = [...anotaciones].sort(
    (a, b) => (numeros.get(a.id) ?? 0) - (numeros.get(b.id) ?? 0)
  );
  const nombreEstudiante = sesion.estudiante.nombre.split(' ')[0];
  const existente =
    burbuja?.tipo === 'existente'
      ? (anotaciones.find(a => a.id === burbuja.anotacionId) ?? null)
      : null;
  const mostrarBarra = seleccion !== null && !arrastrando && burbuja === null && !eligiendoFrase;

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
  const rangoBorrador = burbuja?.tipo === 'nueva' ? burbuja.rango : null;
  useEffect(() => {
    if (!rangoBorrador || typeof CSS === 'undefined' || !('highlights' in CSS)) return;
    CSS.highlights.set(RESALTADO_BORRADOR, new Highlight(rangoBorrador));
    return () => {
      CSS.highlights.delete(RESALTADO_BORRADOR);
    };
  }, [rangoBorrador]);

  const empezarComentario = (seleccion: Seleccion | null, focoRetorno?: HTMLButtonElement) => {
    if (!seleccion || seleccion.solapada) return;
    const { mensajeId, inicio, fin, fragmento, rango, ancla } = seleccion;
    const anterior = borradores.find(
      b => b.tipo === 'nueva' && b.mensajeId === mensajeId && b.inicio === inicio && b.fin === fin
    );
    const borrador = anterior ?? {
      tipo: 'nueva',
      id: crypto.randomUUID(),
      mensajeId,
      inicio,
      fin,
      comentario: '',
    };
    setBurbuja({ tipo: 'nueva', borrador, fragmento, rango, ancla, focoRetorno });
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

  function recuperarAnotacion(borrador: BorradorAnotacion) {
    if (anotaciones.some(a => a.id === borrador.id)) {
      abrir(borrador.id, true);
      return;
    }
    const mensaje = sesion.mensajes.find(m => m.id === borrador.mensajeId);
    const elemento = raiz.current?.querySelector<HTMLElement>(
      `[data-texto-mensaje="${borrador.mensajeId}"]`
    );
    if (!mensaje || !elemento) return;
    elemento.scrollIntoView({ block: 'nearest' });
    setBurbuja({
      tipo: 'nueva',
      borrador,
      fragmento: fragmentoEntre(mensaje.contenido, borrador.inicio, borrador.fin),
      rango: null,
      ancla: {
        getBoundingClientRect: () => elemento.getBoundingClientRect(),
        contextElement: elemento,
      },
    });
  }

  const alCrear = (anotacion: Anotacion, borrador: BorradorAnotacion) => {
    setAnotaciones(actuales => [...actuales.filter(a => a.id !== anotacion.id), anotacion]);
    const cambiarBurbuja = (siguiente: Burbuja | null) =>
      setBurbuja(actual =>
        actual?.tipo === 'nueva' && actual.borrador.id === borrador.id ? siguiente : actual
      );
    if (anotacion.comentario === borrador.comentario.trim()) {
      descartarAnotacion(borrador.id);
      cambiarBurbuja(null);
      toast.success('Comentario agregado.');
    } else {
      respaldarAnotacion({ ...borrador, tipo: 'edicion' });
      cambiarBurbuja({
        tipo: 'existente',
        anotacionId: anotacion.id,
        editando: true,
        ancla: anclaDeMarca(anotacion.id, raiz.current),
      });
      toast.info('Recuperaste el comentario guardado. Confirma si quieres actualizarlo.');
    }
    router.refresh();
  };

  // Sin confirmación previa (el botón está al lado de «Editar» y se usa seguido): el aviso ofrece
  // deshacer, que vuelve a crear el comentario con el mismo fragmento y texto.
  const restaurar = async (anotacion: Anotacion) => {
    try {
      const resultado = await crearAnotacion({
        id: crypto.randomUUID(),
        sesionId: sesion.id,
        mensajeId: anotacion.mensajeId,
        inicio: anotacion.inicio,
        fin: anotacion.fin,
        comentario: anotacion.comentario,
      });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      setAnotaciones(actuales => [...actuales, resultado.datos]);
      router.refresh();
    } catch {
      toast.error(MENSAJE_SIN_CONEXION);
    }
  };

  const quitar = async (id: string) => {
    const anotacion = anotaciones.find(a => a.id === id);
    setQuitando(id);
    try {
      const resultado = await eliminarAnotacion({ id });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      toast.success('Comentario quitado.', {
        action: anotacion
          ? { label: 'Deshacer', onClick: () => void restaurar(anotacion) }
          : undefined,
      });
      setAnotaciones(actuales => actuales.filter(a => a.id !== id));
      descartarAnotacion(id);
      setBurbuja(actual =>
        actual?.tipo === 'existente' && actual.anotacionId === id ? null : actual
      );
      router.refresh();
    } catch {
      toast.error(MENSAJE_SIN_CONEXION);
    } finally {
      setQuitando(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <RecorridoRevisionPractica tieneMensajes={sesion.mensajes.length > 0} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <style href={RESALTADO_BORRADOR} precedence="default">
          {ESTILO_RESALTADO}
        </style>
        <section aria-labelledby={idTitulo} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={idTitulo} className="text-xl font-bold tracking-[-0.015em]">
                Conversación
              </h2>
              {sesion.mensajes.length > 0 && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                  {sesion.mensajes.length}
                </span>
              )}
              {ia && Object.keys(ia.severidades).length > 0 && (
                <span
                  data-tour="revision-severidad"
                  className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  Severidad 0–5
                  <AyudaContextual
                    etiqueta="Qué indica la severidad del paciente"
                    texto={`Junto a cada respuesta de ${sesion.npc.nombre.split(' ')[0]} aparece qué tan alterado estaba en ese momento, de 0 (en calma) a 5 (desbordado). La calcula el motor del paciente y no califica a ${nombreEstudiante}.`}
                  />
                </span>
              )}
            </div>

            {sesion.mensajes.length > 0 && (
              <button
                type="button"
                onClick={() => dispararRecorrido(ID_RECORRIDO_REVISION, 0)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
              >
                <Compass className="size-3.5 shrink-0" aria-hidden />
                ¿Cómo anotar frases?
              </button>
            )}
          </div>

          {sesion.mensajes.length === 0 && sesion.intentos.length === 0 ? (
            <EstadoVacio
              icono={MessageSquareOff}
              titulo={`${nombreEstudiante} no alcanzó a conversar con el paciente`}
              descripcion="La práctica se cerró antes de enviar mensajes, por eso no hay transcripción disponible para anotar."
            />
          ) : (
            <ol
              ref={raiz}
              data-tour="revision-conversacion"
              aria-label="Conversación de la práctica"
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5"
            >
              {intercalarIntentos(sesion.mensajes, sesion.intentos).map(elemento => {
                if (elemento.tipo === 'intento') {
                  return (
                    <IntentoReformulado
                      key={`intento-${elemento.intento.posicion}`}
                      intento={elemento.intento}
                      estudiante={nombreEstudiante ?? sesion.estudiante.nombre}
                      paciente={sesion.npc.nombre}
                    />
                  );
                }
                const { mensaje } = elemento;
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
                    <span className="flex flex-wrap items-center gap-x-1.5 px-1 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          'font-semibold',
                          esEstudiante ? 'text-salvia-oscuro' : 'text-terracota'
                        )}
                      >
                        {esEstudiante ? sesion.estudiante.nombre : sesion.npc.nombre}
                      </span>
                      <span aria-hidden>·</span>
                      <time dateTime={mensaje.timestamp} className="tabular-nums">
                        {formatoHora.format(new Date(mensaje.timestamp))}
                      </time>
                      {esEstudiante && propias.length > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="font-medium text-ambar tabular-nums">
                            {propias.length === 1
                              ? '1 comentario'
                              : `${propias.length} comentarios`}
                          </span>
                        </>
                      )}
                      {ia?.severidades[mensaje.id] !== undefined && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">
                            severidad {formatoSeveridad.format(ia.severidades[mensaje.id]!)}
                          </span>
                        </>
                      )}
                    </span>
                    <p
                      data-texto-mensaje={mensaje.id}
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                        esEstudiante
                          ? 'rounded-br-md bg-salvia-suave selection:bg-ambar/30'
                          : 'rounded-bl-md border bg-background text-foreground select-none'
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
                    {esEstudiante && (
                      <SelectorFragmento
                        texto={mensaje.contenido}
                        anotaciones={propias}
                        abierto={eligiendoFrase === mensaje.id}
                        onAbrir={() => {
                          setBurbuja(null);
                          setEligiendoFrase(mensaje.id);
                        }}
                        onCerrar={() => setEligiendoFrase(null)}
                        onElegir={(inicio, fin, origen) => {
                          setEligiendoFrase(null);
                          empezarComentario(
                            {
                              mensajeId: mensaje.id,
                              inicio,
                              fin,
                              fragmento: fragmentoEntre(mensaje.contenido, inicio, fin),
                              rango: null,
                              solapada: false,
                              ancla: {
                                getBoundingClientRect: () => origen.getBoundingClientRect(),
                                contextElement: origen,
                              },
                            },
                            origen
                          );
                        }}
                      />
                    )}
                  </li>
                );
              })}
              {ia?.cierre && (
                <li
                  data-testid="cierre-automatico"
                  className="mt-1 rounded-xl border border-dashed border-input/60 bg-muted/40 px-4 py-3 text-sm"
                >
                  <span className="font-semibold">{ETIQUETA_CIERRE[ia.cierre]}.</span>{' '}
                  <span className="text-muted-foreground">
                    La conversación terminó aquí y {nombreEstudiante} no pudo escribir más.
                  </span>
                </li>
              )}
              {/* El fin previsto de la consulta: un dato neutro, no un error ni una falta. */}
              {!ia?.cierre && ia?.finPorTiempo && (
                <li
                  data-testid="fin-por-tiempo"
                  className="mt-1 rounded-xl border border-dashed border-input/60 bg-muted/40 px-4 py-3 text-sm"
                >
                  <span className="font-semibold">{ETIQUETA_FIN_POR_TIEMPO}.</span>{' '}
                  <span className="text-muted-foreground">
                    Pasado el margen para cerrar la entrevista, la práctica terminó sola.
                  </span>
                </li>
              )}
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
                  Se cruza con otro comentario. Selecciona otra parte de la frase.
                </p>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full"
                  // `mousedown` sin acción por defecto: el clic no borra la selección antes de leerla.
                  onMouseDown={evento => evento.preventDefault()}
                  onClick={() => empezarComentario(seleccion)}
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
                key={burbuja.borrador.id}
                sesionId={sesion.id}
                inicial={burbuja.borrador}
                fragmento={burbuja.fragmento}
                focoRetorno={burbuja.focoRetorno}
                onCreada={alCrear}
                onEditar={respaldarAnotacion}
                onCancelar={() => {
                  descartarAnotacion(burbuja.borrador.id);
                  setBurbuja(null);
                }}
              />
            )}
            {burbuja?.tipo === 'existente' && existente && (
              <DetalleAnotacion
                key={existente.id}
                anotacion={existente}
                borrador={borradores.find(b => b.id === existente.id)?.comentario}
                numero={numeros.get(existente.id) ?? 0}
                editando={burbuja.editando}
                quitando={quitando === existente.id}
                onEditar={editando => setBurbuja({ ...burbuja, editando })}
                onRespaldar={comentario =>
                  respaldarAnotacion({
                    id: existente.id,
                    tipo: 'edicion',
                    mensajeId: existente.mensajeId,
                    inicio: existente.inicio,
                    fin: existente.fin,
                    comentario,
                  })
                }
                onDescartar={() => descartarAnotacion(existente.id)}
                onActualizada={comentario => {
                  descartarAnotacion(existente.id);
                  setAnotaciones(actuales =>
                    actuales.map(a => (a.id === existente.id ? { ...a, comentario } : a))
                  );
                  router.refresh();
                }}
                onQuitar={() => quitar(existente.id)}
              />
            )}
          </Popover>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <FormularioRetroalimentacion
            sesionId={sesion.id}
            cuentaId={cuentaId}
            inicial={sesion.retroalimentacion}
            nombreEstudiante={sesion.estudiante.nombre}
            comentarios={anotaciones.length}
            siguiente={siguiente}
          />
          <section
            data-tour="revision-comentarios"
            aria-labelledby="comentarios-titulo"
            className="flex flex-col gap-3 rounded-xl border bg-card p-5"
          >
            <h2 id="comentarios-titulo" className="text-lg font-bold tracking-[-0.01em]">
              Comentarios en la conversación
              <span className="ml-2 text-sm font-semibold text-muted-foreground tabular-nums">
                {anotaciones.length}
              </span>
            </h2>
            {pendientes.length > 0 && (
              <ul aria-label="Comentarios sin guardar" className="flex flex-col gap-2">
                {pendientes.map(borrador => {
                  const mensaje = sesion.mensajes.find(m => m.id === borrador.mensajeId);
                  return (
                    <li
                      key={borrador.id}
                      className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm"
                    >
                      <p className="font-medium">Comentario pendiente</p>
                      {mensaje && (
                        <p className="line-clamp-2 text-muted-foreground">
                          {fragmentoEntre(mensaje.contenido, borrador.inicio, borrador.fin)}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!mensaje}
                          onClick={() => recuperarAnotacion(borrador)}
                        >
                          Recuperar comentario
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => descartarAnotacion(borrador.id)}
                        >
                          Descartar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {ordenadas.length === 0 ? (
              <div className="overflow-hidden rounded-xl border border-dashed border-border/80">
                <EstadoVacio
                  variante="compacto"
                  sinBordeSuperior
                  icono={Highlighter}
                  tono="ambar"
                  titulo="Sin frases comentadas aún"
                  descripcion={`Selecciona texto en las intervenciones de ${nombreEstudiante} para subrayar y dejar un comentario puntual.`}
                  accion={
                    sesion.mensajes.length > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => dispararRecorrido(ID_RECORRIDO_REVISION, 0)}
                      >
                        <Compass aria-hidden />
                        Ver cómo anotar frases
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <ol className="flex flex-col gap-2 lg:max-h-[42vh] lg:overflow-y-auto lg:pr-1">
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
    </div>
  );
}

/** Globo para escribir el comentario de la frase recién seleccionada. */
function NuevaAnotacion({
  sesionId,
  inicial,
  fragmento,
  focoRetorno,
  onCreada,
  onEditar,
  onCancelar,
}: {
  sesionId: string;
  inicial: BorradorAnotacion;
  fragmento: string;
  focoRetorno?: HTMLButtonElement;
  onCreada: (anotacion: Anotacion, borrador: BorradorAnotacion) => void;
  onEditar: (borrador: BorradorAnotacion) => void;
  onCancelar: () => void;
}) {
  const id = useId();
  const [comentario, setComentario] = useState(inicial.comentario);
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  const guardar = () => {
    if (guardando || !comentario.trim()) return;
    setError(null);
    const borrador = { ...inicial, comentario };
    onEditar(borrador);
    startTransition(
      sinPerderElPanel(async () => {
        const resultado = await crearAnotacion({ ...borrador, sesionId });
        if (!resultado.ok) {
          setError(resultado.error);
          return;
        }
        onCreada(resultado.datos, borrador);
      })
    );
  };

  return (
    <PopoverContent
      portal={false}
      side="bottom"
      align="end"
      hideWhenDetached
      aria-label="Nuevo comentario"
      onCloseAutoFocus={evento => {
        if (focoRetorno && document.activeElement === document.body) {
          evento.preventDefault();
          focoRetorno.focus();
        }
      }}
      // Un clic fuera no descarta lo que ya se escribió.
      onInteractOutside={evento => {
        if (comentario.trim() || abreOtraAnotacion(evento.target)) evento.preventDefault();
      }}
      className="flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2.5"
    >
      <p className="flex items-start gap-2 rounded-lg bg-ambar-suave/60 px-2.5 py-2 text-xs leading-snug text-foreground">
        <Quote className="mt-0.5 size-3.5 shrink-0 text-ambar" aria-hidden />
        <span className="line-clamp-2">{fragmento}</span>
      </p>
      <label htmlFor={id} className="sr-only">
        Comentario sobre la frase seleccionada
      </label>
      <Textarea
        id={id}
        autoFocus
        value={comentario}
        onChange={evento => {
          const texto = evento.target.value;
          setComentario(texto);
          onEditar({ ...inicial, comentario: texto });
        }}
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
        <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">
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
  borrador,
  numero,
  editando,
  quitando,
  onEditar,
  onRespaldar,
  onDescartar,
  onActualizada,
  onQuitar,
}: {
  anotacion: Anotacion;
  borrador?: string;
  numero: number;
  editando: boolean;
  quitando: boolean;
  onEditar: (editando: boolean) => void;
  onRespaldar: (comentario: string) => void;
  onDescartar: () => void;
  onActualizada: (comentario: string) => void;
  onQuitar: () => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState(borrador ?? anotacion.comentario);
  const [guardando, startTransition] = useTransition();
  const cambiado = editando && texto.trim() !== anotacion.comentario;

  const guardar = () => {
    if (guardando || !texto.trim()) return;
    startTransition(
      sinPerderElPanel(async () => {
        const resultado = await actualizarAnotacion({ id: anotacion.id, comentario: texto });
        if (!resultado.ok) {
          toast.error(resultado.error);
          return;
        }
        onActualizada(texto.trim());
        onEditar(false);
        toast.success('Comentario actualizado.');
      })
    );
  };

  const cancelar = () => {
    setTexto(anotacion.comentario);
    onDescartar();
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
        <p className="line-clamp-2 rounded-md bg-ambar-suave/60 px-2 py-0.5 text-xs leading-snug text-foreground">
          {anotacion.fragmento}
        </p>
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
            onChange={evento => {
              const valor = evento.target.value;
              setTexto(valor);
              onRespaldar(valor);
            }}
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
        activa ? 'border-ambar bg-ambar-suave' : 'bg-background hover:border-ambar/50'
      )}
    >
      <button
        type="button"
        {...ABRE_ANOTACION}
        onClick={onIr}
        className="flex w-full flex-col gap-1.5 rounded-xl p-3 pr-16 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        <span className="flex items-start gap-2">
          <NumeroAnotacion numero={numero} />
          <span
            className={cn(
              'line-clamp-2 rounded-md px-2 py-0.5 text-xs leading-snug text-foreground',
              activa ? 'bg-card/85' : 'bg-ambar-suave/60'
            )}
          >
            {anotacion.fragmento}
          </span>
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
