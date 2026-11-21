'use client';

import { ArrowRight, CheckCircle2, KeyRound, Link2, Send } from 'lucide-react';
import Link from 'next/link';
import { useRef, useSyncExternalStore } from 'react';

import { BotonCompartir } from '@/components/asignaciones/boton-compartir';
import { BotonCopiar } from '@/components/asignaciones/boton-copiar';
import { BotonEntregarEquipo } from '@/components/asignaciones/boton-entregar-equipo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEsComputador } from '@/hooks/use-es-computador';
import { rutaUnirse } from '@/lib/asignaciones/codigo';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';

export interface CodigoParaEnviar {
  /** Id de la asignación: permite entregar este computador al estudiante (modo presencial). */
  id: string;
  codigo: string;
  expiraEn: string;
  estudiante: { id: string; nombre: string; correo: string | null };
  caso: string;
}

const sinSuscripcion = () => () => {};

/** Origen del sitio en el navegador (en el servidor no se conoce: se usa la ruta relativa). */
function useOrigen() {
  return useSyncExternalStore(
    sinSuscripcion,
    () => window.location.origin,
    () => ''
  );
}

/**
 * Mensaje que se comparte por WhatsApp, correo u otra aplicación. Es lo primero que lee el
 * estudiante, muchas veces en el celular: dice antes que nada dónde abrirlo y las dos reglas que
 * pueden hacerle perder la práctica (un solo uso y el cierre por inactividad).
 */
export function mensajeParaEstudiante(
  datos: Pick<CodigoParaEnviar, 'codigo' | 'expiraEn' | 'caso'> & {
    estudiante: { nombre: string };
  },
  enlace: string
): string {
  const nombre = datos.estudiante.nombre.split(' ')[0];
  return [
    `Hola, ${nombre}. Te asigné una práctica en PsySim: ${datos.caso}.`,
    '',
    'Ábrela en un computador con teclado y ratón (la simulación no funciona en el celular):',
    enlace,
    '',
    'Entra con el botón Continuar con Google y tu correo @correounivalle.edu.co.',
    '',
    `El código ${datos.codigo} es de un solo uso y vence el ${formatearFechaHora(datos.expiraEn)}.`,
    'Cuando lo uses, empieza enseguida: si pasan 10 minutos sin actividad, la práctica se cierra y el código deja de servir.',
  ].join('\n');
}

/**
 * Resultado de configurar la sesión: el código de acceso para enviar al estudiante, con el
 * enlace directo, listos para copiar o compartir.
 */
export function CodigoGenerado({
  datos,
  onCerrar,
}: {
  datos: CodigoParaEnviar | null;
  onCerrar: () => void;
}) {
  const origen = useOrigen();
  const esComputador = useEsComputador();
  const titulo = useRef<HTMLHeadingElement>(null);
  if (!datos) return null;

  const primerNombre = datos.estudiante.nombre.split(' ')[0];
  const enlace = `${origen}${rutaUnirse(datos.codigo)}`;
  const mensaje = mensajeParaEstudiante(datos, enlace);

  return (
    <Dialog open onOpenChange={abierto => !abierto && onCerrar()}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        onOpenAutoFocus={evento => {
          evento.preventDefault();
          titulo.current?.focus();
        }}
        onCloseAutoFocus={evento => evento.preventDefault()}
        onKeyDown={evento => {
          // Un tooltip en salida puede capturar Escape antes que Radix cierre el diálogo.
          if (
            evento.key === 'Escape' &&
            evento.target instanceof Node &&
            evento.currentTarget.contains(evento.target)
          ) {
            evento.preventDefault();
            evento.stopPropagation();
            onCerrar();
          }
        }}
      >
        <DialogHeader className="border-b bg-muted/35 px-5 py-4 pr-12 text-left sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro"
            >
              <CheckCircle2 className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle ref={titulo} tabIndex={-1}>
                Código listo para {primerNombre}
              </DialogTitle>
              <DialogDescription>
                Sirve una sola vez, solo con la cuenta de {primerNombre}, hasta el{' '}
                {formatearFechaHora(datos.expiraEn)}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Bloque principal del código: protagonista visual con acción de copiar al lado. */}
          <div className="flex flex-col gap-4 rounded-2xl border border-laton/25 vetas-nogal p-5 text-lino sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sidebar-muted">
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-sidebar-foreground">
                <KeyRound className="size-4 shrink-0 text-laton" aria-hidden />
                <span className="truncate">{datos.caso}</span>
              </span>
              <span className="shrink-0 rounded-full bg-lino/12 px-2.5 py-0.5 text-sidebar-foreground">
                Un solo uso
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-lino/15 pt-5 pb-1">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-sidebar-muted">Código de acceso</p>
                <p
                  data-testid="codigo-acceso"
                  className="mt-1 font-mono text-[1.75rem] leading-none font-bold tracking-[0.14em] text-lino select-all sm:text-[2.35rem]"
                >
                  {datos.codigo}
                </p>
              </div>
              <BotonCopiar
                soloIcono
                texto={datos.codigo}
                etiqueta="Copiar código"
                variant="outline"
                size="icon-lg"
                className="shrink-0 border-lino/35 bg-lino/12 text-lino shadow-none hover:border-lino/65 hover:bg-lino/22 hover:text-lino"
              />
            </div>
          </div>

          {/* Enlace directo con su acción de copiar integrada a la derecha del campo. */}
          <div className="flex flex-col gap-2 rounded-xl border bg-muted/25 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Link2 className="size-4 text-salvia" aria-hidden />
                Enlace directo
              </p>
              <span className="text-xs text-muted-foreground">
                Abre la práctica en un computador
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card py-1.5 pr-1.5 pl-3.5">
              <p
                title={enlace}
                className="min-w-0 flex-1 truncate font-mono text-xs text-foreground select-all"
              >
                {enlace}
              </p>
              <BotonCopiar
                soloIcono
                texto={enlace}
                etiqueta="Copiar enlace"
                variant="outline"
                size="icon"
                className="min-h-10 min-w-10 shrink-0 sm:min-h-9 sm:min-w-9"
              />
            </div>
          </div>

          {/* Envío guiado: concentra WhatsApp, correo y copia del mensaje con reglas. */}
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-salvia-oscuro"
              >
                <Send className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Enviar instrucciones a {primerNombre}
                </p>
                <p className="text-xs leading-snug text-muted-foreground">
                  Mensaje listo con enlace, código y reglas para WhatsApp o correo.
                </p>
              </div>
            </div>
            <BotonCompartir
              etiqueta="Compartir"
              variant="default"
              asunto={`Tu práctica en PsySim: ${datos.caso}`}
              mensaje={mensaje}
              correo={datos.estudiante.correo}
              textoCopiable={mensaje}
              className="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto"
            />
          </div>

          {esComputador === true && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-input/70 bg-muted/30 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">¿Practica aquí ahora?</p>
                <p className="text-xs leading-snug text-muted-foreground">
                  Cierra tu sesión y entrega este computador a {primerNombre}.
                </p>
              </div>
              <BotonEntregarEquipo
                asignacionId={datos.id}
                estudiante={datos.estudiante.nombre}
                size="default"
                variant="outline"
                className="min-h-11 shrink-0 bg-card sm:min-h-9"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button variant="ghost" asChild>
            <Link href={`/estudiantes/${datos.estudiante.id}`}>
              Ver ficha de {primerNombre}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button variant="accion" onClick={onCerrar}>
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
