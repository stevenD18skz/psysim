import { Check, Coffee, HeartPulse, Target } from 'lucide-react';

import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_DIFICULTAD,
  NIVEL_DIFICULTAD,
} from '@/lib/escenarios/etiquetas';
import { cn } from '@/lib/utils';
import { type EscenarioCatalogo } from '@/types';

interface TarjetaEscenarioProps {
  escenario: EscenarioCatalogo;
  seleccionado: boolean;
  onSeleccionar: (escenario: EscenarioCatalogo) => void;
  /** `name` del grupo de radios: un único escenario seleccionado a la vez. */
  nombreGrupo: string;
  describedBy?: string;
}

/**
 * HU-06 · T02 — Tarjeta de un escenario del catálogo.
 *
 * Es un `<input type="radio">` nativo envuelto en un `<label>`: el grupo se recorre con
 * las flechas del teclado y los lectores de pantalla lo anuncian como opción única.
 */
export function TarjetaEscenario({
  escenario,
  seleccionado,
  onSeleccionar,
  nombreGrupo,
  describedBy,
}: TarjetaEscenarioProps) {
  const nivel = NIVEL_DIFICULTAD[escenario.dificultad];
  const IconoCategoria = escenario.categoria === 'clinico' ? HeartPulse : Coffee;
  const idBase = `escenario-${escenario.codigo.toLowerCase()}`;

  return (
    <label
      data-testid={`escenario-${escenario.codigo}`}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs transition-all',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        'has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
        seleccionado && 'border-primary bg-accent/50 shadow-md ring-1 ring-primary'
      )}
    >
      <input
        type="radio"
        name={nombreGrupo}
        value={escenario.id}
        checked={seleccionado}
        onChange={() => onSeleccionar(escenario)}
        aria-labelledby={`${idBase}-titulo`}
        aria-describedby={[`${idBase}-detalle`, describedBy].filter(Boolean).join(' ')}
        className="sr-only"
      />

      <div className="flex items-center gap-2">
        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
          {escenario.codigo}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            escenario.categoria === 'clinico'
              ? 'bg-accent text-accent-foreground'
              : 'bg-sage text-sage-foreground'
          )}
        >
          <IconoCategoria className="size-3" aria-hidden />
          {ETIQUETA_CATEGORIA[escenario.categoria]}
        </span>
        <span
          aria-hidden
          className={cn(
            'ml-auto flex size-6 items-center justify-center rounded-full border transition-colors',
            seleccionado
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-transparent'
          )}
        >
          <Check className="size-3.5" />
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h3 id={`${idBase}-titulo`} className="text-lg leading-snug font-semibold">
          <span className="sr-only">{escenario.codigo}: </span>
          {escenario.titulo}
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{escenario.descripcion}</p>
      </div>

      <dl
        id={`${idBase}-detalle`}
        className="mt-auto flex flex-col gap-2 border-t border-dashed pt-3 text-sm"
      >
        <div className="flex items-center gap-2">
          <dt className="sr-only">Competencia central</dt>
          <Target className="size-4 shrink-0 text-primary" aria-hidden />
          <dd className="font-medium">{escenario.competenciaCentral}</dd>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <dt className="sr-only">Nivel de complejidad</dt>
          <span className="flex gap-0.5" aria-hidden>
            {[1, 2, 3].map(paso => (
              <span
                key={paso}
                className={cn(
                  'h-2.5 w-1.5 rounded-full',
                  paso <= nivel ? 'bg-primary' : 'bg-border'
                )}
              />
            ))}
          </span>
          <dd>Nivel {ETIQUETA_DIFICULTAD[escenario.dificultad].toLowerCase()}</dd>
        </div>
      </dl>
    </label>
  );
}
