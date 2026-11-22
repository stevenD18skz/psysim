'use client';

import { ArrowLeft, ArrowRight, Check, Compass, Lightbulb, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  calcularPosicionTarjeta,
  calcularRecorteSpotlight,
  calcularScrollObjetivo,
  claveRecorrido,
  dispararRecorrido,
  type LadoTarjeta,
  leerAyudaVista,
  marcarAyudaVista,
  type PosicionTarjeta,
  type Rectangulo,
  suscribirAyuda,
  suscribirDisparoRecorrido,
} from '@/lib/ayuda/recorridos';
import { cn } from '@/lib/utils';

export interface PasoRecorrido {
  id: string;
  /** Selector CSS del elemento que se enfocará (p. ej. `[data-tour="config-caso"]`). */
  selector: string;
  titulo: string;
  descripcion: string;
  /** Consejo breve opcional (atajo, regla clínica o siguiente paso). */
  consejo?: string;
  ladoPreferido?: Exclude<LadoTarjeta, 'sheet'>;
}

const ANCHO_TARJETA = 376;
const ALTO_TARJETA_ESTIMADO = 236;

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Recorrido guiado con foco (spotlight) sobre la interfaz real: una sola capa compositada dibuja
 * simultáneamente el velo en nogal (`box-shadow: 0 0 0 100vmax`) y el aura en latón, por lo que
 * jamás se desincronizan durante desplazamientos ni cambios de paso. Incluye navegación por
 * teclado (`←`, `→`, `Esc`, trampa de foco), restauración de foco y puntos de progreso.
 */
export function RecorridoGuiado({
  id,
  nombre,
  pasos,
}: {
  id: string;
  /** Nombre legible para lectores de pantalla (p. ej. «Recorrido de asignar práctica»). */
  nombre: string;
  pasos: readonly PasoRecorrido[];
}) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const [abierto, setAbierto] = useState(false);
  const [pasosActivos, setPasosActivos] = useState<PasoRecorrido[]>([]);
  const [indice, setIndice] = useState(0);
  const [recorte, setRecorte] = useState<Rectangulo | null>(null);
  const [posicion, setPosicion] = useState<PosicionTarjeta | null>(null);
  /** Solo transiciona suavemente al deslizar entre dos objetivos ya visibles (nunca al hacer scroll). */
  const [animarFoco, setAnimarFoco] = useState(false);
  /** Oculta brevemente la tarjeta mientras la página llega al paso fuera de pantalla para evitar saltos. */
  const [ocultandoTarjeta, setOcultandoTarjeta] = useState(false);

  const tarjetaRef = useRef<HTMLDivElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);
  const teniaRecorteRef = useRef(false);
  const clave = claveRecorrido(id);

  const pasoActual = pasosActivos[indice] ?? null;
  const total = pasosActivos.length;
  const esPrimero = indice === 0;
  const esUltimo = total > 0 && indice === total - 1;

  const cerrar = useCallback(
    (marcar = true) => {
      setAbierto(false);
      setRecorte(null);
      setPosicion(null);
      setAnimarFoco(false);
      setOcultandoTarjeta(false);
      teniaRecorteRef.current = false;
      if (marcar) marcarAyudaVista(clave);
      const anterior = focoAnteriorRef.current;
      focoAnteriorRef.current = null;
      if (anterior && anterior.isConnected) {
        requestAnimationFrame(() => anterior.focus());
      }
    },
    [clave]
  );

  const abrir = useCallback(
    (pasoInicial = 0) => {
      const disponibles = pasos.filter(paso => document.querySelector(paso.selector) !== null);
      if (disponibles.length === 0) return;
      if (document.activeElement instanceof HTMLElement) {
        focoAnteriorRef.current = document.activeElement;
      }
      teniaRecorteRef.current = false;
      setPasosActivos(disponibles);
      setIndice(Math.max(0, Math.min(pasoInicial, disponibles.length - 1)));
      setAbierto(true);
    },
    [pasos]
  );

  useEffect(() => suscribirDisparoRecorrido(id, abrir), [id, abrir]);

  // Encuadra el paso actual sin rebotes y mantiene el foco pegado 1:1 durante el scroll.
  useEffect(() => {
    if (!abierto || !pasoActual) return;
    const elemento = document.querySelector<HTMLElement>(pasoActual.selector);
    if (!elemento) return;

    let cancelado = false;
    let rafId = 0;
    let temporizadorAsiento: number | undefined;
    let desplazandoPaso = false;

    const medirYColocar = (permitirTransicion: boolean) => {
      if (cancelado) return;
      const rectElemento = elemento.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const nuevoRecorte = calcularRecorteSpotlight(
        {
          top: rectElemento.top,
          left: rectElemento.left,
          width: rectElemento.width,
          height: rectElemento.height,
        },
        viewport
      );
      const altoMedido = tarjetaRef.current?.offsetHeight || ALTO_TARJETA_ESTIMADO;
      const nuevaPosicion = calcularPosicionTarjeta(
        nuevoRecorte,
        { width: ANCHO_TARJETA, height: altoMedido },
        viewport,
        pasoActual.ladoPreferido ?? 'bottom'
      );
      setAnimarFoco(permitirTransicion);
      setRecorte(nuevoRecorte);
      setPosicion(nuevaPosicion);
      teniaRecorteRef.current = true;
    };

    const finalizarDesplazamiento = () => {
      if (cancelado) return;
      desplazandoPaso = false;
      window.clearTimeout(temporizadorAsiento);
      medirYColocar(false);
      setOcultandoTarjeta(false);
    };

    const iniciarPaso = () => {
      if (cancelado) return;
      const rectInicial = elemento.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const altoDocumento = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const destinoScroll = calcularScrollObjetivo(
        {
          top: rectInicial.top,
          left: rectInicial.left,
          width: rectInicial.width,
          height: rectInicial.height,
        },
        viewport,
        window.scrollY,
        altoDocumento
      );

      if (destinoScroll !== null && typeof window.scrollTo === 'function') {
        const instantaneo = prefiereMenosMovimiento();
        desplazandoPaso = !instantaneo;
        setAnimarFoco(false);
        if (!instantaneo) setOcultandoTarjeta(true);

        window.scrollTo({
          top: destinoScroll,
          behavior: instantaneo ? 'auto' : 'smooth',
        });

        medirYColocar(false);
        if (instantaneo) {
          setOcultandoTarjeta(false);
        } else {
          // Si `scrollend` no dispara (p. ej. Safari antiguo), asienta tras terminar la inercia.
          temporizadorAsiento = window.setTimeout(finalizarDesplazamiento, 420);
        }
      } else {
        setOcultandoTarjeta(false);
        medirYColocar(teniaRecorteRef.current);
      }
    };

    rafId = requestAnimationFrame(iniciarPaso);

    const alDesplazarORedimensionar = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        medirYColocar(false);
        if (desplazandoPaso) {
          window.clearTimeout(temporizadorAsiento);
          temporizadorAsiento = window.setTimeout(finalizarDesplazamiento, 110);
        }
      });
    };

    const alTerminarScroll = () => {
      if (desplazandoPaso) finalizarDesplazamiento();
    };

    window.addEventListener('resize', alDesplazarORedimensionar);
    window.addEventListener('scroll', alDesplazarORedimensionar, true);
    window.addEventListener('scrollend', alTerminarScroll);

    const observador =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => medirYColocar(false));
          })
        : null;
    observador?.observe(elemento);
    if (tarjetaRef.current) observador?.observe(tarjetaRef.current);

    return () => {
      cancelado = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(temporizadorAsiento);
      window.removeEventListener('resize', alDesplazarORedimensionar);
      window.removeEventListener('scroll', alDesplazarORedimensionar, true);
      window.removeEventListener('scrollend', alTerminarScroll);
      observador?.disconnect();
    };
  }, [abierto, pasoActual]);

  // Mueve el foco al diálogo al abrir o cambiar de paso.
  useEffect(() => {
    if (!abierto) return;
    const rafId = requestAnimationFrame(() => {
      tarjetaRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(rafId);
  }, [abierto, indice]);

  // Atajos de teclado (Esc, flechas y trampa de Tab dentro de la tarjeta modal).
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrar(true);
        return;
      }
      if (evento.key === 'ArrowRight' && indice < total - 1) {
        evento.preventDefault();
        setIndice(actual => Math.min(actual + 1, total - 1));
        return;
      }
      if (evento.key === 'ArrowLeft' && indice > 0) {
        evento.preventDefault();
        setIndice(actual => Math.max(actual - 1, 0));
        return;
      }
      if (evento.key === 'Tab' && tarjetaRef.current) {
        const enfocables = Array.from(
          tarjetaRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
          )
        );
        if (enfocables.length === 0) return;
        const primero = enfocables[0]!;
        const ultimo = enfocables[enfocables.length - 1]!;
        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [abierto, indice, total, cerrar]);

  if (!abierto || !pasoActual || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden" aria-label={nombre}>
      {/* Captura clics fuera de la tarjeta para cerrar el recorrido sin fricción. */}
      <div
        aria-hidden
        onClick={() => cerrar(true)}
        className={cn('fixed inset-0 z-50 cursor-pointer', !recorte && 'bg-[rgb(29_20_14/0.62)]')}
      />

      {/* Una sola capa compositada dibuja el velo en nogal + el aro y aura en latón: cero desfase. */}
      {recorte && (
        <div
          aria-hidden
          style={{
            transform: `translate3d(${recorte.left}px, ${recorte.top}px, 0)`,
            width: recorte.width,
            height: recorte.height,
            boxShadow: '0 0 0 4px rgb(201 155 75 / 0.34), 0 0 0 100vmax rgb(29 20 14 / 0.62)',
          }}
          className={cn(
            'pointer-events-none fixed top-0 left-0 z-[51] rounded-[14px] border-2 border-laton-claro will-change-transform',
            animarFoco &&
              'motion-safe:transition-[transform,width,height] motion-safe:duration-220 motion-safe:ease-salida'
          )}
        />
      )}

      {/* Tarjeta flotante del paso actual. */}
      <div
        ref={tarjetaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        tabIndex={-1}
        style={
          posicion
            ? {
                transform: `translate3d(${posicion.left}px, ${posicion.top}px, 0)`,
                width: posicion.width,
              }
            : { transform: 'translate3d(16px, 80px, 0)', width: ANCHO_TARJETA }
        }
        className={cn(
          'fixed top-0 left-0 z-[52] flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[0_24px_56px_-16px_rgb(29_20_14/0.55)] outline-hidden will-change-transform',
          animarFoco
            ? 'motion-safe:transition-[transform,opacity] motion-safe:duration-220 motion-safe:ease-salida'
            : 'motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out',
          !posicion || ocultandoTarjeta ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-laton" />

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-semibold text-salvia-oscuro tabular-nums">
            <Compass className="size-3.5 shrink-0" aria-hidden />
            Paso {indice + 1} de {total}
          </span>
          <button
            type="button"
            onClick={() => cerrar(true)}
            aria-label="Cerrar recorrido guiado"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-1.5" aria-live="polite">
          <h3 id={idTitulo} className="text-base leading-snug font-bold tracking-[-0.015em]">
            {pasoActual.titulo}
          </h3>
          <p id={idDescripcion} className="text-sm leading-relaxed text-muted-foreground">
            {pasoActual.descripcion}
          </p>
        </div>

        {pasoActual.consejo && (
          <p className="flex items-start gap-2 rounded-xl bg-muted/65 px-3 py-2 text-xs leading-relaxed text-foreground">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-ambar" aria-hidden />
            <span>{pasoActual.consejo}</span>
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <div role="group" aria-label="Pasos del recorrido" className="flex items-center gap-1.5">
            {pasosActivos.map((paso, i) => {
              const actual = i === indice;
              return (
                <button
                  key={paso.id}
                  type="button"
                  onClick={() => setIndice(i)}
                  aria-label={`Ir al paso ${i + 1}: ${paso.titulo}`}
                  aria-current={actual ? 'step' : undefined}
                  className={cn(
                    'h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                    actual
                      ? 'w-5 bg-nogal'
                      : i < indice
                        ? 'w-2 bg-salvia hover:bg-salvia-oscuro'
                        : 'w-2 bg-border hover:bg-muted-foreground/60'
                  )}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {!esPrimero ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIndice(actual => Math.max(0, actual - 1))}
              >
                <ArrowLeft aria-hidden />
                Anterior
              </Button>
            ) : (
              <Button type="button" size="sm" variant="ghost" onClick={() => cerrar(true)}>
                Omitir
              </Button>
            )}
            {esUltimo ? (
              <Button type="button" size="sm" variant="accion" onClick={() => cerrar(true)}>
                <Check aria-hidden />
                Entendido
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setIndice(actual => Math.min(actual + 1, total - 1))}
              >
                Siguiente
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Invitación no bloqueante que aparece solo en la primera visita del docente: respeta su control
 * (Paradoja del usuario activo) y abre el recorrido guiado completo con un clic. Al iniciar u
 * omitir, se oculta; siempre podrá repetirse desde «Recorrido guiado» en el encabezado.
 */
export function InvitacionRecorrido({
  id,
  titulo,
  descripcion,
  etiquetaBoton = 'Iniciar recorrido',
  className,
}: {
  id: string;
  titulo: string;
  descripcion: string;
  etiquetaBoton?: string;
  className?: string;
}) {
  const clave = claveRecorrido(id);
  const visto = useSyncExternalStore(
    suscribirAyuda,
    () => leerAyudaVista(clave),
    () => true
  );

  if (visto) return null;

  return (
    <div
      role="region"
      aria-label={titulo}
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-laton/35 bg-card px-4 py-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro"
        >
          <Compass className="size-4.5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">{titulo}</p>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{descripcion}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => dispararRecorrido(id, 0)}>
          <Compass aria-hidden />
          {etiquetaBoton}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => marcarAyudaVista(clave)}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}

/**
 * Botón reutilizable para lanzar o repetir un recorrido guiado en cualquier momento (funciona
 * incluso dentro de encabezados renderizados en Server Components gracias al evento local).
 */
export function BotonRecorrido({
  id,
  etiqueta = 'Recorrido guiado',
  pasoInicial = 0,
  variant = 'outline',
  size = 'lg',
  className,
}: {
  id: string;
  etiqueta?: string;
  pasoInicial?: number;
  variant?: 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => dispararRecorrido(id, pasoInicial)}
    >
      <Compass aria-hidden />
      {etiqueta}
    </Button>
  );
}
