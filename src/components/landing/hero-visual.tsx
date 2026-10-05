'use client';

import Image from 'next/image';

import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { useRotacion } from '@/components/landing/use-rotacion';
import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';
import { cn } from '@/lib/utils';

const INTERVALO_MS = 6000;

/**
 * Composición del hero: capturas reales de la simulación 3D que van rotando entre los seis
 * escenarios y, encima, dos citas de pacientes ligeramente giradas (el paciente del escenario
 * visible y el del siguiente). Se detiene al pasar el cursor o enfocar los controles.
 */
export function HeroVisual() {
  const total = ESCENARIOS_PUBLICOS.length;
  const { indice, setIndice, setPausado } = useRotacion(total, INTERVALO_MS);

  const actual = ESCENARIOS_PUBLICOS[indice];
  const siguiente = ESCENARIOS_PUBLICOS[(indice + 1) % total];
  if (!actual || !siguiente) return null;

  return (
    <div
      className="relative mx-auto flex w-full max-w-xl flex-col gap-3 sm:block sm:pt-6 sm:pb-12 lg:max-w-none"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {/* Halo de color detrás de la captura */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-linear-to-br from-marca/15 via-accent to-transparent blur-2xl"
      />

      <figure className="overflow-hidden rounded-3xl border bg-card shadow-2xl ring-1 ring-black/5">
        <div className="relative aspect-16/10 bg-muted">
          {ESCENARIOS_PUBLICOS.map((escenario, i) => (
            <Image
              key={escenario.codigo}
              src={escenario.imagen.src}
              alt={i === indice ? escenario.imagen.alt : ''}
              aria-hidden={i === indice ? undefined : true}
              fill
              priority={i === 0}
              loading="eager"
              sizes="(min-width: 1024px) 560px, 100vw"
              className={cn(
                'object-cover transition-opacity duration-700 ease-in-out',
                i === indice ? 'opacity-100' : 'opacity-0'
              )}
            />
          ))}
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            Sesión en curso · {actual.codigo}
          </div>
        </div>
        <figcaption className="flex items-center justify-end gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span className="hidden truncate sm:inline">
            Captura real de la simulación 3D · {actual.titulo}
          </span>
          <div role="group" aria-label="Elegir escenario" className="flex items-center gap-1">
            {ESCENARIOS_PUBLICOS.map((escenario, i) => (
              <button
                key={escenario.codigo}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver ${escenario.codigo}: ${escenario.titulo}`}
                aria-current={i === indice ? 'true' : undefined}
                className="flex size-5 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full transition-[width,background-color] duration-300',
                    i === indice ? 'w-5 bg-primary' : 'w-1.5 bg-border'
                  )}
                />
              </button>
            ))}
          </div>
        </figcaption>
      </figure>

      <CitaPaciente
        key={`a-${actual.codigo}`}
        className="sm:top-0 sm:-right-4 sm:rotate-3 lg:-right-8"
        escenario={actual}
      />
      <CitaPaciente
        key={`b-${siguiente.codigo}`}
        className="sm:bottom-0 sm:-left-4 sm:-rotate-2 lg:-left-8"
        escenario={siguiente}
      />
    </div>
  );
}

function CitaPaciente({
  className,
  escenario,
}: {
  className: string;
  escenario: (typeof ESCENARIOS_PUBLICOS)[number];
}) {
  const { paciente } = escenario;
  return (
    <figure
      className={cn(
        'relative rounded-2xl border bg-card/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur sm:absolute sm:w-60 lg:w-64',
        'motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0',
        className
      )}
    >
      <blockquote className="font-heading text-[15px] leading-snug">
        «{paciente.apertura}»
      </blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5 border-t pt-3">
        <AvatarPaciente src={paciente.foto} nombre={paciente.nombre} className="size-9 text-xs" />
        <span className="grid leading-tight">
          <span className="text-sm font-medium">
            {paciente.nombre}, {paciente.edad} años
          </span>
          <span className="text-xs text-muted-foreground">
            {escenario.codigo} · {escenario.titulo}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
