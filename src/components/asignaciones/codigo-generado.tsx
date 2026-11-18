'use client';

import { ArrowRight, KeyRound, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { BotonCompartir } from '@/components/asignaciones/boton-compartir';
import { BotonCopiar } from '@/components/asignaciones/boton-copiar';
import { BotonEntregarEquipo } from '@/components/asignaciones/boton-entregar-equipo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  if (!datos) return null;

  const primerNombre = datos.estudiante.nombre.split(' ')[0];
  const enlace = `${origen}${rutaUnirse(datos.codigo)}`;
  const mensaje = mensajeParaEstudiante(datos, enlace);

  return (
    <Dialog open onOpenChange={abierto => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Código listo para {primerNombre}</DialogTitle>
          <DialogDescription>
            Sirve una sola vez, solo con la cuenta de {primerNombre}, hasta el{' '}
            {formatearFechaHora(datos.expiraEn)}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 rounded-xl vetas-nogal px-4 py-6 text-center text-lino">
          <KeyRound className="size-5 text-laton" aria-hidden />
          <p
            data-testid="codigo-acceso"
            className="font-mono text-3xl font-semibold tracking-[0.12em] select-all sm:text-4xl"
          >
            {datos.codigo}
          </p>
          <p className="text-sm text-sidebar-muted">{datos.caso}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Link2 className="size-4 text-muted-foreground" aria-hidden />
            Enlace directo
          </p>
          <p className="truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs select-all">
            {enlace}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <BotonCopiar
            texto={datos.codigo}
            etiqueta="Copiar código"
            variant="outline"
            className="w-full"
          />
          <BotonCopiar
            texto={enlace}
            etiqueta="Copiar enlace"
            variant="outline"
            className="w-full"
          />
          <BotonCompartir
            etiqueta="Compartir"
            asunto={`Tu práctica en PsySim: ${datos.caso}`}
            mensaje={mensaje}
            correo={datos.estudiante.correo}
            textoCopiable={mensaje}
            className="w-full"
          />
        </div>

        {esComputador === true && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-input/70 bg-muted/35 p-3.5 sm:flex-row sm:items-center sm:justify-between">
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
              className="shrink-0 bg-card"
            />
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" asChild>
            <Link href={`/estudiantes/${datos.estudiante.id}`}>
              Ver ficha de {primerNombre}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button variant="accion" onClick={onCerrar}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
