'use client';

import { Check } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/lib/utils';

interface OpcionChip {
  id: string;
  texto: string;
}

interface GrupoChipsProps {
  etiqueta: string;
  opciones: readonly OpcionChip[];
  seleccionadas: readonly string[];
  onCambio: (seleccionadas: string[]) => void;
  deshabilitado?: boolean;
}

/** Chips de selección múltiple. Cada chip es un botón con `aria-pressed`. */
export function GrupoChips({
  etiqueta,
  opciones,
  seleccionadas,
  onCambio,
  deshabilitado,
}: GrupoChipsProps) {
  const alternar = (id: string) =>
    onCambio(
      seleccionadas.includes(id) ? seleccionadas.filter(s => s !== id) : [...seleccionadas, id]
    );

  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map(opcion => {
        const activa = seleccionadas.includes(opcion.id);
        return (
          <button
            key={opcion.id}
            type="button"
            aria-pressed={activa}
            disabled={deshabilitado}
            onClick={() => alternar(opcion.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50',
              activa
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-foreground hover:bg-muted'
            )}
          >
            {activa && <Check className="size-3.5" aria-hidden />}
            {opcion.texto}
          </button>
        );
      })}
    </div>
  );
}

interface SugerenciasProps {
  etiqueta: string;
  sugerencias: readonly string[];
  /** Texto actual del campo: las sugerencias ya incluidas se ocultan. */
  texto: string;
  onAgregar: (sugerencia: string) => void;
}

/** Atajos que añaden una frase a un campo de texto libre. */
export function Sugerencias({ etiqueta, sugerencias, texto, onAgregar }: SugerenciasProps) {
  const disponibles = sugerencias.filter(s => !texto.toLowerCase().includes(s.toLowerCase()));
  if (disponibles.length === 0) return null;
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-1.5">
      {disponibles.map(sugerencia => (
        <button
          key={sugerencia}
          type="button"
          onClick={() => onAgregar(sugerencia)}
          className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          + {sugerencia}
        </button>
      ))}
    </div>
  );
}

interface OpcionRadio<T extends string> {
  valor: T;
  etiqueta: string;
  detalle?: string;
}

interface SelectorOpcionesProps<T extends string> {
  etiqueta: string;
  valor: T | undefined;
  opciones: readonly OpcionRadio<T>[];
  onCambio: (valor: T) => void;
  /** Clases de la rejilla, p. ej. `sm:grid-cols-3`. */
  className?: string;
  deshabilitado?: boolean;
}

/** Grupo de radios presentados como tarjetas pequeñas (un `<input type="radio">` nativo cada una). */
export function SelectorOpciones<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
  className,
  deshabilitado,
}: SelectorOpcionesProps<T>) {
  const nombre = useId();
  return (
    <div role="radiogroup" aria-label={etiqueta} className={cn('grid gap-2', className)}>
      {opciones.map(opcion => {
        const activa = opcion.valor === valor;
        return (
          <label
            key={opcion.valor}
            className={cn(
              'flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-card px-3 py-2 text-sm transition-[border-color,background-color] hover:border-primary/40 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
              activa && 'border-primary bg-accent/50 ring-1 ring-primary',
              deshabilitado && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.valor}
              checked={activa}
              disabled={deshabilitado}
              onChange={() => onCambio(opcion.valor)}
              className="sr-only"
            />
            <span className="font-medium">{opcion.etiqueta}</span>
            {opcion.detalle && (
              <span className="text-xs text-muted-foreground">{opcion.detalle}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
