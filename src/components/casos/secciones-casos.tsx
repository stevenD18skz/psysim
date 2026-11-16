'use client';

import { useState } from 'react';

import { BibliotecaCasos, type UsoCaso } from '@/components/casos/biblioteca-casos';
import { BotonSeccion } from '@/components/comun/boton-seccion';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { cn } from '@/lib/utils';
import { type EscenarioCatalogo } from '@/types';

type Seccion = 'propios' | 'predefinidos';

/**
 * Biblioteca con dos secciones que se alternan, igual que al asignar una práctica: «Mis casos»
 * primero y «Casos predefinidos» después, sin mostrar ambas a la vez.
 */
export function SeccionesCasos({
  propios,
  predefinidos,
  uso,
  vacioPropios,
  inicial,
}: {
  propios: EscenarioCatalogo[];
  predefinidos: EscenarioCatalogo[];
  uso: Readonly<Record<string, UsoCaso>>;
  /** Mensaje de «Mis casos» cuando no hay ninguno que mostrar. */
  vacioPropios: React.ReactNode;
  inicial: Seccion;
}) {
  const [seccion, setSeccion] = useState<Seccion>(inicial);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PistaSegmentada
          role="group"
          aria-label="Secciones de casos"
          className="inline-flex w-fit items-center gap-1 rounded-xl border bg-muted/55 p-1"
          claseIndicador="rounded-lg bg-card shadow-xs"
        >
          <BotonSeccion
            activa={seccion === 'propios'}
            onClick={() => setSeccion('propios')}
            cantidad={propios.length}
          >
            Mis casos
          </BotonSeccion>
          <BotonSeccion
            activa={seccion === 'predefinidos'}
            onClick={() => setSeccion('predefinidos')}
            cantidad={predefinidos.length}
          >
            Casos predefinidos
          </BotonSeccion>
        </PistaSegmentada>
        <p className="text-sm text-muted-foreground">
          {seccion === 'propios'
            ? 'Los pacientes que diseñaste tú. Puedes crearlos desde cero o a partir de un caso predefinido.'
            : 'Catálogo de PsySim: pacientes clínicos y cotidianos listos para asignar. A partir de cualquiera puedes crear tu versión.'}
        </p>
      </div>

      <div
        // Al cambiar de sección, la lista entra desde el lado hacia el que se movió la pista.
        key={seccion}
        className={cn(
          'motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0',
          seccion === 'propios'
            ? 'motion-safe:slide-in-from-left-4'
            : 'motion-safe:slide-in-from-right-4'
        )}
      >
        {seccion === 'propios' ? (
          <BibliotecaCasos casos={propios} uso={uso} vacio={vacioPropios} />
        ) : predefinidos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-input/50 px-5 py-6 text-sm text-muted-foreground">
            Ningún caso predefinido coincide con los filtros.
          </p>
        ) : (
          <BibliotecaCasos casos={predefinidos} uso={uso} />
        )}
      </div>
    </div>
  );
}
