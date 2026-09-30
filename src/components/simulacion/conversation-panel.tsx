'use client';

import { AlertTriangle, ArrowLeft, Loader2, RotateCw, SendHorizontal, Square } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useTextoProgresivo } from '@/components/simulacion/use-texto-progresivo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type EstadoNpc } from '@/lib/conversacion/estados-npc';
import { enviarMensaje, MENSAJE_NO_DISPONIBLE } from '@/lib/conversacion/enviar-mensaje';
import { cn } from '@/lib/utils';
import { LIMITES_CHAT } from '@/schemas/npc-chat.schema';
import { useAppStore, useAppStoreApi } from '@/store/app-store-provider';
import { type MensajeConversacion } from '@/types';

/** Texto breve del estado del paciente en la cabecera del panel. */
const ETIQUETA_ESTADO: Partial<Record<EstadoNpc, string>> = {
  esperando_input: 'Escuchando',
  procesando: 'Pensando',
  respondiendo: 'Respondiendo',
  error_comunicacion: 'Sin conexión',
};

const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

interface ConversationPanelProps {
  onFinalizar: () => void;
  finalizando: boolean;
}

/**
 * HU-13 — Panel de conversación superpuesto sobre el canvas 3D (parte inferior de la pantalla).
 *
 * El contenedor externo es `pointer-events: none` y solo el panel recibe eventos, para no
 * bloquear el canvas que queda alrededor.
 */
export function ConversationPanel({ onFinalizar, finalizando }: ConversationPanelProps) {
  const store = useAppStoreApi();
  const nombre = useAppStore(state => state.sesion.activa?.npc.nombre ?? 'Paciente');
  const mensajes = useAppStore(state => state.conversacion.mensajes);
  const estado = useAppStore(state => state.npc.estado);
  const error = useAppStore(state => state.conversacion.error);

  const [texto, setTexto] = useState('');
  const campo = useRef<HTMLTextAreaElement>(null);
  const final = useRef<HTMLDivElement>(null);

  const ultimo = mensajes.at(-1);
  const escribiendoId = estado === 'respondiendo' && ultimo?.remitente === 'npc' ? ultimo.id : null;
  const bloqueado = estado !== 'esperando_input';

  // El campo recupera el foco cada vez que el paciente termina de responder.
  useEffect(() => {
    if (estado === 'esperando_input') campo.current?.focus();
  }, [estado]);

  // Llaves obligatorias: en Chrome reciente `scrollIntoView` devuelve una Promise, y un efecto
  // que devuelve algo distinto de una función de limpieza hace fallar a React.
  const desplazarAlFinal = () => {
    final.current?.scrollIntoView({ block: 'end' });
  };
  useLayoutEffect(() => {
    desplazarAlFinal();
  }, [mensajes.length, estado]);

  const enviar = () => {
    if (bloqueado || !texto.trim()) return;
    void enviarMensaje(store, texto);
    // El mensaje queda en el historial en cuanto se acepta el envío: se limpia el campo.
    if (store.getState().npc.estado === 'procesando') setTexto('');
  };

  const volverAExplorar = () => store.getState().npc.actualizarEstadoNPC('inactivo');

  const excedido = texto.length > LIMITES_CHAT.mensaje;
  const ultimaRespuesta = [...mensajes].reverse().find(m => m.remitente === 'npc');

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 sm:p-4">
      <section
        aria-label={`Conversación con ${nombre}`}
        className="pointer-events-auto flex h-[min(46dvh,30rem)] w-full max-w-3xl animate-in flex-col overflow-hidden rounded-2xl border bg-card/95 shadow-2xl backdrop-blur fade-in-0 slide-in-from-bottom-6"
      >
        <header className="flex items-center gap-3 border-b px-4 py-2.5">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full bg-accent font-heading text-sm font-semibold text-accent-foreground"
          >
            {nombre
              .split(' ')
              .slice(0, 2)
              .map(p => p[0])
              .join('')}
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate font-heading text-base leading-tight font-semibold">
              {nombre}
            </h2>
            <p
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              data-testid="estado-npc"
            >
              <span
                aria-hidden
                className={cn(
                  'size-1.5 rounded-full',
                  estado === 'error_comunicacion' ? 'bg-destructive' : 'bg-success',
                  estado === 'procesando' && 'animate-pulse'
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
              // Con el aviso de error visible, el último mensaje queda por encima del aviso.
              estado === 'error_comunicacion' && 'pb-40'
            )}
          >
            {mensajes.length === 0 && (
              <li className="m-auto max-w-sm text-center text-sm text-muted-foreground">
                Saluda a {nombre.split(' ')[0]} y preséntate. Escribe como lo harías en consulta.
              </li>
            )}
            {mensajes.map(mensaje => (
              <Burbuja
                key={mensaje.id}
                mensaje={mensaje}
                nombre={nombre}
                escribiendo={mensaje.id === escribiendoId}
                onProgreso={desplazarAlFinal}
                onTerminar={() => store.getState().npc.actualizarEstadoNPC('esperando_input')}
              />
            ))}
            {estado === 'procesando' && (
              <li className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                <span className="sr-only">{nombre} está pensando…</span>
                <span aria-hidden className="flex gap-1">
                  {[0, 150, 300].map(retraso => (
                    <span
                      key={retraso}
                      className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                      style={{ animationDelay: `${retraso}ms` }}
                    />
                  ))}
                </span>
              </li>
            )}
            <div ref={final} />
          </ol>

          {/* Anuncia cada respuesta completa una sola vez (el texto progresivo es solo visual). */}
          <p className="sr-only" aria-live="polite">
            {ultimaRespuesta && estado !== 'procesando'
              ? `${nombre}: ${ultimaRespuesta.contenido}`
              : ''}
          </p>

          {estado === 'error_comunicacion' && (
            <ErrorComunicacion
              mensaje={error}
              onReintentar={() => void enviarMensaje(store, { reintentar: true })}
              onFinalizar={onFinalizar}
              finalizando={finalizando}
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
              onChange={evento => setTexto(evento.target.value)}
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
                  ? `${nombre.split(' ')[0]} está pensando…`
                  : 'Escribe tu intervención…'
              }
              disabled={
                estado === 'procesando' ||
                estado === 'error_comunicacion' ||
                estado === 'sesion_finalizada'
              }
              aria-invalid={excedido || undefined}
              aria-describedby="ayuda-mensaje"
              className="max-h-32 min-h-10 resize-none text-sm"
            />
            <p
              id="ayuda-mensaje"
              className={cn(
                'flex justify-between text-[11px] text-muted-foreground',
                excedido && 'text-destructive'
              )}
            >
              <span>Enter para enviar · Shift + Enter para una nueva línea</span>
              {texto.length > LIMITES_CHAT.mensaje * 0.8 && (
                <span className="tabular-nums">
                  {texto.length}/{LIMITES_CHAT.mensaje}
                </span>
              )}
            </p>
          </div>
          <Button
            type="submit"
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

interface BurbujaProps {
  mensaje: MensajeConversacion;
  nombre: string;
  escribiendo: boolean;
  onProgreso: () => void;
  onTerminar: () => void;
}

function Burbuja({ mensaje, nombre, escribiendo, onProgreso, onTerminar }: BurbujaProps) {
  const texto = useTextoProgresivo(mensaje.contenido, escribiendo, onTerminar);
  const esEstudiante = mensaje.remitente === 'estudiante';

  useLayoutEffect(() => {
    if (escribiendo) onProgreso();
  }, [texto, escribiendo, onProgreso]);

  return (
    <li
      data-remitente={mensaje.remitente}
      className={cn(
        'flex max-w-[85%] flex-col gap-1',
        esEstudiante ? 'items-end self-end' : 'self-start'
      )}
    >
      <span className="sr-only">{esEstudiante ? 'Tú' : nombre}:</span>
      <p
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          esEstudiante
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-muted text-foreground'
        )}
      >
        {texto}
        {escribiendo && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-current"
          />
        )}
      </p>
      <time dateTime={mensaje.timestamp} className="px-1 text-[11px] text-muted-foreground">
        {formatoHora.format(new Date(mensaje.timestamp))}
      </time>
    </li>
  );
}

/** Detalle del aviso: el mensaje específico del servidor o una causa probable. */
function detalleError(mensaje: string | null): string {
  if (mensaje && mensaje !== MENSAJE_NO_DISPONIBLE) return mensaje;
  return 'Puede deberse a la conexión o a una saturación momentánea del servicio de IA.';
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
    <div className="absolute inset-x-3 bottom-3 animate-in fade-in-0 slide-in-from-bottom-2">
      <div
        role="alertdialog"
        aria-labelledby="error-comunicacion-titulo"
        aria-describedby="error-comunicacion-detalle"
        className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-card p-4 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <h3 id="error-comunicacion-titulo" className="font-sans text-sm font-semibold">
              El paciente virtual no está disponible temporalmente
            </h3>
            <p id="error-comunicacion-detalle" className="text-sm text-muted-foreground">
              {confirmando
                ? 'Si finalizas, la conversación no podrá reanudarse.'
                : `${detalleError(mensaje)} Tu último mensaje se conserva.`}
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
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={onFinalizar} disabled={finalizando}>
                {finalizando ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Square aria-hidden />
                )}
                Sí, finalizar sesión
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmando(true)}>
                Finalizar sesión
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
