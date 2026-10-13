'use client';

import { ArrowRight, KeyRound, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { BotonCompartir } from '@/components/asignaciones/boton-compartir';
import { BotonCopiar } from '@/components/asignaciones/boton-copiar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { rutaUnirse } from '@/lib/asignaciones/codigo';
import { formatearFechaHora } from '@/lib/estudiantes/estudiantes';

export interface CodigoParaEnviar {
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

/** Mensaje que se comparte por WhatsApp, correo u otra aplicación. */
export function mensajeParaEstudiante(datos: CodigoParaEnviar, enlace: string): string {
  const nombre = datos.estudiante.nombre.split(' ')[0];
  return [
    `Hola, ${nombre}. Tu simulación en PsySim («${datos.caso}») está lista.`,
    `Entra a ${enlace} con tu correo institucional («Continuar con Google»).`,
    `También puedes escribir el código ${datos.codigo} en «Mis prácticas».`,
    `El código vence el ${formatearFechaHora(datos.expiraEn)}.`,
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
  if (!datos) return null;

  const enlace = `${origen}${rutaUnirse(datos.codigo)}`;

  return (
    <Dialog open onOpenChange={abierto => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Código de acceso listo</DialogTitle>
          <DialogDescription>
            Envíaselo a {datos.estudiante.nombre}. Solo funciona con su cuenta y una sola vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-accent/40 px-4 py-6 text-center">
          <KeyRound className="size-5 text-primary" aria-hidden />
          <p
            data-testid="codigo-acceso"
            className="font-mono text-3xl font-semibold tracking-[0.12em] select-all sm:text-4xl"
          >
            {datos.codigo}
          </p>
          <p className="text-sm text-muted-foreground">
            {datos.caso} · vence el {formatearFechaHora(datos.expiraEn)}
          </p>
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

        <div className="flex flex-wrap gap-2">
          <BotonCopiar texto={datos.codigo} etiqueta="Copiar código" variant="default" />
          <BotonCopiar texto={enlace} etiqueta="Copiar enlace" />
          <BotonCompartir
            asunto={`Tu simulación en PsySim: ${datos.caso}`}
            mensaje={mensajeParaEstudiante(datos, enlace)}
            correo={datos.estudiante.correo}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" asChild>
            <Link href={`/estudiantes/${datos.estudiante.id}`}>
              Ver al estudiante
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button onClick={onCerrar}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
