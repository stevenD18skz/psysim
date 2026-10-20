'use client';

import { FileText, NotebookPen, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { CodigoCaso } from '@/components/casos/codigo-caso';
import { Button } from '@/components/ui/button';
import { CONSULTORIOS } from '@/lib/casos/opciones';
import { cn } from '@/lib/utils';
import { type SesionActiva } from '@/types';

/*
 * Herramientas que un terapeuta tiene a mano en consulta: la hoja de remisión del caso (lo que se
 * sabe antes de entrar) y una libreta para tomar notas mientras escucha. Son paneles flotantes,
 * no modales: se consultan sin salir de la conversación ni tapar al paciente.
 */

export type Herramienta = 'remision' | 'notas';

/** Botón del HUD que abre o cierra una herramienta. */
export function BotonHerramienta({
  herramienta,
  abierta,
  onAlternar,
}: {
  herramienta: Herramienta;
  abierta: boolean;
  onAlternar: () => void;
}) {
  const Icono = herramienta === 'remision' ? FileText : NotebookPen;
  const etiqueta = herramienta === 'remision' ? 'Hoja de remisión' : 'Mis notas';
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'pointer-events-auto bg-card/90 backdrop-blur',
        abierta && 'border-nogal bg-nogal text-lino hover:bg-nogal/90 hover:text-lino'
      )}
      aria-pressed={abierta}
      onClick={onAlternar}
    >
      <Icono aria-hidden />
      <span className="hidden lg:inline">{etiqueta}</span>
      <span className="sr-only lg:hidden">{etiqueta}</span>
    </Button>
  );
}

interface PanelProps {
  titulo: string;
  lado: 'izquierda' | 'derecha';
  /** Con la conversación abierta, el panel no baja hasta el chat. */
  conversando: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
  className?: string;
}

/** Hoja de papel flotante junto al borde de la pantalla. Escape la cierra. */
function PanelFlotante({ titulo, lado, conversando, onCerrar, children, className }: PanelProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      onKeyDown={evento => {
        if (evento.key === 'Escape') {
          evento.stopPropagation();
          onCerrar();
        }
      }}
      className={cn(
        'pointer-events-auto absolute top-[4.25rem] z-30 flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-nogal/20 bg-lino text-foreground shadow-[0_18px_40px_-18px_rgb(29_20_14/0.6)] motion-safe:animate-in motion-safe:fade-in-0',
        lado === 'izquierda'
          ? 'left-4 motion-safe:slide-in-from-left-4'
          : 'right-4 motion-safe:slide-in-from-right-4',
        conversando ? 'max-h-[calc(56dvh-6rem)]' : 'max-h-[calc(100dvh-6rem)]',
        className
      )}
    >
      <header className="flex items-center gap-2 border-b border-nogal/15 px-4 py-2.5">
        <h2 id={id} className="text-sm font-bold">
          {titulo}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          onClick={onCerrar}
          aria-label={`Cerrar ${titulo.toLowerCase()}`}
        >
          <X aria-hidden />
        </Button>
      </header>
      {children}
    </section>
  );
}

/**
 * Hoja de remisión: el mismo resumen del caso que se leyó en las instrucciones, para releerlo
 * durante la consulta (en la vida real el terapeuta tiene la ficha de admisión a mano).
 */
export function HojaRemision({
  sesion,
  conversando,
  onCerrar,
}: {
  sesion: SesionActiva;
  conversando: boolean;
  onCerrar: () => void;
}) {
  const { escenario, npc } = sesion;
  const consultorio = CONSULTORIOS.find(c => c.ruta === escenario.configuracion3d);
  return (
    <PanelFlotante
      titulo="Hoja de remisión"
      lado="izquierda"
      conversando={conversando}
      onCerrar={onCerrar}
    >
      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          <dt className="text-muted-foreground">Paciente</dt>
          <dd className="font-semibold text-terracota">{npc.nombre}</dd>
          <dt className="text-muted-foreground">Edad</dt>
          <dd>{npc.edad} años</dd>
          <dt className="text-muted-foreground">Caso</dt>
          <dd>
            <CodigoCaso codigo={escenario.codigo} className="font-mono text-xs" /> ·{' '}
            {escenario.titulo}
          </dd>
          {consultorio && (
            <>
              <dt className="text-muted-foreground">Lugar</dt>
              <dd>{consultorio.nombre}</dd>
            </>
          )}
        </dl>
        <div className="flex flex-col gap-1 border-t border-nogal/15 pt-3">
          <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
            Motivo de consulta
          </p>
          <p className="leading-relaxed text-pretty">{escenario.descripcion}</p>
        </div>
        <div className="flex flex-col gap-1 border-t border-nogal/15 pt-3">
          <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
            Lo que sabes antes de entrar
          </p>
          <p className="leading-relaxed text-pretty">{npc.perfilClinico}</p>
        </div>
        <div className="flex flex-col gap-1 border-t border-nogal/15 pt-3">
          <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
            Competencia que practicas
          </p>
          <p className="font-semibold">{escenario.competenciaCentral}</p>
        </div>
      </div>
    </PanelFlotante>
  );
}

function claveNotas(sesionId: string) {
  return `psysim:notas:${sesionId}`;
}

function leerNotas(sesionId: string): string {
  try {
    return localStorage.getItem(claveNotas(sesionId)) ?? '';
  } catch {
    return '';
  }
}

/**
 * Libreta del estudiante: notas privadas mientras escucha (palabras clave, hipótesis, lo que
 * quiere retomar). Se guardan solo en este navegador; el docente no las ve.
 */
export function LibretaNotas({
  sesionId,
  conversando,
  onCerrar,
}: {
  sesionId: string;
  conversando: boolean;
  onCerrar: () => void;
}) {
  const id = useId();
  const [notas, setNotas] = useState(() => leerNotas(sesionId));
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      try {
        if (notas) localStorage.setItem(claveNotas(sesionId), notas);
        else localStorage.removeItem(claveNotas(sesionId));
      } catch {
        // Sin almacenamiento: las notas duran mientras la página siga abierta.
      }
    }, 400);
    return () => clearTimeout(temporizador);
  }, [notas, sesionId]);

  return (
    <PanelFlotante titulo="Mis notas" lado="derecha" conversando={conversando} onCerrar={onCerrar}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <label htmlFor={id} className="sr-only">
          Mis notas de la consulta
        </label>
        <textarea
          ref={campo}
          id={id}
          value={notas}
          onChange={evento => setNotas(evento.target.value)}
          placeholder="Palabras clave, lo que quieres retomar, tus hipótesis…"
          className="min-h-48 flex-1 resize-none rounded-md bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_1.45rem,rgb(58_36_24/0.12)_1.45rem,rgb(58_36_24/0.12)_1.5rem)] bg-local px-1 text-sm leading-6 outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Solo se guardan en este navegador. Tu docente no las ve.
        </p>
      </div>
    </PanelFlotante>
  );
}
