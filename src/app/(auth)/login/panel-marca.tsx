'use client';

import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

import { LogoUnivalle } from '@/components/layout/logo-univalle';
import { useRotacion } from '@/components/landing/use-rotacion';
import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';
import { cn } from '@/lib/utils';

const INTERVALO_MS = 7000;

const PUNTOS = [
  'Seis escenarios clínicos y cotidianos, o los casos que tú crees.',
  'Un paciente virtual con IA que responde en lenguaje natural.',
  'Duración, intervenciones y tiempos de respuesta de cada sesión.',
] as const;

/**
 * Panel izquierdo del login: la simulación de fondo (rota entre los escenarios), lo que ofrece
 * la plataforma y la primera frase del paciente que se está viendo.
 */
export function PanelMarca() {
  const total = ESCENARIOS_PUBLICOS.length;
  const { indice, setIndice, setPausado } = useRotacion(total, INTERVALO_MS);
  const actual = ESCENARIOS_PUBLICOS[indice];

  return (
    <aside
      className="relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-neutral-950 px-6 py-8 text-white lg:px-12 lg:py-12"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {ESCENARIOS_PUBLICOS.map((escenario, i) => (
        <Image
          key={escenario.codigo}
          src={escenario.imagen.src}
          alt=""
          fill
          priority={i === 0}
          loading="eager"
          sizes="(min-width: 1024px) 55vw, 100vw"
          className={cn(
            '-z-20 object-cover transition-opacity duration-1000 ease-in-out',
            i === indice ? 'opacity-70' : 'opacity-0'
          )}
        />
      ))}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-black/80 via-black/45 to-black/85"
      />

      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-white p-2 shadow-lg">
          <LogoUnivalle className="h-10" />
        </span>
        <span className="grid leading-tight">
          <span className="font-heading text-2xl font-semibold">PsySim</span>
          <span className="text-xs text-white/70">Simulador de escenarios psicológicos</span>
        </span>
      </div>

      <div className="hidden max-w-lg flex-col gap-8 lg:flex">
        <p className="font-heading text-4xl leading-tight font-semibold text-balance">
          Practica la entrevista clínica antes de la consulta real.
        </p>
        <ul className="flex flex-col gap-3">
          {PUNTOS.map(punto => (
            <li key={punto} className="flex items-start gap-3 text-white/85">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-white" aria-hidden />
              {punto}
            </li>
          ))}
        </ul>
      </div>

      {actual && (
        <div className="hidden flex-col gap-4 lg:flex">
          <figure
            key={actual.codigo}
            className="max-w-md rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in-0"
          >
            <blockquote className="font-heading text-lg leading-snug">
              «{actual.paciente.apertura}»
            </blockquote>
            <figcaption className="mt-3 text-sm text-white/70">
              {actual.paciente.nombre}, {actual.paciente.edad} años · {actual.codigo},{' '}
              {actual.titulo}
            </figcaption>
          </figure>
          <div role="group" aria-label="Elegir escenario" className="flex items-center gap-1">
            {ESCENARIOS_PUBLICOS.map((escenario, i) => (
              <button
                key={escenario.codigo}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver ${escenario.codigo}: ${escenario.titulo}`}
                aria-current={i === indice ? 'true' : undefined}
                className="flex size-5 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full transition-[width,background-color] duration-300',
                    i === indice ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
