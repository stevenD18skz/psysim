import Image from 'next/image';

import { ESCENARIOS_PUBLICOS } from '@/lib/landing/escenarios';

const [duelo, ansiedad] = ESCENARIOS_PUBLICOS;

/**
 * Composición del hero: captura real de la simulación 3D y, encima, dos citas de pacientes
 * virtuales ligeramente giradas. Las frases son las de apertura de cada caso.
 */
export function HeroVisual() {
  if (!duelo || !ansiedad) return null;

  return (
    <div className="relative mx-auto flex w-full max-w-xl flex-col gap-3 sm:block sm:pt-6 sm:pb-12 lg:max-w-none">
      {/* Halo de color detrás de la captura */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-linear-to-br from-marca/15 via-accent to-transparent blur-2xl"
      />

      <figure className="overflow-hidden rounded-3xl border bg-card shadow-2xl ring-1 ring-black/5">
        <div className="relative aspect-16/10">
          <Image
            src={duelo.imagen.src}
            alt={duelo.imagen.alt}
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            Sesión en curso · {duelo.codigo}
          </div>
        </div>
        <figcaption className="border-t px-4 py-2.5 text-right text-xs text-muted-foreground">
          Captura real de la simulación 3D · {duelo.titulo}
        </figcaption>
      </figure>

      <CitaPaciente
        className="sm:top-0 sm:-right-4 sm:rotate-3 lg:-right-8"
        iniciales="ML"
        nombre={duelo.paciente.nombre}
        edad={duelo.paciente.edad}
        escenario={`${duelo.codigo} · ${duelo.titulo}`}
        frase={duelo.paciente.apertura}
      />
      <CitaPaciente
        className="sm:bottom-0 sm:-left-4 sm:-rotate-2 lg:-left-8"
        iniciales="AF"
        nombre={ansiedad.paciente.nombre}
        edad={ansiedad.paciente.edad}
        escenario={`${ansiedad.codigo} · ${ansiedad.titulo}`}
        frase={ansiedad.paciente.apertura}
      />
    </div>
  );
}

interface CitaPacienteProps {
  className: string;
  iniciales: string;
  nombre: string;
  edad: number;
  escenario: string;
  frase: string;
}

function CitaPaciente({ className, iniciales, nombre, edad, escenario, frase }: CitaPacienteProps) {
  return (
    <figure
      className={`relative rounded-2xl border bg-card/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur sm:absolute sm:w-60 lg:w-64 ${className}`}
    >
      <blockquote className="font-heading text-[15px] leading-snug">«{frase}»</blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5 border-t pt-3">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {iniciales}
        </span>
        <span className="grid leading-tight">
          <span className="text-sm font-medium">
            {nombre}, {edad} años
          </span>
          <span className="text-xs text-muted-foreground">{escenario}</span>
        </span>
      </figcaption>
    </figure>
  );
}
