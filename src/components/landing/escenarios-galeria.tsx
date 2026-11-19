'use client';

import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  Coffee,
  HeartPulse,
  MessageSquareQuote,
  Target,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { IndicadorNivel, InsigniaCategoria } from '@/components/casos/insignias-caso';
import { PistaSegmentada } from '@/components/comun/pista-segmentada';
import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { Button } from '@/components/ui/button';
import {
  type CategoriaPublica,
  ESCENARIOS_PUBLICOS,
  type EscenarioPublico,
  NIVELES_PUBLICOS,
} from '@/lib/landing/escenarios';
import { cn } from '@/lib/utils';
import { type CategoriaEscenario, type DificultadEscenario } from '@/types';

type FiltroCategoria = 'todos' | CategoriaPublica;

/**
 * Galería de los doce casos públicos: tarjetas con silueta en arco continua (sin esquinas blancas
 * detrás del vano) y filtro segmentado por enfoque. Al elegir un caso se abre su ficha completa.
 */
export function EscenariosGaleria() {
  const [filtro, setFiltro] = useState<FiltroCategoria>('todos');
  const [abiertoCodigo, setAbiertoCodigo] = useState<string | null>(null);

  const totalTodos = ESCENARIOS_PUBLICOS.length;
  const totalClinico = ESCENARIOS_PUBLICOS.filter(e => e.categoria === 'Clínico').length;
  const totalCotidiano = ESCENARIOS_PUBLICOS.filter(e => e.categoria === 'Cotidiano').length;

  const visibles =
    filtro === 'todos'
      ? ESCENARIOS_PUBLICOS
      : ESCENARIOS_PUBLICOS.filter(e => e.categoria === filtro);

  const indiceActual =
    abiertoCodigo === null ? -1 : visibles.findIndex(e => e.codigo === abiertoCodigo);
  const actual = indiceActual >= 0 ? (visibles[indiceActual] ?? null) : null;

  const mover = (paso: number) => {
    if (indiceActual < 0 || visibles.length === 0) return;
    const siguiente = (indiceActual + paso + visibles.length) % visibles.length;
    setAbiertoCodigo(visibles[siguiente]?.codigo ?? null);
  };

  const opciones: readonly { valor: FiltroCategoria; etiqueta: string; total: number }[] = [
    { valor: 'todos', etiqueta: 'Todos', total: totalTodos },
    { valor: 'Clínico', etiqueta: 'Clínico', total: totalClinico },
    { valor: 'Cotidiano', etiqueta: 'Cotidiano', total: totalCotidiano },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PistaSegmentada
          role="group"
          aria-label="Filtrar casos por tipo"
          claseIndicador="rounded-lg bg-nogal shadow-xs"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1"
        >
          {opciones.map(op => {
            const seleccionado = filtro === op.valor;
            return (
              <button
                key={op.valor}
                type="button"
                aria-pressed={seleccionado}
                onClick={() => setFiltro(op.valor)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                  seleccionado
                    ? 'bg-nogal text-lino'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{op.etiqueta}</span>
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    seleccionado ? 'text-lino/80' : 'text-muted-foreground'
                  )}
                >
                  {op.total}
                </span>
              </button>
            );
          })}
        </PistaSegmentada>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {visibles.length === totalTodos
            ? `${totalTodos} casos disponibles para asignar`
            : `Mostrando ${visibles.length} casos de tipo ${filtro.toLowerCase()}`}
        </p>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map(escenario => (
          <li key={escenario.codigo} className="flex">
            <TarjetaEscenarioPublico
              escenario={escenario}
              onAbrir={() => setAbiertoCodigo(escenario.codigo)}
            />
          </li>
        ))}
      </ul>

      <DialogPrimitive.Root
        open={actual !== null}
        onOpenChange={abre => !abre && setAbiertoCodigo(null)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          {actual && (
            <DialogPrimitive.Content
              onKeyDown={evento => {
                if (evento.key === 'ArrowLeft') mover(-1);
                if (evento.key === 'ArrowRight') mover(1);
              }}
              className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card shadow-2xl ring-1 ring-foreground/10 outline-hidden duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            >
              <DetalleEscenario
                escenario={actual}
                indice={indiceActual}
                total={visibles.length}
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

const CATEGORIA_PUBLICA: Record<EscenarioPublico['categoria'], CategoriaEscenario> = {
  Clínico: 'clinico',
  Cotidiano: 'cotidiano',
};

const DIFICULTAD_PUBLICA: Record<1 | 2 | 3, DificultadEscenario> = {
  1: 'basico',
  2: 'intermedio',
  3: 'avanzado',
};

function IconoCategoria({ categoria, className }: { categoria: string; className?: string }) {
  const Icono = categoria === 'Clínico' ? HeartPulse : Coffee;
  return <Icono className={className} aria-hidden />;
}

function NivelPuntos({ nivel }: { nivel: 1 | 2 | 3 }) {
  return (
    <IndicadorNivel dificultad={DIFICULTAD_PUBLICA[nivel]} etiqueta={NIVELES_PUBLICOS[nivel]} />
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
      className="group flex w-full flex-col overflow-hidden rounded-t-[999px] rounded-b-2xl border border-nogal/25 bg-card text-left transition-[border-color,box-shadow,transform] duration-300 ease-salida hover:-translate-y-0.5 hover:border-nogal/60 hover:shadow-[0_14px_32px_-16px_rgb(58_36_24/0.4)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:hover:translate-y-0"
    >
      {/* El arco forma el techo de la tarjeta misma: sin esquinas blancas detrás de la curva. */}
      <span className="relative block aspect-[4/3] w-full overflow-hidden border-b border-border/70 bg-muted">
        <Image
          src={escenario.imagen.src}
          alt=""
          fill
          unoptimized
          className="object-cover transition-transform duration-500 ease-salida group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent"
        />
        <span className="absolute inset-x-4 bottom-3 flex items-center gap-2 text-sm font-medium text-white">
          <AvatarPaciente
            src={escenario.paciente.foto}
            nombre={escenario.paciente.nombre}
            className="size-8 text-xs ring-2 ring-white/85"
          />
          <span className="truncate">
            {escenario.paciente.nombre}, {escenario.paciente.edad} años
          </span>
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-3 p-5">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{escenario.codigo}</span>
          <InsigniaCategoria categoria={CATEGORIA_PUBLICA[escenario.categoria]} />
          <span className="ml-auto inline-flex items-center gap-1.5">
            <IndicadorNivel dificultad={DIFICULTAD_PUBLICA[escenario.nivel]} soloBarras />
            <span className="text-xs text-muted-foreground">
              {NIVELES_PUBLICOS[escenario.nivel]}
            </span>
          </span>
        </span>
        <span className="-mt-0.5 text-xl font-bold tracking-[-0.01em] text-foreground">
          {escenario.titulo}
        </span>
        <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {escenario.resumen}
        </span>
        <span className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-dashed pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="size-4 shrink-0 text-salvia" aria-hidden />
            {escenario.competencia}
          </span>
          <span className="font-semibold text-nogal underline-offset-4 group-hover:underline">
            Explorar caso
          </span>
        </span>
      </span>
    </button>
  );
}

function DetalleEscenario({
  escenario,
  indice,
  total,
  onAnterior,
  onSiguiente,
}: {
  escenario: EscenarioPublico;
  indice: number;
  total: number;
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
          unoptimized
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
            className="absolute top-3 right-3 size-11 rounded-full bg-card/90 text-foreground hover:bg-card"
            aria-label="Cerrar el detalle"
          >
            <X aria-hidden />
          </Button>
        </DialogPrimitive.Close>
        <div className="absolute bottom-4 left-5 flex flex-wrap items-center gap-2 text-white">
          <span className="rounded-md bg-card/90 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
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
            <DialogPrimitive.Title className="text-3xl leading-tight font-bold tracking-[-0.02em]">
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
            aria-label="Paciente simulado"
            className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-5"
          >
            <div className="flex items-center gap-3">
              <AvatarPaciente
                src={escenario.paciente.foto}
                nombre={escenario.paciente.nombre}
                className="size-14 text-base ring-4 ring-card"
              />
              <div className="leading-tight">
                <p className="text-lg font-bold text-terracota">{escenario.paciente.nombre}</p>
                <p className="text-sm text-muted-foreground">{escenario.paciente.edad} años</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{escenario.paciente.perfil}</p>
          </section>

          <figure className="rounded-xl bg-terracota-suave/60 p-5">
            <figcaption className="mb-2 flex items-center gap-2 text-sm font-semibold text-terracota">
              <MessageSquareQuote className="size-4 text-terracota" aria-hidden />
              Primera frase del paciente
            </figcaption>
            <blockquote className="text-lg leading-snug font-medium">
              {escenario.paciente.apertura}
            </blockquote>
          </figure>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="lg" onClick={onAnterior}>
            <ArrowLeft aria-hidden />
            Anterior
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onSiguiente}>
            Siguiente
            <ArrowRight aria-hidden />
          </Button>
          <span className="ml-1 font-mono text-xs text-muted-foreground tabular-nums">
            {indice + 1} / {total}
          </span>
        </div>
        <Button asChild size="lg">
          <Link href="/login?docente=1">
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
      <dt className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground [&_svg]:size-3.5 [&_svg]:text-salvia">
        {icono}
        {etiqueta}
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
