'use client';

import { Clock, Highlighter, MessageSquare, Quote } from 'lucide-react';
import { useState } from 'react';

import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { cn } from '@/lib/utils';

interface AnotacionEjemplo {
  id: 1 | 2;
  titulo: string;
  comentario: string;
  sugerencia?: string;
}

const ANOTACIONES: readonly AnotacionEjemplo[] = [
  {
    id: 1,
    titulo: 'Validar antes de preguntar',
    comentario: 'Buena pregunta abierta. Antes, valida lo que dijo para fortalecer el vínculo:',
    sugerencia: 'Lo que sientes sí es importante.',
  },
  {
    id: 2,
    titulo: 'Exploración del riesgo con tacto',
    comentario:
      'Pregunta directa, respetuosa y sin juicios: abre espacio para hablar con seguridad.',
  },
];

/**
 * Ejemplo ilustrativo e interactivo de la revisión docente: reproduce la estructura real de
 * `RevisionSesion` con cabecera de práctica, dos anotaciones clicables sobre frases concretas,
 * comentario general, nota formativa y reflexión del estudiante.
 */
export function RevisionIlustrativa() {
  const [activa, setActiva] = useState<1 | 2>(1);

  return (
    <figure className="overflow-hidden rounded-2xl border bg-card">
      {/* Cabecera de la práctica revisada, coherente con la vista real del docente. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/35 px-5 py-3.5 sm:px-7">
        <div className="flex items-center gap-3">
          <AvatarPaciente
            src="/pacientes/laura-sofia.webp"
            nombre="Laura Sofía"
            className="size-9 text-xs ring-2 ring-card"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">
              <span className="font-mono text-xs text-muted-foreground">E-03</span> · Episodio
              depresivo leve
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="font-medium text-terracota">Laura Sofía, 26 años</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                14 min
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3" aria-hidden />
                18 intervenciones
              </span>
            </p>
          </div>
        </div>
        <span className="rounded-full bg-salvia-oscuro px-3 py-1 text-xs font-medium text-lino">
          Publicada
        </span>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <ol
            aria-label="Fragmento de una conversación de práctica"
            className="flex flex-col gap-3"
          >
            <li className="flex max-w-[88%] flex-col gap-1 self-start">
              <span className="px-1 text-xs font-medium text-terracota">Laura Sofía</span>
              <p className="rounded-2xl rounded-bl-md border bg-background px-4 py-2.5 text-sm leading-relaxed">
                No sé si esto sea algo importante, la verdad. Solo me siento muy cansada.
              </p>
            </li>

            <li className="flex max-w-[90%] flex-col items-end gap-1 self-end">
              <span className="px-1 text-xs font-medium text-muted-foreground">Estudiante</span>
              <p className="rounded-2xl rounded-br-md bg-salvia-suave px-4 py-2.5 text-sm leading-relaxed">
                Entiendo.{' '}
                <button
                  type="button"
                  onClick={() => setActiva(1)}
                  aria-pressed={activa === 1}
                  className={cn(
                    'inline-block rounded-md px-1.5 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                    activa === 1
                      ? 'bg-ambar-suave font-medium text-foreground underline decoration-ambar decoration-2 underline-offset-4'
                      : 'bg-ambar-suave/55 text-foreground underline decoration-ambar/60 decoration-2 underline-offset-4 hover:bg-ambar-suave'
                  )}
                >
                  ¿Desde cuándo te sientes así?
                  <sup className="ml-0.5 text-xs font-semibold text-ambar">1</sup>
                </button>{' '}
                Cuéntame un poco más.
              </p>
            </li>

            <li className="flex max-w-[88%] flex-col gap-1 self-start">
              <span className="px-1 text-xs font-medium text-terracota">Laura Sofía</span>
              <p className="rounded-2xl rounded-bl-md border bg-background px-4 py-2.5 text-sm leading-relaxed">
                Desde hace unas tres semanas… ya ni ganas de dibujar me dan, y eso antes me
                encantaba.
              </p>
            </li>

            <li className="flex max-w-[90%] flex-col items-end gap-1 self-end">
              <span className="px-1 text-xs font-medium text-muted-foreground">Estudiante</span>
              <p className="rounded-2xl rounded-br-md bg-salvia-suave px-4 py-2.5 text-sm leading-relaxed">
                Gracias por contármelo.{' '}
                <button
                  type="button"
                  onClick={() => setActiva(2)}
                  aria-pressed={activa === 2}
                  className={cn(
                    'inline-block rounded-md px-1.5 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                    activa === 2
                      ? 'bg-ambar-suave font-medium text-foreground underline decoration-ambar decoration-2 underline-offset-4'
                      : 'bg-ambar-suave/55 text-foreground underline decoration-ambar/60 decoration-2 underline-offset-4 hover:bg-ambar-suave'
                  )}
                >
                  ¿En algún momento has sentido que no vale la pena seguir intentando?
                  <sup className="ml-0.5 text-xs font-semibold text-ambar">2</sup>
                </button>
              </p>
            </li>
          </ol>

          <div className="rounded-xl border border-dashed bg-muted/35 px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground">Reflexión del estudiante</p>
            <p className="mt-1 leading-relaxed text-foreground/90">
              «Al principio me apresuré a preguntar fechas antes de validar su cansancio; al final
              logré explorar el riesgo con más calma».
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:border-l lg:pl-6">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Highlighter className="size-4 text-ambar" aria-hidden />
              Comentarios en frases
            </p>
            <span className="text-xs text-muted-foreground">Pulsa una frase para verla</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {ANOTACIONES.map(nota => {
              const seleccionada = activa === nota.id;
              return (
                <button
                  key={nota.id}
                  type="button"
                  onClick={() => setActiva(nota.id)}
                  aria-pressed={seleccionada}
                  className={cn(
                    'flex w-full flex-col gap-2 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
                    seleccionada
                      ? 'border-ambar bg-ambar-suave/45 shadow-xs'
                      : 'border-border bg-background/60 hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ambar-suave text-xs font-semibold text-ambar">
                      {nota.id}
                    </span>
                    {nota.titulo}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{nota.comentario}</p>
                  {nota.sugerencia && (
                    <p className="flex items-start gap-2 rounded-lg bg-salvia-suave/70 px-3 py-2 text-sm text-salvia-oscuro">
                      <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>{nota.sugerencia}</span>
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-background p-4">
            <div className="flex items-baseline justify-between gap-3 border-b pb-2.5">
              <span className="text-sm font-bold text-foreground">Comentario general</span>
              <span className="font-mono text-base font-bold text-nogal tabular-nums">
                4,3 / 5,0
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Buen manejo del ritmo y cierre claro. Para tu siguiente entrevista, detente un turno
              más en validar cómo se siente antes de recoger la cronología.
            </p>
          </div>

          <figcaption className="text-xs text-muted-foreground">
            Ejemplo ilustrativo de una revisión publicada. Tu docente decide los comentarios y la
            nota de cada práctica.
          </figcaption>
        </div>
      </div>
    </figure>
  );
}
