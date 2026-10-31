'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  RotateCw,
  SendHorizontal,
  Square,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { BotonDictado } from '@/components/simulacion/dictado';
import {
  registrarActividadConversacion,
  registrarTecleo,
} from '@/components/simulacion/senales-conversacion';
import { useTextoProgresivo } from '@/components/simulacion/use-texto-progresivo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { emocionActual } from '@/lib/conversacion/emociones';
import { type EstadoNpc } from '@/lib/conversacion/estados-npc';
import { enviarMensaje, MENSAJE_NO_DISPONIBLE } from '@/lib/conversacion/enviar-mensaje';
import { sePuedeReformular } from '@/lib/conversacion/intentos';
import { reformularDesde } from '@/lib/conversacion/reformular';
import { fraseRelleno, RETRASO_RELLENO_MS } from '@/lib/conversacion/relleno';
import { cn } from '@/lib/utils';
import { LIMITES_CHAT } from '@/schemas/npc-chat.schema';
import { useAppStore, useAppStoreApi } from '@/store/app-store-provider';
import { type MensajeConversacion } from '@/types';

/** Texto breve del estado del paciente en la cabecera del panel. */
const ETIQUETA_ESTADO: Partial<Record<EstadoNpc, string>> = {
  esperando_input: 'Escuchando',
  procesando: 'Pensando…',
  respondiendo: 'Respondiendo',
  error_comunicacion: 'Sin conexión',
};

const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

const AVISO_IA = 'Paciente simulado con IA (Google Gemini). Puede equivocarse o salirse del caso.';

/** Aviso en línea al pie del panel: confirmaciones que no deben tapar la escena con un modal. */
type AvisoPanel =
  { tipo: 'reformular'; mensaje: MensajeConversacion } | { tipo: 'dictado'; aceptar: () => void };

interface ConversationPanelProps {
  onFinalizar: () => void;
  finalizando: boolean;
}

/** `true` cuando el paciente lleva un rato pensando: es el momento de su relleno («mmm…»). */
function useRelleno(estado: EstadoNpc): boolean {
  const [rellenando, setRellenando] = useState(false);
  useEffect(() => {
    if (estado !== 'procesando') return;
    const temporizador = setTimeout(() => setRellenando(true), RETRASO_RELLENO_MS);
    return () => {
      clearTimeout(temporizador);
      setRellenando(false);
    };
  }, [estado]);
  return rellenando;
}

/**
 * HU-13 — Panel de conversación superpuesto sobre el canvas 3D (parte inferior de la pantalla).
 *
 * El contenedor externo es `pointer-events: none` y solo el panel recibe eventos, para no
 * bloquear el canvas que queda alrededor. Además de conversar, deja volver a una intervención
 * para ensayar otra respuesta y dictar con la voz.
 */
export function ConversationPanel({ onFinalizar, finalizando }: ConversationPanelProps) {
  const store = useAppStoreApi();
  const nombre = useAppStore(state => state.sesion.activa?.npc.nombre ?? 'Paciente');
  const mensajes = useAppStore(state => state.conversacion.mensajes);
  const estado = useAppStore(state => state.npc.estado);
  const error = useAppStore(state => state.conversacion.error);

  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<AvisoPanel | null>(null);
  const [reformulando, setReformulando] = useState(false);
  const [errorAviso, setErrorAviso] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState('');
  const campo = useRef<HTMLTextAreaElement>(null);
  const final = useRef<HTMLDivElement>(null);
  const rellenando = useRelleno(estado);
  const nombreCorto = nombre.split(' ')[0];

  const ultimo = mensajes.at(-1);
  const escribiendoId = estado === 'respondiendo' && ultimo?.remitente === 'npc' ? ultimo.id : null;
  const bloqueado = estado !== 'esperando_input' || reformulando;
  const idUltimaPropia = mensajes.findLast(m => m.remitente === 'estudiante')?.id;

  // El campo recupera el foco cada vez que el paciente termina de responder.
  useEffect(() => {
    if (estado === 'esperando_input') campo.current?.focus();
  }, [estado]);

  // Tras reformular, el foco vuelve al campo (ya habilitado) con el cursor al final del texto.
  // Va en un efecto: antes del render el campo sigue deshabilitado y el aviso, montado.
  const [pedirFoco, setPedirFoco] = useState(0);
  useEffect(() => {
    const elemento = campo.current;
    if (!pedirFoco || !elemento) return;
    elemento.focus();
    elemento.setSelectionRange(elemento.value.length, elemento.value.length);
  }, [pedirFoco]);

  // Llaves obligatorias: en Chrome reciente `scrollIntoView` devuelve una Promise, y un efecto
  // que devuelve algo distinto de una función de limpieza hace fallar a React.
  const desplazarAlFinal = () => {
    final.current?.scrollIntoView({ block: 'end' });
  };
  useLayoutEffect(() => {
    desplazarAlFinal();
  }, [mensajes.length, estado, rellenando]);

  const enviar = () => {
    if (bloqueado || !texto.trim()) return;
    registrarActividadConversacion();
    void enviarMensaje(store, texto);
    // El mensaje queda en el historial en cuanto se acepta el envío: se limpia el campo.
    if (store.getState().npc.estado === 'procesando') {
      setTexto('');
      setAnuncio('');
    }
  };

  const confirmarReformular = async (mensaje: MensajeConversacion) => {
    setReformulando(true);
    setErrorAviso(null);
    const resultado = await reformularDesde(store, mensaje.id);
    setReformulando(false);
    if (!resultado.ok) {
      setErrorAviso(resultado.motivo);
      return;
    }
    registrarActividadConversacion();
    setAviso(null);
    setTexto(resultado.texto);
    setAnuncio(`Volviste a ese momento. Reformula tu intervención para ${nombreCorto}.`);
    setPedirFoco(n => n + 1);
  };

  const cerrarAviso = () => {
    setAviso(null);
    setErrorAviso(null);
    campo.current?.focus();
  };

  const volverAExplorar = () => store.getState().npc.actualizarEstadoNPC('inactivo');

  const excedido = texto.length > LIMITES_CHAT.mensaje;
  const ultimaRespuesta = [...mensajes].reverse().find(m => m.remitente === 'npc');

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 sm:p-4">
      <section
        aria-label={`Conversación con ${nombre}`}
        className="pointer-events-auto flex h-[min(44dvh,28rem)] w-full max-w-[46rem] flex-col overflow-hidden rounded-2xl border bg-card/95 shadow-[0_20px_50px_-20px_rgb(29_20_14/0.55)] backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-6"
      >
        <header className="flex items-center gap-3 border-b px-4 py-2.5">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full bg-terracota-suave text-sm font-semibold text-terracota"
          >
            {nombre
              .split(' ')
              .slice(0, 2)
              .map(p => p[0])
              .join('')}
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="flex items-center gap-2 truncate text-base leading-tight font-bold">
              {nombre}
              <span
                title={AVISO_IA}
                className="rounded-md border border-input/60 px-1.5 text-[0.75rem] leading-5 font-semibold text-muted-foreground"
              >
                IA<span className="sr-only">: {AVISO_IA}</span>
              </span>
            </h2>
            <p
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              data-testid="estado-npc"
            >
              <span
                aria-hidden
                className={cn(
                  'size-1.5 rounded-full',
                  estado === 'error_comunicacion' ? 'bg-destructive' : 'bg-salvia',
                  estado === 'procesando' && 'motion-safe:animate-pulse'
                )}
              />
              {ETIQUETA_ESTADO[estado] ?? ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={volverAExplorar}
            disabled={estado !== 'esperando_input'}
          >
            <ArrowLeft aria-hidden />
            Volver a explorar
          </Button>
        </header>

        <div className="relative min-h-0 flex-1">
          <ol
            role="log"
            aria-label="Historial de la conversación"
            aria-live="off"
            className={cn(
              'flex h-full flex-col gap-3 overflow-y-auto px-4 py-4',
              // Con un aviso visible, el último mensaje queda por encima del aviso.
              (estado === 'error_comunicacion' || aviso) && 'pb-44'
            )}
          >
            {mensajes.length === 0 && (
              <li className="m-auto flex max-w-sm flex-col gap-1.5 text-center text-sm text-muted-foreground">
                <span>
                  Saluda a {nombreCorto} y preséntate. Escribe como lo harías en consulta.
                </span>
                <span className="text-xs">
                  Si una intervención no te convence, podrás volver a ella y ensayar otra.
                </span>
              </li>
            )}
            {mensajes.map(mensaje => (
              <Burbuja
                key={mensaje.id}
                mensaje={mensaje}
                nombre={nombre}
                escribiendo={mensaje.id === escribiendoId}
                reformulable={!bloqueado && aviso === null && sePuedeReformular(mensaje)}
                destacarReformular={mensaje.id === idUltimaPropia}
                onReformular={() => {
                  setErrorAviso(null);
                  setAviso({ tipo: 'reformular', mensaje });
                }}
                onProgreso={desplazarAlFinal}
                onTerminar={() => store.getState().npc.actualizarEstadoNPC('esperando_input')}
              />
            ))}
            {estado === 'procesando' && (
              <li className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm text-muted-foreground">
                <span className="sr-only">{nombre} está pensando…</span>
                {rellenando ? (
                  // Relleno del personaje en lugar de un indicador: así se siente la espera.
                  <span aria-hidden className="italic motion-safe:animate-in motion-safe:fade-in-0">
                    {fraseRelleno(emocionActual(mensajes), mensajes.length)}
                  </span>
                ) : (
                  <span aria-hidden className="flex gap-1">
                    {[0, 200, 400].map(retraso => (
                      <span
                        key={retraso}
                        className="size-1.5 rounded-full bg-terracota/60 motion-safe:animate-pulse"
                        style={{ animationDelay: `${retraso}ms` }}
                      />
                    ))}
                  </span>
                )}
              </li>
            )}
            <div ref={final} />
          </ol>

          {/* Anuncia cada respuesta completa una sola vez (el texto progresivo es solo visual). */}
          <p className="sr-only" aria-live="polite">
            {anuncio ||
              (ultimaRespuesta && estado !== 'procesando'
                ? `${nombre}: ${ultimaRespuesta.contenido}`
                : '')}
          </p>

          {estado === 'error_comunicacion' && (
            <ErrorComunicacion
              mensaje={error}
              onReintentar={() => void enviarMensaje(store, { reintentar: true })}
              onFinalizar={onFinalizar}
              finalizando={finalizando}
            />
          )}

          {aviso?.tipo === 'reformular' && estado !== 'error_comunicacion' && (
            <AvisoEnLinea
              titulo="¿Volver a este momento?"
              descripcion={
                <>
                  Tu intervención «{recortar(aviso.mensaje.contenido)}» y lo que vino después salen
                  de la conversación: {nombreCorto} no lo recordará. Tu docente verá este intento
                  junto a la práctica.
                </>
              }
              error={errorAviso}
              cancelar={{ etiqueta: 'Seguir como estaba', onClick: cerrarAviso }}
              confirmar={{
                etiqueta: 'Volver y reformular',
                icono: <RotateCcw aria-hidden />,
                ocupado: reformulando,
                onClick: () => void confirmarReformular(aviso.mensaje),
              }}
            />
          )}

          {aviso?.tipo === 'dictado' && (
            <AvisoEnLinea
              titulo="¿Dictar con tu voz?"
              descripcion="Tu navegador convierte la voz en texto. En Chrome y Edge el audio lo procesan los servidores de Google o Microsoft. El texto queda en el campo para que lo revises antes de enviarlo."
              cancelar={{ etiqueta: 'Mejor escribo', onClick: cerrarAviso }}
              confirmar={{
                etiqueta: 'Dictar',
                onClick: () => {
                  const { aceptar } = aviso;
                  setAviso(null);
                  aceptar();
                },
              }}
            />
          )}
        </div>

        <form
          className="flex items-end gap-2 border-t p-3"
          onSubmit={evento => {
            evento.preventDefault();
            enviar();
          }}
        >
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="mensaje-estudiante" className="sr-only">
              Tu intervención para {nombre}
            </label>
            <Textarea
              ref={campo}
              id="mensaje-estudiante"
              rows={1}
              value={texto}
              onChange={evento => {
                registrarTecleo(Math.abs(evento.target.value.length - texto.length));
                setTexto(evento.target.value);
              }}
              onKeyDown={evento => {
                // Enter envía; Shift+Enter inserta un salto de línea. Se respeta la composición
                // de caracteres (tildes con teclados IME).
                if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
                  evento.preventDefault();
                  enviar();
                }
              }}
              placeholder={
                estado === 'procesando'
                  ? `${nombreCorto} está pensando…`
                  : 'Escribe tu intervención…'
              }
              disabled={
                estado === 'procesando' ||
                estado === 'error_comunicacion' ||
                estado === 'sesion_finalizada' ||
                reformulando
              }
              aria-invalid={excedido || undefined}
              aria-describedby="ayuda-mensaje"
              className="max-h-32 min-h-10 resize-none text-sm"
            />
            <p
              id="ayuda-mensaje"
              className={cn(
                'flex justify-between text-xs text-muted-foreground',
                excedido && 'text-destructive'
              )}
            >
              <span>
                {excedido
                  ? `Tu mensaje supera los ${LIMITES_CHAT.mensaje} caracteres. Acórtalo para enviarlo.`
                  : 'Enter para enviar · Mayús + Enter para una nueva línea'}
              </span>
              {texto.length > LIMITES_CHAT.mensaje * 0.8 && (
                <span className="tabular-nums">
                  {texto.length}/{LIMITES_CHAT.mensaje}
                </span>
              )}
            </p>
          </div>
          <BotonDictado
            deshabilitado={bloqueado}
            onTexto={dictado => {
              registrarTecleo(dictado.length);
              setTexto(actual => (actual.trim() ? `${actual.trimEnd()} ${dictado}` : dictado));
            }}
            onPedirAceptacion={aceptar => {
              setErrorAviso(null);
              setAviso({ tipo: 'dictado', aceptar });
            }}
          />
          <Button
            type="submit"
            variant="accion"
            size="icon-lg"
            className="mb-5"
            disabled={bloqueado || !texto.trim() || excedido}
            aria-label="Enviar"
          >
            {estado === 'procesando' ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <SendHorizontal aria-hidden />
            )}
          </Button>
        </form>
      </section>
    </div>
  );
}

/** Primeras palabras de una intervención, para citarla en una confirmación. */
function recortar(texto: string, maximo = 70): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo).trimEnd()}…` : limpio;
}

interface BurbujaProps {
  mensaje: MensajeConversacion;
  nombre: string;
  escribiendo: boolean;
  /** Se puede volver a esta intervención para ensayar otra respuesta. */
  reformulable: boolean;
  /** La última intervención muestra la acción siempre; las demás, al pasar el ratón o con foco. */
  destacarReformular: boolean;
  onReformular: () => void;
  onProgreso: () => void;
  onTerminar: () => void;
}

function Burbuja({
  mensaje,
  nombre,
  escribiendo,
  reformulable,
  destacarReformular,
  onReformular,
  onProgreso,
  onTerminar,
}: BurbujaProps) {
  const texto = useTextoProgresivo(mensaje.contenido, escribiendo, onTerminar);
  const esEstudiante = mensaje.remitente === 'estudiante';

  useLayoutEffect(() => {
    if (escribiendo) onProgreso();
  }, [texto, escribiendo, onProgreso]);

  return (
    <li
      data-remitente={mensaje.remitente}
      className={cn(
        'group/burbuja flex max-w-[85%] flex-col gap-1',
        esEstudiante ? 'items-end self-end' : 'self-start'
      )}
    >
      <span className="sr-only">{esEstudiante ? 'Tú' : nombre}:</span>
      <p
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          esEstudiante
            ? 'rounded-br-md bg-salvia-suave text-foreground'
            : 'rounded-bl-md border bg-card text-foreground'
        )}
      >
        {texto}
        {escribiendo && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-current motion-safe:animate-pulse"
          />
        )}
      </p>
      <span className="flex items-center gap-2 px-1">
        {reformulable && (
          <button
            type="button"
            onClick={onReformular}
            className={cn(
              'inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground underline-offset-4 transition-opacity hover:text-foreground hover:underline focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
              !destacarReformular && 'opacity-0 group-hover/burbuja:opacity-100'
            )}
          >
            <RotateCcw className="size-3" aria-hidden />
            Ensayar otra respuesta
          </button>
        )}
        <time dateTime={mensaje.timestamp} className="text-xs text-muted-foreground">
          {formatoHora.format(new Date(mensaje.timestamp))}
        </time>
      </span>
    </li>
  );
}

interface AvisoEnLineaProps {
  titulo: string;
  descripcion: React.ReactNode;
  error?: string | null;
  cancelar: { etiqueta: string; onClick: () => void };
  confirmar: { etiqueta: string; onClick: () => void; icono?: React.ReactNode; ocupado?: boolean };
}

/** Confirmación al pie del panel, sobre el historial (que sigue visible detrás). */
function AvisoEnLinea({ titulo, descripcion, error, cancelar, confirmar }: AvisoEnLineaProps) {
  return (
    <div className="absolute inset-x-3 bottom-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
      <div
        role="alertdialog"
        aria-labelledby="aviso-panel-titulo"
        aria-describedby="aviso-panel-detalle"
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-lg"
      >
        <div className="flex flex-col gap-1">
          <h3 id="aviso-panel-titulo" className="text-sm font-bold">
            {titulo}
          </h3>
          <p id="aviso-panel-detalle" className="text-sm text-muted-foreground">
            {descripcion}
          </p>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={cancelar.onClick} disabled={confirmar.ocupado}>
            {cancelar.etiqueta}
          </Button>
          <Button size="sm" onClick={confirmar.onClick} disabled={confirmar.ocupado} autoFocus>
            {confirmar.ocupado ? <Loader2 className="animate-spin" aria-hidden /> : confirmar.icono}
            {confirmar.etiqueta}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Detalle del aviso: el mensaje específico del servidor o una causa probable. */
function detalleError(mensaje: string | null): string {
  if (mensaje && mensaje !== MENSAJE_NO_DISPONIBLE) return mensaje;
  return 'Puede ser la conexión o una saturación momentánea del servicio de IA.';
}

interface ErrorComunicacionProps {
  mensaje: string | null;
  onReintentar: () => void;
  onFinalizar: () => void;
  finalizando: boolean;
}

/**
 * HU-16 · T02 — Aviso de paciente no disponible. El historial sigue visible detrás. "Finalizar
 * sesión" pide una confirmación en línea porque la conversación no podrá reanudarse.
 */
function ErrorComunicacion({
  mensaje,
  onReintentar,
  onFinalizar,
  finalizando,
}: ErrorComunicacionProps) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="absolute inset-x-3 bottom-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
      <div
        role="alertdialog"
        aria-labelledby="error-comunicacion-titulo"
        aria-describedby="error-comunicacion-detalle"
        className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-card p-4 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <h3 id="error-comunicacion-titulo" className="text-sm font-bold">
              El paciente no responde por ahora
            </h3>
            <p id="error-comunicacion-detalle" className="text-sm text-muted-foreground">
              {confirmando
                ? 'Si terminas ahora, la práctica no se podrá reanudar. Tu docente revisará lo que alcanzaste a conversar.'
                : `${detalleError(mensaje)} Tu último mensaje se guardó.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {confirmando ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmando(false)}
                disabled={finalizando}
              >
                Volver
              </Button>
              <Button variant="destructive" size="sm" onClick={onFinalizar} disabled={finalizando}>
                {finalizando ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Square aria-hidden />
                )}
                Sí, terminar práctica
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmando(true)}>
                Terminar práctica
              </Button>
              <Button size="sm" onClick={onReintentar} autoFocus>
                <RotateCw aria-hidden />
                Reintentar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
