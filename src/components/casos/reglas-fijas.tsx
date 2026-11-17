'use client';

import { BookOpenCheck, CheckCircle2, ShieldCheck } from 'lucide-react';

import { Desplegable } from '@/components/comun/desplegable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { REGLAS_FIJAS } from '@/lib/ia/reglas';
import { cn } from '@/lib/utils';

interface GrupoReglas {
  titulo: string;
  garantia: string;
  etiquetas: readonly string[];
  indices: readonly number[];
}

/** Lo que garantizan las reglas en lenguaje llano y qué bloque exacto de `REGLAS_FIJAS` respalda cada una. */
const GRUPOS_REGLAS: readonly GrupoReglas[] = [
  {
    titulo: 'Personaje y naturalidad',
    garantia: 'Siempre actúa como paciente: no rompe el personaje ni dice que es una IA.',
    etiquetas: [
      'No dice que es IA',
      'Español colombiano',
      'Largo según confianza',
      'Historia y gesto coherentes',
    ],
    indices: [0, 1, 2, 7, 14],
  },
  {
    titulo: 'Ritmo y vínculo clínico',
    garantia:
      'Habla como una persona en consulta y cuenta las cosas poco a poco, según cómo lo traten.',
    etiquetas: [
      'No cuenta todo de entrada',
      'Respeta datos guardados',
      'Confianza progresiva',
      'El estudiante cierra',
    ],
    indices: [3, 4, 5, 6, 9],
  },
  {
    titulo: 'Límites clínicos y reserva',
    garantia: 'Nunca da diagnósticos ni medicamentos, ni describe formas de hacerse daño.',
    etiquetas: [
      'Sin diagnósticos ni fármacos',
      'Crisis sin métodos',
      'Instrucciones confidenciales',
    ],
    indices: [8, 10, 11, 12, 13],
  },
];

/**
 * Lo que el servidor añade siempre al comportamiento del paciente. Cuando se expande el editor de
 * ajustes en la columna contigua (`expandido`), muestra etiquetas concretas por categoría sin
 * alargar la columna por encima del panel de ajustes.
 */
export function ReglasFijas({
  className,
  expandido = false,
}: {
  className?: string;
  expandido?: boolean;
}) {
  return (
    <section
      aria-labelledby="reglas-fijas-titulo"
      className={cn('flex flex-col gap-4 rounded-2xl border bg-muted/40 p-5', className)}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-salvia-suave text-salvia-oscuro">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <h3 id="reglas-fijas-titulo" className="text-sm font-semibold">
            PsySim ya se encarga de esto
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Se aplica a todos los pacientes y no se puede quitar. No necesitas escribirlo.
          </p>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2.5 text-sm leading-snug">
        {GRUPOS_REGLAS.map(grupo => (
          <li
            key={grupo.titulo}
            className="flex flex-col gap-1 rounded-xl border bg-card/80 px-3.5 py-2.5"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-salvia-oscuro">
                <CheckCircle2 className="size-3.5 text-salvia" aria-hidden />
                {grupo.titulo}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {grupo.indices.length} reglas
              </span>
            </div>
            <p className="text-sm leading-snug text-foreground/90">{grupo.garantia}</p>

            <Desplegable abierto={expandido}>
              <ul className="mt-1 flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                {grupo.etiquetas.map(etiqueta => (
                  <li
                    key={etiqueta}
                    className="rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 text-xs text-foreground/85"
                  >
                    {etiqueta}
                  </li>
                ))}
              </ul>
            </Desplegable>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {REGLAS_FIJAS.length} reglas activas en el servidor
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Ver las ${REGLAS_FIJAS.length} reglas exactas que recibe la IA`}
            >
              <BookOpenCheck className="text-salvia" aria-hidden />
              Ver las {REGLAS_FIJAS.length} reglas exactas
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="gap-1 border-b bg-muted/35 px-6 py-5 pr-12 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-[-0.015em]">
                <ShieldCheck className="size-5 text-salvia-oscuro" aria-hidden />
                Las {REGLAS_FIJAS.length} reglas exactas que recibe la IA
              </DialogTitle>
              <DialogDescription>
                El servidor las añade al final de cada caso antes de hablar con el paciente.
                Garantizan realismo clínico, confidencialidad y seguridad.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              {GRUPOS_REGLAS.map(grupo => (
                <section key={grupo.titulo} className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold tracking-[-0.01em] text-foreground">
                      {grupo.titulo}
                    </h4>
                    <span className="rounded-full bg-salvia-suave px-2.5 py-0.5 text-xs font-semibold text-salvia-oscuro tabular-nums">
                      {grupo.indices.length} reglas
                    </span>
                  </div>
                  <ol className="divide-y overflow-hidden rounded-xl border bg-card text-sm">
                    {grupo.indices.map(indice => (
                      <li key={indice} className="flex items-start gap-3 px-4 py-3 leading-relaxed">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                          {indice + 1}
                        </span>
                        <span className="text-foreground/90">{REGLAS_FIJAS[indice]}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-6 py-3.5">
              <p className="text-xs text-muted-foreground">
                Se aplican siempre en el servidor; no necesitas repetirlas al editar un caso.
              </p>
              <DialogClose asChild>
                <Button type="button" size="sm">
                  Entendido
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
