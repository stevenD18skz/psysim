'use client';

import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  Coffee,
  HeartPulse,
  MessageSquareQuote,
  Target,
  UserRound,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { Button } from '@/components/ui/button';
import {
  ESCENARIOS_PUBLICOS,
  type EscenarioPublico,
  NIVELES_PUBLICOS,
} from '@/lib/landing/escenarios';
import { cn } from '@/lib/utils';

/**
 * Galería de escenarios: tarjetas con la captura de cada consultorio. Al elegir una se abre un
 * detalle con el paciente, la competencia que se entrena y su primera frase.
 */
export function EscenariosGaleria() {
  const [abierto, setAbierto] = useState<number | null>(null);
  const total = ESCENARIOS_PUBLICOS.length;
  const actual = abierto === null ? null : (ESCENARIOS_PUBLICOS[abierto] ?? null);

  const mover = (paso: number) =>
    setAbierto(indice => (indice === null ? null : (indice + paso + total) % total));

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ESCENARIOS_PUBLICOS.map((escenario, indice) => (
          <li key={escenario.codigo} className="flex">
            <TarjetaEscenarioPublico escenario={escenario} onAbrir={() => setAbierto(indice)} />
          </li>
        ))}
      </ul>

      <DialogPrimitive.Root open={actual !== null} onOpenChange={abre => !abre && setAbierto(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          {actual && (
            <DialogPrimitive.Content
              onKeyDown={evento => {
                if (evento.key === 'ArrowLeft') mover(-1);
                if (evento.key === 'ArrowRight') mover(1);
              }}
              className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-card shadow-2xl ring-1 ring-foreground/10 duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            >
              <DetalleEscenario
                escenario={actual}
                onAnterior={() => mover(-1)}
                onSiguiente={() => mover(1)}
              />
            </DialogPrimitive.Content>
          )}
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function IconoCategoria({ categoria, className }: { categoria: string; className?: string }) {
  const Icono = categoria === 'Clínico' ? HeartPulse : Coffee;
  return <Icono className={className} aria-hidden />;
}

function NivelPuntos({ nivel }: { nivel: 1 | 2 | 3 }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map(paso => (
          <span
            key={paso}
            className={cn('h-3 w-1.5 rounded-full', paso <= nivel ? 'bg-primary' : 'bg-border')}
          />
        ))}
      </span>
      {NIVELES_PUBLICOS[nivel]}
    </span>
  );
}

function TarjetaEscenarioPublico({
  escenario,
  onAbrir,
}: {
  escenario: EscenarioPublico;
  onAbrir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-haspopup="dialog"
      aria-label={`${escenario.codigo}: ${escenario.titulo}. Ver detalle del escenario`}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-xs transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="relative block aspect-16/10 overflow-hidden bg-muted">
        <Image
          src={escenario.imagen.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent"
        />
        <span className="absolute top-3 left-3 rounded-md bg-white/90 px-2 py-0.5 font-mono text-xs font-medium text-neutral-900">
          {escenario.codigo}
        </span>
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-neutral-900">
          <IconoCategoria categoria={escenario.categoria} className="size-3" />
          {escenario.categoria}
        </span>
        <span className="absolute bottom-3 left-4 flex items-center gap-1.5 text-sm font-medium text-white">
          <UserRound className="size-4" aria-hidden />
          {escenario.paciente.nombre}, {escenario.paciente.edad} años
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-3 p-5">
        <span className="font-heading text-xl font-semibold">{escenario.titulo}</span>
        <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {escenario.resumen}
        </span>
        <span className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-dashed pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="size-4 shrink-0 text-primary" aria-hidden />
            {escenario.competencia}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            Ver detalle
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </span>
      </span>
    </button>
  );
}

function DetalleEscenario({
  escenario,
  onAnterior,
  onSiguiente,
}: {
  escenario: EscenarioPublico;
  onAnterior: () => void;
  onSiguiente: () => void;
}) {
  return (
    <>
      <div className="relative h-[34dvh] min-h-44 bg-muted">
        <Image
          src={escenario.imagen.src}
          alt={escenario.imagen.alt}
          fill
          sizes="(min-width: 896px) 896px, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/65 via-transparent to-black/20"
        />
        <DialogPrimitive.Close asChild>
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-3 right-3 rounded-full bg-white/90 text-neutral-900 hover:bg-white"
            aria-label="Cerrar el detalle"
          >
            <X aria-hidden />
          </Button>
        </DialogPrimitive.Close>
        <div className="absolute bottom-4 left-5 flex flex-wrap items-center gap-2 text-white">
          <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-xs font-medium text-neutral-900">
            {escenario.codigo}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
            <IconoCategoria categoria={escenario.categoria} className="size-3" />
            {escenario.categoria}
          </span>
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <DialogPrimitive.Title className="font-heading text-3xl leading-tight font-semibold">
              {escenario.titulo}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="leading-relaxed text-muted-foreground">
              {escenario.resumen}
            </DialogPrimitive.Description>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <DatoDetalle icono={<Target />} etiqueta="Competencia que se entrena">
              {escenario.competencia}
            </DatoDetalle>
            <DatoDetalle icono={<HeartPulse />} etiqueta="Nivel de complejidad">
              <NivelPuntos nivel={escenario.nivel} />
            </DatoDetalle>
            <DatoDetalle icono={<Armchair />} etiqueta="Entorno 3D">
              {escenario.consultorio}
            </DatoDetalle>
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          <section
            aria-label="Paciente virtual"
            className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <UserRound className="size-5" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="font-heading text-lg font-semibold">{escenario.paciente.nombre}</p>
                <p className="text-sm text-muted-foreground">{escenario.paciente.edad} años</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{escenario.paciente.perfil}</p>
          </section>

          <figure className="rounded-2xl border border-l-4 border-l-primary bg-card p-5">
            <figcaption className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <MessageSquareQuote className="size-4 text-primary" aria-hidden />
              Primera frase del paciente
            </figcaption>
            <blockquote className="font-heading text-lg leading-snug">
              «{escenario.paciente.apertura}»
            </blockquote>
          </figure>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onAnterior}>
            <ArrowLeft aria-hidden />
            Anterior
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onSiguiente}>
            Siguiente
            <ArrowRight aria-hidden />
          </Button>
        </div>
        <Button asChild>
          <Link href="/login">
            Ingresar como docente
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </>
  );
}

function DatoDetalle({
  icono,
  etiqueta,
  children,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase [&_svg]:size-3.5 [&_svg]:text-primary">
        {icono}
        {etiqueta}
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
