import { Coffee, HeartPulse } from 'lucide-react';

import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_DIFICULTAD,
  NIVEL_DIFICULTAD,
} from '@/lib/escenarios/etiquetas';
import { cn } from '@/lib/utils';
import { type CategoriaEscenario, type DificultadEscenario } from '@/types';

const ESTILO_CATEGORIA: Record<CategoriaEscenario, { clase: string; icono: typeof HeartPulse }> = {
  clinico: {
    clase: 'bg-[#e2ecf2] text-[#285673]',
    icono: HeartPulse,
  },
  cotidiano: {
    clase: 'bg-salvia-suave text-salvia-oscuro',
    icono: Coffee,
  },
};

const ESTILO_NIVEL: Record<
  DificultadEscenario,
  { barra: string; barraMadera: string; pildora: string }
> = {
  basico: {
    barra: 'bg-[#2b6787]',
    barraMadera: 'bg-[#7eb8da]',
    pildora: 'bg-[#e2ecf2] text-[#285673]',
  },
  intermedio: {
    barra: 'bg-[#b8710a]',
    barraMadera: 'bg-[#ebb55c]',
    pildora: 'bg-ambar-suave text-ambar',
  },
  avanzado: {
    barra: 'bg-[#6d3f75]',
    barraMadera: 'bg-[#d2b1df]',
    pildora: 'bg-[#efe6f2] text-[#5c3363]',
  },
};

/** Píldora distintiva de la categoría del caso («Clínico» o «Cotidiano») con su ícono. */
export function InsigniaCategoria({
  categoria,
  className,
}: {
  categoria: CategoriaEscenario;
  className?: string;
}) {
  const { clase, icono: Icono } = ESTILO_CATEGORIA[categoria];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        clase,
        className
      )}
    >
      <Icono className="size-3 shrink-0" aria-hidden />
      {ETIQUETA_CATEGORIA[categoria]}
    </span>
  );
}

/**
 * Indicador visual de tres barras para el nivel del caso (básico en azul, intermedio en ámbar y
 * avanzado en ciruela, sin rojo de error ni terracota del paciente).
 */
export function IndicadorNivel({
  dificultad,
  etiqueta,
  soloBarras = false,
  conFondo = false,
  sobreMadera = false,
  className,
}: {
  dificultad: DificultadEscenario;
  etiqueta?: string;
  soloBarras?: boolean;
  conFondo?: boolean;
  sobreMadera?: boolean;
  className?: string;
}) {
  const nivel = NIVEL_DIFICULTAD[dificultad];
  const estilo = ESTILO_NIVEL[dificultad];
  const texto = etiqueta ?? `Nivel ${ETIQUETA_DIFICULTAD[dificultad].toLowerCase()}`;

  const barras = (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3].map(paso => (
        <span
          key={paso}
          className={cn(
            'h-2.5 w-1.5 rounded-full',
            paso <= nivel
              ? sobreMadera
                ? estilo.barraMadera
                : estilo.barra
              : sobreMadera
                ? 'bg-sidebar-foreground/25'
                : 'bg-border'
          )}
        />
      ))}
    </span>
  );

  if (soloBarras) {
    return <span className={cn('inline-flex items-center', className)}>{barras}</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2',
        conFondo && cn('rounded-full px-2.5 py-0.5 text-xs font-medium', estilo.pildora),
        className
      )}
    >
      {barras}
      <span>{texto}</span>
    </span>
  );
}
