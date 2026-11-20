'use client';

import { Check } from 'lucide-react';
import { useId, useState } from 'react';

import { Desplegable } from '@/components/comun/desplegable';
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
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50 sm:min-h-8',
              activa ? 'border-nogal bg-nogal text-lino' : 'bg-card text-foreground hover:bg-muted'
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

/** Atajos que añaden una frase a un campo de texto libre sin reaparecer si se edita tras añadirla. */
export function Sugerencias({ etiqueta, sugerencias, texto, onAgregar }: SugerenciasProps) {
  const vacio = texto.trim() === '';
  const [estabaVacio, setEstabaVacio] = useState(vacio);
  const [usadas, setUsadas] = useState<string[]>([]);

  if (vacio !== estabaVacio) {
    setEstabaVacio(vacio);
    if (vacio) setUsadas([]);
  }

  const textoNormalizado = texto.toLowerCase();
  const disponibles = sugerencias.filter(
    s => usadas.includes(s) === false && textoNormalizado.includes(s.toLowerCase()) === false
  );

  return (
    <Desplegable abierto={disponibles.length > 0}>
      <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-1.5 pt-0.5">
        {disponibles.map(sugerencia => (
          <button
            key={sugerencia}
            type="button"
            onClick={() => {
              setUsadas(prev => (prev.includes(sugerencia) ? prev : [...prev, sugerencia]));
              onAgregar(sugerencia);
            }}
            className="min-h-9 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-nogal/50 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid sm:min-h-8"
          >
            + {sugerencia}
          </button>
        ))}
      </div>
    </Desplegable>
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
              'flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-xl border bg-card px-3 py-2 text-sm transition-[border-color,background-color] hover:border-nogal/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-solid',
              activa && 'border-nogal bg-salvia-suave/45 ring-1 ring-nogal',
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
