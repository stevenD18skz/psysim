'use client';

import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { BibliotecaCasos, type UsoCaso } from '@/components/casos/biblioteca-casos';
import { BotonSeccion } from '@/components/comun/boton-seccion';
import { EstadoVacio } from '@/components/comun/estado-vacio';
import { PaginacionLocal } from '@/components/comun/paginacion';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { Button } from '@/components/ui/button';
import { paginar } from '@/lib/listas';
import { cn } from '@/lib/utils';
import { type EscenarioCatalogo } from '@/types';

type Seccion = 'propios' | 'predefinidos';

const CASOS_POR_PAGINA = 12;

/**
 * Biblioteca con dos secciones que se alternan, igual que al asignar una práctica: «Mis casos»
 * primero y «Casos predefinidos» después, sin mostrar ambas a la vez. Pagina cada sección de 12
 * en 12 cuando crece el catálogo.
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
  const [pagina, setPagina] = useState(1);

  const activos = seccion === 'propios' ? propios : predefinidos;
  const resultado = paginar(activos, pagina, CASOS_POR_PAGINA);

  const cambiarSeccion = (nueva: Seccion) => {
    setSeccion(nueva);
    setPagina(1);
  };

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
            onClick={() => cambiarSeccion('propios')}
            cantidad={propios.length}
          >
            Mis casos
          </BotonSeccion>
          <BotonSeccion
            activa={seccion === 'predefinidos'}
            onClick={() => cambiarSeccion('predefinidos')}
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
          'flex flex-col gap-5 motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-salida motion-safe:fade-in-0',
          seccion === 'propios'
            ? 'motion-safe:slide-in-from-left-4'
            : 'motion-safe:slide-in-from-right-4'
        )}
      >
        {seccion === 'propios' ? (
          <>
            <BibliotecaCasos casos={resultado.visibles} uso={uso} vacio={vacioPropios} />
            <PaginacionLocal
              pagina={resultado}
              onCambiar={setPagina}
              sustantivo={['caso', 'casos']}
              soloSiHayVarias
            />
          </>
        ) : predefinidos.length === 0 ? (
          <EstadoVacio
            icono={SearchX}
            titulo="Ningún caso predefinido coincide con los filtros"
            descripcion="Prueba con otro criterio o limpia los filtros para explorar los 12 casos oficiales."
            accion={
              <Button asChild size="sm" variant="outline">
                <Link href="/configuracion/casos">Quitar filtros</Link>
              </Button>
            }
          />
        ) : (
          <>
            <BibliotecaCasos casos={resultado.visibles} uso={uso} />
            <PaginacionLocal
              pagina={resultado}
              onCambiar={setPagina}
              sustantivo={['caso', 'casos']}
              soloSiHayVarias
            />
          </>
        )}
      </div>
    </div>
  );
}
