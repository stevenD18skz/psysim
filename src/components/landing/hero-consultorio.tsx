'use client';

import { Quote } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { type EscenarioPublico } from '@/lib/landing/escenarios';
import { cn } from '@/lib/utils';

const INTERVALO_MS = 6500;
const TRANSICION_MS = 700;

function suscribirMovimientoReducido(alCambiar: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
  consulta.addEventListener('change', alCambiar);
  return () => consulta.removeEventListener('change', alCambiar);
}

function leerMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function elegirOtroIndice(actual: number, total: number): number {
  if (total <= 1) return actual;
  const desplazamiento = 1 + Math.floor(Math.random() * (total - 1));
  return (actual + desplazamiento) % total;
}

/**
 * Vano en arco de la portada: muestra los consultorios 3D reales y alterna automáticamente cada
 * pocos segundos entre los doce casos al azar (sin repetir el inmediatamente anterior). Respeta
 * «reducir movimiento» y pausa mientras la persona mantiene el cursor o el foco sobre la pieza.
 */
export function HeroConsultorio({ escenarios }: { escenarios: readonly EscenarioPublico[] }) {
  const total = escenarios.length;
  const [vista, setVista] = useState<{ indice: number; saliente: number | null }>({
    indice: 0,
    saliente: null,
  });
  const [enPausaPorInteraccion, setEnPausaPorInteraccion] = useState(false);
  const reducirMovimiento = useSyncExternalStore(
    suscribirMovimientoReducido,
    leerMovimientoReducido,
    () => true
  );

  useEffect(() => {
    if (vista.saliente === null) return;
    const temporizador = setTimeout(
      () => setVista(actual => ({ ...actual, saliente: null })),
      TRANSICION_MS
    );
    return () => clearTimeout(temporizador);
  }, [vista.saliente]);

  const rotacionActiva = !reducirMovimiento && !enPausaPorInteraccion && total > 1;

  useEffect(() => {
    if (!rotacionActiva) return;
    const temporizador = setInterval(() => {
      setVista(actual => ({
        indice: elegirOtroIndice(actual.indice, total),
        saliente: actual.indice,
      }));
    }, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [rotacionActiva, total]);

  const actual = escenarios[vista.indice];
  const anteriorEscenario = vista.saliente !== null ? escenarios[vista.saliente] : null;
  if (!actual) return null;

  return (
    <figure
      className="mx-auto flex w-full max-w-[460px] flex-col gap-4 lg:mr-0 lg:ml-auto"
      onMouseEnter={() => setEnPausaPorInteraccion(true)}
      onMouseLeave={() => setEnPausaPorInteraccion(false)}
      onFocusCapture={() => setEnPausaPorInteraccion(true)}
      onBlurCapture={evento => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) {
          setEnPausaPorInteraccion(false);
        }
      }}
    >
      {/* Jamba oscura con el filo de latón: se lee como la puerta del consultorio. */}
      <div className="rounded-t-[999px] bg-[#2a190f] p-3 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] sm:p-3.5">
        <div className="relative aspect-[5/6] w-full overflow-hidden rounded-t-[999px] border-2 border-laton bg-[#2a190f]">
          {anteriorEscenario && (
            <Image
              key={`saliente-${anteriorEscenario.codigo}`}
              src={anteriorEscenario.imagen.src}
              alt=""
              aria-hidden
              fill
              unoptimized
              className="origin-[50%_52%] scale-[1.14] object-cover object-[50%_52%]"
            />
          )}
          <Image
            key={`actual-${actual.codigo}`}
            src={actual.imagen.src}
            alt={actual.imagen.alt}
            fill
            priority={vista.indice === 0}
            loading="eager"
            unoptimized
            className={cn(
              'origin-[50%_52%] scale-[1.14] object-cover object-[50%_52%]',
              vista.saliente !== null &&
                'motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in-0'
            )}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/45 to-transparent"
          />
        </div>
      </div>

      <figcaption className="flex flex-col gap-2">
        <div className="flex min-h-[4.25rem] items-start gap-3">
          <Quote className="mt-1 size-5 shrink-0 text-laton-texto" aria-hidden />
          <blockquote className="text-lg leading-snug font-medium text-balance sm:text-xl">
            {actual.paciente.apertura}
          </blockquote>
        </div>
        <span className="pl-8 text-sm text-sidebar-muted">
          {actual.paciente.nombre}, {actual.paciente.edad} años ·{' '}
          <span className="font-mono text-xs">{actual.codigo}</span> {actual.titulo}
        </span>
      </figcaption>
    </figure>
  );
}
