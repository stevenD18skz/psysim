'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';
import { cn } from '@/lib/utils';

/**
 * Panel izquierdo del login (solo en escritorio): el consultorio real visto a través del vano de la
 * puerta, sobre el nogal, con la primera frase de su paciente. No rota solo: la persona elige qué
 * consultorio ver (así nada se mueve sin que lo pida).
 */
export function PanelMarca() {
  const [indice, setIndice] = useState(0);
  const actual = ESCENARIOS_PUBLICOS[indice];

  return (
    <aside className="relative isolate hidden flex-col justify-between gap-10 overflow-hidden vetas-nogal px-12 py-10 text-sidebar-foreground lg:flex">
      <Link
        href="/"
        className="w-fit rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-laton"
      >
        <MarcaPsySim className="h-9" />
      </Link>

      {actual && (
        <div className="flex flex-col items-start gap-8">
          {/* El vano de la puerta del consultorio. */}
          <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-t-[999px] border-[3px] border-laton shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
            {ESCENARIOS_PUBLICOS.map((escenario, i) => (
              <Image
                key={escenario.codigo}
                src={escenario.imagen.src}
                alt={i === indice ? escenario.imagen.alt : ''}
                aria-hidden={i === indice ? undefined : true}
                fill
                priority={i === 0}
                sizes="400px"
                className={cn(
                  'object-cover transition-opacity duration-700 ease-in-out',
                  i === indice ? 'opacity-100' : 'opacity-0'
                )}
              />
            ))}
          </div>

          <figure className="max-w-md">
            <blockquote className="text-xl leading-snug font-medium text-balance">
              «{actual.paciente.apertura}»
            </blockquote>
            <figcaption className="mt-3 text-sm text-sidebar-muted">
              {actual.paciente.nombre}, {actual.paciente.edad} años · {actual.codigo}{' '}
              {actual.titulo}
            </figcaption>
          </figure>

          <div role="group" aria-label="Elegir consultorio" className="-ml-2.5 flex items-center">
            {ESCENARIOS_PUBLICOS.map((escenario, i) => (
              <button
                key={escenario.codigo}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver ${escenario.codigo}: ${escenario.titulo}`}
                aria-current={i === indice ? 'true' : undefined}
                className="flex size-7 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-laton focus-visible:outline-hidden"
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full transition-[width,background-color] duration-300',
                    i === indice ? 'w-6 bg-laton' : 'w-1.5 bg-lino/40'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-center gap-3 text-sm text-sidebar-muted">
        <span className="rounded-md bg-white p-1">
          <LogoUnivalle className="h-7" />
        </span>
        Un proyecto de grado de la Universidad del Valle
      </p>
    </aside>
  );
}
