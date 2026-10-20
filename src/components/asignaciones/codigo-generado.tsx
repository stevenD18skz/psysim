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
    `Hola, ${nombre}. Te asigné una práctica en PsySim: «${datos.caso}».`,
    '',
    'Ábrela en un computador con teclado y ratón (la simulación no funciona en el celular):',
    enlace,
    '',
    'Entra con tu correo @correounivalle.edu.co («Continuar con Google»).',
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
  if (!datos) return null;

  const enlace = `${origen}${rutaUnirse(datos.codigo)}`;

  return (
    <Dialog open onOpenChange={abierto => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Código listo para {datos.estudiante.nombre.split(' ')[0]}</DialogTitle>
          <DialogDescription>
            Sirve una sola vez, solo con la cuenta de {datos.estudiante.nombre.split(' ')[0]}, hasta
            el {formatearFechaHora(datos.expiraEn)}.
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

        <div className="flex flex-wrap gap-2">
          <BotonCompartir
            etiqueta="Compartir"
            asunto={`Tu práctica en PsySim: ${datos.caso}`}
            mensaje={mensajeParaEstudiante(datos, enlace)}
            correo={datos.estudiante.correo}
          />
          <BotonCopiar
            texto={() => mensajeParaEstudiante(datos, enlace)}
            etiqueta="Copiar mensaje"
          />
          <BotonCopiar texto={enlace} etiqueta="Copiar enlace" variant="ghost" />
          <BotonEntregarEquipo
            asignacionId={datos.id}
            estudiante={datos.estudiante.nombre}
            size="default"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" asChild>
            <Link href={`/estudiantes/${datos.estudiante.id}`}>
              Ver ficha de {datos.estudiante.nombre.split(' ')[0]}
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
